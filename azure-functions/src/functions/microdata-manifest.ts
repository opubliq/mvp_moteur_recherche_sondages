/**
 * Azure Function — /microdata-manifest (portage de netlify/functions/microdata-manifest.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { isMicrodataSurveyAccessible } from "../../../src/logic/tenancy";
import { fetchManifest, MicrodataError } from "../microdata-core/core";
import { checkAuth } from "../middleware/auth-transitional";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function microdataManifest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of ["AZURE_STORAGE_ACCOUNT", "AZURE_STORAGE_KEY", "AZURE_STORAGE_CONTAINER"] as const) {
    if (!process.env[key]) {
      context.error(`[microdata-manifest] Missing env var: ${key}`);
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  const config = {
    storage: {
      account: process.env.AZURE_STORAGE_ACCOUNT!,
      key: process.env.AZURE_STORAGE_KEY!,
      container: process.env.AZURE_STORAGE_CONTAINER!,
    },
  };

  try {
    const manifest = await fetchManifest(config);
    const surveys = manifest.surveys.filter((s) => isMicrodataSurveyAccessible(auth.tenant, s.survey_id));
    return { status: 200, headers: CORS_HEADERS, jsonBody: { surveys } };
  } catch (err) {
    if (err instanceof MicrodataError) {
      return { status: err.status, headers: CORS_HEADERS, jsonBody: { error: err.message } };
    }
    context.error("[microdata-manifest] failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Manifest fetch failed" } };
  }
}

app.http("microdata-manifest", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "microdata-manifest",
  handler: microdataManifest,
});
