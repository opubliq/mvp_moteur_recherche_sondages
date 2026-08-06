/**
 * Azure Function — /verbatims (portage de netlify/functions/verbatims.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { cohereRerankDocuments, RerankError } from "../../../src/logic/rerank";
import type { RerankEnv } from "../../../src/logic/rerank";
import { newRequestId, resolveClientId } from "../../../src/logic/costlog";
import { resolveAccessibleVerbatimIndexes } from "../../../src/logic/tenancy";
import { checkAuth } from "../middleware/auth-transitional";

const SEARCH_API_VERSION = "2024-07-01";

const RERANK_POOL = 150;
const DEFAULT_TOP_SEARCH = 15;
const DEFAULT_TOP_BROWSE = 50;
const MAX_TOP = 200;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const SOCIODEMO_FIELDS = ["gender", "age", "education", "income", "region", "language", "occupation"] as const;

const SELECT_FIELDS = ["id", "respondent_id", "text", ...SOCIODEMO_FIELDS].join(",");

interface VerbatimsBody {
  survey_id?: string;
  variable?: string;
  query?: string;
  top?: number;
  skip?: number;
}

interface VerbatimDoc {
  id: string;
  respondent_id: number;
  text: string;
  "@search.score"?: number;
  [field: string]: unknown;
}

function toVerbatim(d: VerbatimDoc) {
  const sociodemo: Record<string, string> = {};
  for (const f of SOCIODEMO_FIELDS) {
    const v = d[f];
    if (typeof v === "string" && v.trim()) sociodemo[f] = v;
  }
  return {
    id: d.id,
    respondent_id: d.respondent_id,
    text: d.text,
    ...(Object.keys(sociodemo).length > 0 ? { sociodemo } : {}),
  };
}

function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

export async function verbatims(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  let body: VerbatimsBody;
  try {
    body = (await request.json()) as VerbatimsBody;
  } catch {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "Invalid JSON body" } };
  }

  const surveyId = body.survey_id?.trim();
  const variable = body.variable?.trim();
  if (!surveyId || !variable) {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "survey_id et variable sont requis" } };
  }

  const query = body.query?.trim() ?? "";
  const isSearch = query.length > 0;
  const skip = Math.max(0, Math.trunc(body.skip ?? 0));
  const top = Math.min(
    MAX_TOP,
    Math.max(1, Math.trunc(body.top ?? (isSearch ? DEFAULT_TOP_SEARCH : DEFAULT_TOP_BROWSE))),
  );

  for (const key of ["SEARCH_ENDPOINT", "SEARCH_QUERY_KEY"] as const) {
    if (!process.env[key]) {
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  const searchEndpoint = (process.env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", "api-key": process.env.SEARCH_QUERY_KEY ?? "" };
  const filter = `survey_id eq '${odataEscape(surveyId)}' and variable eq '${odataEscape(variable)}'`;

  const indexes = resolveAccessibleVerbatimIndexes(auth.tenant);
  const urlFor = (indexName: string) =>
    `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;

  try {
    if (!isSearch) {
      const perIndex = await Promise.all(
        indexes.map(async (indexName) => {
          const res = await fetch(urlFor(indexName), {
            method: "POST",
            headers,
            body: JSON.stringify({ search: "*", filter, select: SELECT_FIELDS, top, skip, count: true }),
          });
          if (!res.ok) throw new Error(`AI Search error ${res.status} (index ${indexName}): ${await res.text()}`);
          const data = await res.json();
          return { docs: (data.value ?? []) as VerbatimDoc[], count: data["@odata.count"] as number | undefined };
        }),
      );
      const docs = perIndex.flatMap((r) => r.docs);
      const total = perIndex.reduce((sum, r) => sum + (r.count ?? r.docs.length), 0);
      return {
        status: 200,
        headers: CORS_HEADERS,
        jsonBody: { survey_id: surveyId, variable, query: "", total, results: docs.map(toVerbatim) },
      };
    }

    for (const key of ["COHERE_RERANK_ENDPOINT", "COHERE_RERANK_DEPLOYMENT", "COHERE_RERANK_KEY"] as const) {
      if (!process.env[key]) {
        return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
      }
    }

    const perIndex = await Promise.all(
      indexes.map(async (indexName) => {
        const res = await fetch(urlFor(indexName), {
          method: "POST",
          headers,
          body: JSON.stringify({
            search: query,
            searchMode: "any",
            searchFields: "text",
            queryType: "simple",
            filter,
            select: SELECT_FIELDS,
            top: RERANK_POOL,
            count: true,
          }),
        });
        if (!res.ok) throw new Error(`AI Search error ${res.status} (index ${indexName}): ${await res.text()}`);
        const data = await res.json();
        return { docs: (data.value ?? []) as VerbatimDoc[], count: data["@odata.count"] as number | undefined };
      }),
    );
    const pool: VerbatimDoc[] = perIndex.flatMap((r) => r.docs);
    const total = perIndex.reduce((sum, r) => sum + (r.count ?? r.docs.length), 0);

    if (pool.length === 0) {
      return { status: 200, headers: CORS_HEADERS, jsonBody: { survey_id: surveyId, variable, query, total: 0, results: [] } };
    }

    const rerankEnv: RerankEnv = {
      COHERE_RERANK_ENDPOINT: process.env.COHERE_RERANK_ENDPOINT ?? "",
      COHERE_RERANK_DEPLOYMENT: process.env.COHERE_RERANK_DEPLOYMENT ?? "",
      COHERE_RERANK_KEY: process.env.COHERE_RERANK_KEY ?? "",
    };
    const usage = { clientId: resolveClientId(request.headers), requestId: newRequestId() };
    const scores = await cohereRerankDocuments(query, pool.map((d) => d.text ?? ""), rerankEnv, usage);

    const ranked = pool
      .map((d, i) => ({
        ...toVerbatim(d),
        relevance_score: scores[i] ?? 0,
        score_pertinence: Math.round((scores[i] ?? 0) * 100),
      }))
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, top);

    return {
      status: 200,
      headers: CORS_HEADERS,
      jsonBody: { survey_id: surveyId, variable, query, total, pool_size: pool.length, results: ranked },
    };
  } catch (err) {
    if (err instanceof RerankError) {
      context.error("[verbatims] Cohere rerank failed:", err);
      return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Rerank failed" } };
    }
    context.error("[verbatims] request failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Verbatims request failed" } };
  }
}

app.http("verbatims", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "verbatims",
  handler: verbatims,
});
