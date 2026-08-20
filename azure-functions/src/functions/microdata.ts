/**
 * Azure Function — /microdata (portage de netlify/functions/microdata.ts, f3i.1)
 *
 * Adaptateur : parse la requête, injecte la config, appelle le CŒUR PORTABLE
 * `../microdata-core/core` (copié tel quel depuis netlify/functions/microdata-core/,
 * zéro dépendance au runtime — cf. l'en-tête de ce module). Cf.
 * `azure-functions/src/functions/search.ts` pour le pattern de portage HTTP.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { isMicrodataSurveyAccessible } from "../../../src/logic/tenancy";
import { handleMicrodataQuery, MicrodataError, type Agg, type MicrodataParams } from "../microdata-core/core";
import { checkAuth } from "../middleware/auth";

const AGGS = ["count", "mean", "corr", "ols", "ttest", "anova"] as const;
function parseAgg(v: unknown): Agg {
  return (AGGS as readonly string[]).includes(String(v)) ? (v as Agg) : "count";
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function parseParams(request: HttpRequest): Promise<MicrodataParams> {
  if (request.method === "POST") {
    const b = (await request.json()) as Partial<MicrodataParams>;
    return {
      survey_id: String(b.survey_id ?? ""),
      target: String(b.target ?? ""),
      dim: b.dim ? String(b.dim) : undefined,
      filters: Array.isArray(b.filters) ? b.filters : [],
      agg: parseAgg(b.agg),
      exclude: Array.isArray(b.exclude) ? b.exclude : [],
      target2: b.target2 ? String(b.target2) : undefined,
      exclude2: Array.isArray(b.exclude2) ? b.exclude2 : undefined,
      groups: Array.isArray(b.groups) ? b.groups : undefined,
      success: Array.isArray(b.success) ? b.success : undefined,
      annotation: Array.isArray(b.annotation) ? b.annotation : undefined,
    };
  }
  const q = request.query;
  return {
    survey_id: q.get("survey_id") ?? "",
    target: q.get("target") ?? "",
    dim: q.get("dim") || undefined,
    filters: q.get("filters") ? JSON.parse(q.get("filters")!) : [],
    agg: parseAgg(q.get("agg")),
    exclude: q.get("exclude") ? JSON.parse(q.get("exclude")!) : [],
    target2: q.get("target2") || undefined,
    exclude2: q.get("exclude2") ? JSON.parse(q.get("exclude2")!) : undefined,
    groups: q.get("groups") ? JSON.parse(q.get("groups")!) : undefined,
    success: q.get("success") ? JSON.parse(q.get("success")!) : undefined,
  };
}

export async function microdata(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of ["AZURE_STORAGE_ACCOUNT", "AZURE_STORAGE_KEY", "AZURE_STORAGE_CONTAINER"] as const) {
    if (!process.env[key]) {
      context.error(`[microdata] Missing env var: ${key}`);
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  let params: MicrodataParams;
  try {
    params = await parseParams(request);
  } catch {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "Invalid request body" } };
  }

  if (!isMicrodataSurveyAccessible(auth.tenant, params.survey_id)) {
    return { status: 404, headers: CORS_HEADERS, jsonBody: { error: "Survey not found" } };
  }

  const config = {
    storage: {
      account: process.env.AZURE_STORAGE_ACCOUNT!,
      key: process.env.AZURE_STORAGE_KEY!,
      container: process.env.AZURE_STORAGE_CONTAINER!,
    },
  };

  try {
    const t0 = Date.now();
    const result = await handleMicrodataQuery(params, config);
    context.log(`[microdata] ${params.survey_id} ${result.mode} rows=${result.row_count} ${Date.now() - t0}ms`);
    return { status: 200, headers: CORS_HEADERS, jsonBody: result };
  } catch (err) {
    if (err instanceof MicrodataError) {
      return { status: err.status, headers: CORS_HEADERS, jsonBody: { error: err.message } };
    }
    context.error("[microdata] query failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Microdata query failed" } };
  }
}

app.http("microdata", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "microdata",
  handler: microdata,
});
