/**
 * Azure Function — /surveys (portage de netlify/functions/surveys.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { resolveAccessibleQuestionIndexes, PUBLIC_QUESTIONS_INDEX } from "../../../src/logic/tenancy";
import { checkAuth } from "../middleware/auth";

const SEARCH_API_VERSION = "2024-07-01";
const SEARCH_TOP = 1000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const SELECT_FIELDS = [
  "id",
  "survey_id",
  "survey_name",
  "survey_year",
  "survey_month",
  "pollster",
  "language",
  "n_respondents",
  "survey_description",
  "tags",
].join(",");

const TOP_CONCEPTS = 6;

async function fetchTopConcepts(
  searchUrl: string,
  searchKey: string,
  surveyId: string,
): Promise<{ value: string; count: number }[]> {
  const res = await fetch(searchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": searchKey },
    body: JSON.stringify({
      search: "*",
      filter: `doc_type eq 'question' and survey_id eq '${surveyId}'`,
      top: 0,
      facets: [`concepts,count:${TOP_CONCEPTS}`],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const facet = data["@search.facets"]?.concepts ?? [];
  return facet.map((f: { value: string; count: number }) => ({ value: f.value, count: f.count }));
}

async function fetchSurveysForIndex(
  searchEndpoint: string,
  searchKey: string,
  indexName: string,
): Promise<{ surveys: any[]; totalQuestions: number }> {
  const searchUrl = `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;

  const searchPayload = {
    search: "*",
    filter: "doc_type eq 'survey'",
    select: SELECT_FIELDS,
    top: SEARCH_TOP,
    orderby: "survey_year desc, survey_name asc",
  };

  const res = await fetch(searchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": searchKey },
    body: JSON.stringify(searchPayload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`AI Search error ${res.status} (index ${indexName}): ${errBody}`);
  }

  const data = await res.json();
  const isPrivate = indexName !== PUBLIC_QUESTIONS_INDEX;
  const surveys = (data.value || []).map((s: Record<string, unknown>) => ({ ...s, is_private: isPrivate }));

  const countPayload = { search: "*", filter: "doc_type eq 'question'", top: 0, count: true };

  const countRes = await fetch(searchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": searchKey },
    body: JSON.stringify(countPayload),
  });

  let totalQuestions = 0;
  if (countRes.ok) {
    const countData = await countRes.json();
    totalQuestions = countData["@odata.count"] || 0;
  }

  const surveysWithConcepts = await Promise.all(
    surveys.map(async (s: { survey_id: string }) => ({
      ...s,
      top_concepts: await fetchTopConcepts(searchUrl, searchKey, s.survey_id),
    })),
  );

  return { surveys: surveysWithConcepts, totalQuestions };
}

export async function surveys(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of ["SEARCH_ENDPOINT", "SEARCH_QUERY_KEY"] as const) {
    if (!process.env[key]) {
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  const searchEndpoint = (process.env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const searchKey = process.env.SEARCH_QUERY_KEY ?? "";

  const indexes = resolveAccessibleQuestionIndexes(auth.tenant);

  try {
    const perIndex = await Promise.all(
      indexes.map((indexName) => fetchSurveysForIndex(searchEndpoint, searchKey, indexName)),
    );

    const surveysWithConcepts = perIndex.flatMap((r) => r.surveys);
    const totalQuestions = perIndex.reduce((sum, r) => sum + r.totalQuestions, 0);

    return {
      status: 200,
      headers: CORS_HEADERS,
      jsonBody: {
        surveys: surveysWithConcepts,
        count: surveysWithConcepts.length,
        total_questions: totalQuestions,
      },
    };
  } catch (err) {
    context.error("[surveys] AI Search request failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Surveys request failed" } };
  }
}

app.http("surveys", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "surveys",
  handler: surveys,
});
