/**
 * ADAPTATEUR NETLIFY — /microdata-raw (export ligne-par-répondant).  **JETABLE.**
 *
 * POST { survey_id, columns: string[] } → { survey_id, columns, row_count, rows }
 *
 * Distinct de `/microdata` : pas d'agrégation, une ligne par répondant pour les
 * colonnes demandées (variables sélectionnées + socio-démos). Sert l'export
 * Excel "feuille par sondage" (bead f3i.13) — les croisements pondérés restent
 * sur `/microdata`.
 *
 * Env (serveur only) : AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY, AZURE_STORAGE_CONTAINER
 */

import type { Handler } from "@netlify/functions";
import { isMicrodataSurveyAccessible } from "../../src/logic/tenancy";
import { handleMicrodataRawExport, MicrodataError, type RawExportParams } from "./microdata-core/core.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  for (const key of ["AZURE_STORAGE_ACCOUNT", "AZURE_STORAGE_KEY", "AZURE_STORAGE_CONTAINER"] as const) {
    if (!process.env[key]) {
      console.error(`[microdata-raw] Missing env var: ${key}`);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: `Server configuration error: missing ${key}` }) };
    }
  }

  let params: RawExportParams;
  try {
    const b = JSON.parse(event.body ?? "{}") as Partial<RawExportParams>;
    params = { survey_id: String(b.survey_id ?? ""), columns: Array.isArray(b.columns) ? b.columns.map(String) : [] };
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  // Isolation multi-tenant (f3i.14) : mêmes règles que /microdata et /microdata-manifest.
  if (!isMicrodataSurveyAccessible(event.headers, params.survey_id)) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: "Not found" }) };
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
    const result = await handleMicrodataRawExport(params, config);
    console.log(`[microdata-raw] ${params.survey_id} rows=${result.row_count} ${Date.now() - t0}ms`);
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof MicrodataError) {
      return { statusCode: err.status, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
    }
    console.error("[microdata-raw] query failed:", err);
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: "Raw export failed" }) };
  }
};
