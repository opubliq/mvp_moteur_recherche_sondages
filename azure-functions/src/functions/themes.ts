/**
 * Azure Function — /themes (portage de netlify/functions/themes.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { mergeFacets } from "../../../src/logic/retrieve";
import { PUBLIC_QUESTIONS_INDEX, resolveAccessibleQuestionIndexes } from "../../../src/logic/tenancy";
import { checkAuth } from "../middleware/auth";

const SEARCH_API_VERSION = "2024-07-01";
const MAX_RESULTS = 500;
const FACET_COUNT = 300;

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
  "response_options",
  "var_type",
  "text_kind",
  "is_sociodemo",
  "sociodemo_type",
  "concepts",
  "themes",
  "tags",
  "n_respondents",
].join(",");

function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

export async function themes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

  const theme = request.query.get("theme")?.trim() || undefined;
  const concept = request.query.get("concept")?.trim() || undefined;
  const yearRaw = request.query.get("year")?.trim() || undefined;
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;

  const headers = { "Content-Type": "application/json", "api-key": searchKey };

  try {
    if (!theme && !concept) {
      const perIndex = await Promise.all(
        indexes.map(async (indexName) => {
          const searchUrl = `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;
          const res = await fetch(searchUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              search: "*",
              filter: "doc_type eq 'question'",
              top: 0,
              facets: [`themes,count:${FACET_COUNT}`, `concepts,count:${FACET_COUNT}`],
            }),
          });
          if (!res.ok) throw new Error(`AI Search error ${res.status} (index ${indexName}): ${await res.text()}`);
          const data = await res.json();
          return data["@search.facets"] as Record<string, Array<{ value: unknown; count: number }>> | undefined;
        }),
      );
      const facets = mergeFacets(perIndex) ?? {};
      const map = (arr: { value: unknown; count: number }[] | undefined) =>
        (arr ?? []).map((f) => ({ value: f.value, count: f.count }));
      return {
        status: 200,
        headers: CORS_HEADERS,
        jsonBody: { themes: map(facets.themes), concepts: map(facets.concepts) },
      };
    }

    const clauses = ["doc_type eq 'question'"];
    if (theme) clauses.push(`themes/any(t: t eq '${odataEscape(theme)}')`);
    if (concept) clauses.push(`concepts/any(c: c eq '${odataEscape(concept)}')`);
    if (year !== undefined && !Number.isNaN(year)) clauses.push(`survey_year eq ${year}`);

    const perIndexResults = await Promise.all(
      indexes.map(async (indexName) => {
        const searchUrl = `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;
        const res = await fetch(searchUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            search: "*",
            filter: clauses.join(" and "),
            select: RESULT_FIELDS,
            top: MAX_RESULTS,
          }),
        });
        if (!res.ok) throw new Error(`AI Search error ${res.status} (index ${indexName}): ${await res.text()}`);
        const data = await res.json();
        const isPrivate = indexName !== PUBLIC_QUESTIONS_INDEX;
        return ((data.value ?? []) as Record<string, unknown>[]).map((doc) => ({ ...doc, is_private: isPrivate }));
      }),
    );
    const results = perIndexResults.flat();
    return { status: 200, headers: CORS_HEADERS, jsonBody: { results, count: results.length } };
  } catch (err) {
    context.error("[themes] AI Search request failed:", err);
    return { status: 502, headers: CORS_HEADERS, jsonBody: { error: "Themes request failed" } };
  }
}

app.http("themes", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "themes",
  handler: themes,
});
