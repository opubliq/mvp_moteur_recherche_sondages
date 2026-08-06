/**
 * Azure Function — /search (portage de netlify/functions/search.ts, f3i.1)
 *
 * Même contrat, même logique métier (réutilisée telle quelle depuis
 * `src/logic/*`, déjà agnostique du framework — `HeaderSource` accepte un
 * `Headers` Fetch, exactement ce que fournit `request.headers` ici). Seule la
 * coquille handler change : forme de la requête/réponse Azure Functions v4 au
 * lieu du type `Handler` Netlify, et vérification Basic Auth explicite en
 * tête (pas d'edge function équivalente côté Azure, cf. `../middleware/auth`).
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import type { Concept, SearchResult, SearchFilters } from "../../../src/types";
import { retrieve, RetrieveError } from "../../../src/logic/retrieve";
import type { RetrieveEnv, RawCandidate } from "../../../src/logic/retrieve";
import { rerankCandidates, RerankError } from "../../../src/logic/rerank";
import type { RerankEnv } from "../../../src/logic/rerank";
import { newRequestId, resolveClientId, type UsageContext } from "../../../src/logic/costlog";
import { resolveAccessibleQuestionIndexes } from "../../../src/logic/tenancy";
import { checkAuth } from "../middleware/auth-transitional";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

interface SearchBody {
  query: string;
  concepts?: Concept[];
  filters?: SearchFilters;
  top?: number;
  rerank_query?: string;
}

export async function search(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  const requiredEnv = [
    "SEARCH_ENDPOINT",
    "SEARCH_QUERY_KEY",
    "AOAI_ENDPOINT",
    "AOAI_KEY",
    "AOAI_EMBED_DEPLOYMENT",
    "COHERE_RERANK_ENDPOINT",
    "COHERE_RERANK_DEPLOYMENT",
    "COHERE_RERANK_KEY",
  ] as const;

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      context.error(`[search] Missing env var: ${key}`);
      return {
        status: 500,
        headers: CORS_HEADERS,
        jsonBody: { error: `Server configuration error: missing ${key}` },
      };
    }
  }

  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "Invalid JSON body" } };
  }

  const { query, concepts, filters, top = 10, rerank_query } = body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return {
      status: 400,
      headers: CORS_HEADERS,
      jsonBody: { error: "query is required (non-empty string)" },
    };
  }

  const trimmedQuery = query.trim();

  const usage: UsageContext = {
    clientId: resolveClientId(request.headers),
    requestId: newRequestId(),
  };

  const rerankQuery = (rerank_query ?? "").trim() || trimmedQuery;

  const env: RetrieveEnv = {
    SEARCH_ENDPOINT: process.env.SEARCH_ENDPOINT!,
    SEARCH_QUERY_KEY: process.env.SEARCH_QUERY_KEY!,
    AOAI_ENDPOINT: process.env.AOAI_ENDPOINT!,
    AOAI_KEY: process.env.AOAI_KEY!,
    AOAI_EMBED_DEPLOYMENT: process.env.AOAI_EMBED_DEPLOYMENT!,
  };

  const rerankEnv: RerankEnv = {
    COHERE_RERANK_ENDPOINT: process.env.COHERE_RERANK_ENDPOINT!,
    COHERE_RERANK_DEPLOYMENT: process.env.COHERE_RERANK_DEPLOYMENT!,
    COHERE_RERANK_KEY: process.env.COHERE_RERANK_KEY!,
  };

  let results: RawCandidate[];
  let luceneQuery: string;
  let rawFacets: Record<string, Array<{ value: any; count: number }>> | undefined;

  const indexes = resolveAccessibleQuestionIndexes(auth.tenant);

  try {
    const result = await retrieve(trimmedQuery, concepts, env, { filters, top, usage, indexes });
    results = result.candidates;
    luceneQuery = result.luceneQuery;
    rawFacets = result.facets;
  } catch (err) {
    if (err instanceof RetrieveError) {
      context.error(`[search] Retrieval failed at stage ${err.stage}:`, err.message);
      return { status: 502, headers: CORS_HEADERS, jsonBody: { error: err.message } };
    }
    context.error("[search] Unexpected error during retrieval:", err);
    return { status: 500, headers: CORS_HEADERS, jsonBody: { error: "Internal server error during retrieval" } };
  }

  try {
    results = await rerankCandidates(rerankQuery, results, rerankEnv, usage);
  } catch (err) {
    if (err instanceof RerankError) {
      context.error("[search] Cohere rerank failed:", err.message);
      return { status: 502, headers: CORS_HEADERS, jsonBody: { error: err.message } };
    }
    context.error("[search] Unexpected error during rerank:", err);
    return { status: 500, headers: CORS_HEADERS, jsonBody: { error: "Internal server error during rerank" } };
  }

  results = results.map((r) => ({
    ...r,
    score_pertinence: Math.round((r.relevance_score ?? 0) * 100),
  }));

  return {
    status: 200,
    headers: CORS_HEADERS,
    jsonBody: {
      results,
      count: results.length,
      facets: rawFacets
        ? {
            years: (rawFacets.survey_year || []).map((f) => ({ value: String(f.value), count: f.count })),
            pollsters: (rawFacets.pollster || []).map((f) => ({ value: String(f.value), count: f.count })),
            languages: (rawFacets.language || []).map((f) => ({ value: String(f.value), count: f.count })),
          }
        : undefined,
      luceneQuery,
    },
  };
}

app.http("search", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "search",
  handler: search,
});
