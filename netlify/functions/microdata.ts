/**
 * ADAPTATEUR NETLIFY — /microdata (distributions & crosstabs).  **JETABLE.**
 *
 * Seule couche liée au runtime Netlify : parse la requête HTTP, injecte la config
 * (secrets `AZURE_STORAGE_*`), appelle le CŒUR PORTABLE, sérialise la réponse.
 * Migration Azure Functions/Container Apps = réécrire CE fichier uniquement ;
 * `microdata-core/` reste identique. Voir microdata-core/README.md.
 *
 * GET  /microdata?survey_id=eeq_2014&target=QSEXE[&dim=CLAGE][&filters=<json>]
 * POST { survey_id, target, dim?, filters?: [{var, codes:[]}] }
 *
 * Env (serveur only) : AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY, AZURE_STORAGE_CONTAINER
 */

import type { Handler } from "@netlify/functions";
import {
  handleMicrodataQuery,
  MicrodataError,
  type MicrodataParams,
} from "./microdata-core/core.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function parseParams(event: Parameters<Handler>[0]): MicrodataParams {
  if (event.httpMethod === "POST") {
    const b = JSON.parse(event.body ?? "{}") as Partial<MicrodataParams>;
    return {
      survey_id: String(b.survey_id ?? ""),
      target: String(b.target ?? ""),
      dim: b.dim ? String(b.dim) : undefined,
      filters: Array.isArray(b.filters) ? b.filters : [],
      agg: b.agg === "mean" ? "mean" : "count",
      exclude: Array.isArray(b.exclude) ? b.exclude : [],
    };
  }
  const q = event.queryStringParameters ?? {};
  return {
    survey_id: q.survey_id ?? "",
    target: q.target ?? "",
    dim: q.dim || undefined,
    filters: q.filters ? JSON.parse(q.filters) : [],
    agg: q.agg === "mean" ? "mean" : "count",
    exclude: q.exclude ? JSON.parse(q.exclude) : [],
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  for (const key of ["AZURE_STORAGE_ACCOUNT", "AZURE_STORAGE_KEY", "AZURE_STORAGE_CONTAINER"] as const) {
    if (!process.env[key]) {
      console.error(`[microdata] Missing env var: ${key}`);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: `Server configuration error: missing ${key}` }) };
    }
  }

  let params: MicrodataParams;
  try {
    params = parseParams(event);
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid request body" }) };
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
    console.log(`[microdata] ${params.survey_id} ${result.mode} rows=${result.row_count} ${Date.now() - t0}ms`);
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof MicrodataError) {
      return { statusCode: err.status, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
    }
    console.error("[microdata] query failed:", err);
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: "Microdata query failed" }) };
  }
};
