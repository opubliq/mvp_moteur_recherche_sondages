/**
 * Azure Function — /microdata-raw (portage de netlify/functions/microdata-raw.ts,
 * jamais migré lors du portage initial vers Azure Functions — cf. f3i.1).
 *
 * Adaptateur : parse la requête, injecte la config, appelle le CŒUR PORTABLE
 * `../microdata-core/core` (cf. `azure-functions/src/functions/microdata.ts`
 * pour le pattern de portage HTTP).
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { isMicrodataSurveyAccessible } from "../../../src/logic/tenancy";
import { handleMicrodataRawExport, MicrodataError, type RawExportParams } from "../microdata-core/core";
import { checkAuth } from "../middleware/auth";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function microdataRaw(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of ["AZURE_STORAGE_ACCOUNT", "AZURE_STORAGE_KEY", "AZURE_STORAGE_CONTAINER"] as const) {
    if (!process.env[key]) {
      context.error(`[microdata-raw] Missing env var: ${key}`);
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  let params: RawExportParams;
  try {
    const b = (await request.json()) as Partial<RawExportParams>;
    params = { survey_id: String(b.survey_id ?? ""), columns: Array.isArray(b.columns) ? b.columns.map(String) : [] };
  } catch {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "Invalid request body" } };
  }

  if (!isMicrodataSurveyAccessible(auth.tenant, params.survey_id)) {
    return { status: 404, headers: CORS_HEADERS, jsonBody: { error: "Not found" } };
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
    context.log(`[microdata-raw] ${params.survey_id} rows=${result.row_count} ${Date.now() - t0}ms`);
    return { status: 200, headers: CORS_HEADERS, jsonBody: result };
  } catch (err) {
    if (err instanceof MicrodataError) {
      return { status: err.status, headers: CORS_HEADERS, jsonBody: { error: err.message } };
    }
    context.error("[microdata-raw] query failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Raw export failed" } };
  }
}

app.http("microdata-raw", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "microdata-raw",
  handler: microdataRaw,
});
