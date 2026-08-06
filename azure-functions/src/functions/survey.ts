/**
 * Azure Function — /survey (portage de netlify/functions/survey.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { getSurveyCatalog } from "../../../src/logic/corpus";
import { resolveAccessibleQuestionIndexes } from "../../../src/logic/tenancy";
import { checkAuth } from "../middleware/auth-transitional";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function extractSurveyId(request: HttpRequest): Promise<string | null> {
  if (request.method === "GET") {
    const id = request.query.get("survey_id");
    return id && id.trim() ? id.trim() : null;
  }
  try {
    const body = (await request.json()) as { survey_id?: unknown };
    return typeof body.survey_id === "string" && body.survey_id.trim() ? body.survey_id.trim() : null;
  } catch {
    return null;
  }
}

export async function survey(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of ["SEARCH_ENDPOINT", "SEARCH_QUERY_KEY"] as const) {
    if (!process.env[key]) {
      context.error(`[survey] Missing env var: ${key}`);
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  const surveyId = await extractSurveyId(request);
  if (!surveyId) {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "survey_id is required (non-empty string)" } };
  }

  const env = {
    SEARCH_ENDPOINT: process.env.SEARCH_ENDPOINT!,
    SEARCH_QUERY_KEY: process.env.SEARCH_QUERY_KEY!,
  };

  const indexes = resolveAccessibleQuestionIndexes(auth.tenant);

  let catalog: Awaited<ReturnType<typeof getSurveyCatalog>>;
  try {
    catalog = await getSurveyCatalog(surveyId, env, indexes);
  } catch (err) {
    context.error("[survey] AI Search request failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Survey request failed" } };
  }

  if (!catalog) {
    return { status: 404, headers: CORS_HEADERS, jsonBody: { error: `No survey found for survey_id '${surveyId}'` } };
  }

  return { status: 200, headers: CORS_HEADERS, jsonBody: catalog };
}

app.http("survey", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "survey",
  handler: survey,
});
