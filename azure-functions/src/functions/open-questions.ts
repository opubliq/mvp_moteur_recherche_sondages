/**
 * Azure Function — /open-questions (portage de netlify/functions/open-questions.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { resolveAccessibleQuestionIndexes } from "../../../src/logic/tenancy";
import { checkBasicAuth } from "../middleware/auth";

const SEARCH_API_VERSION = "2024-07-01";
const MAX_RESULTS = 1000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const RESULT_FIELDS = [
  "id",
  "survey_id",
  "survey_name",
  "survey_year",
  "pollster",
  "language",
  "variable",
  "question_text",
  "display_label",
  "var_type",
  "text_kind",
].join(",");

export async function openQuestions(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const authFailure = checkBasicAuth(request);
  if (authFailure) return authFailure;

  for (const key of ["SEARCH_ENDPOINT", "SEARCH_QUERY_KEY"] as const) {
    if (!process.env[key]) {
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  const searchEndpoint = (process.env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const searchKey = process.env.SEARCH_QUERY_KEY ?? "";

  const indexes = resolveAccessibleQuestionIndexes(request.headers);

  try {
    const perIndexResults = await Promise.all(
      indexes.map(async (indexName) => {
        const searchUrl = `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;
        const res = await fetch(searchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": searchKey },
          body: JSON.stringify({
            search: "*",
            filter: "doc_type eq 'question' and var_type eq 'open' and text_kind eq 'prose'",
            select: RESULT_FIELDS,
            top: MAX_RESULTS,
          }),
        });
        if (!res.ok) throw new Error(`AI Search error ${res.status} (index ${indexName}): ${await res.text()}`);
        const data = await res.json();
        return data.value ?? [];
      }),
    );
    const results = perIndexResults.flat();
    return { status: 200, headers: CORS_HEADERS, jsonBody: { results, count: results.length } };
  } catch (err) {
    context.error("[open-questions] AI Search request failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Open questions request failed" } };
  }
}

app.http("open-questions", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "open-questions",
  handler: openQuestions,
});
