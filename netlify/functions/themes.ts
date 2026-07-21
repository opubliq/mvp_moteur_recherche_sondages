/**
 * Netlify Function — /themes (exploration thématique du corpus)
 *
 * Deux modes selon les query params :
 *   GET /themes
 *       → facettes : { themes: [{value,count}], concepts: [{value,count}] }
 *         (nombre de questions par thème / concept, tri décroissant)
 *   GET /themes?theme=<t>[&year=<y>]   ou   ?concept=<c>[&year=<y>]
 *       → questions taggées, cross-sondage : { results: SearchResult[], count }
 *
 * Filtre pur (pas de recherche sémantique) : sert de couche de découverte
 * "qu'a-t-on demandé sur X, à travers les sondages / années".
 */

import type { Handler } from "@netlify/functions";

const INDEX_NAME = "survey-questions";
const SEARCH_API_VERSION = "2024-07-01";
const MAX_RESULTS = 500;
const FACET_COUNT = 300;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Mêmes champs que /search (cf. netlify/functions/search.ts) → compatibles SearchResult.
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

/** Échappe une valeur pour un littéral chaîne OData ('' = apostrophe). */
function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  for (const key of ["SEARCH_ENDPOINT", "SEARCH_QUERY_KEY"] as const) {
    if (!process.env[key]) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Server configuration error: missing ${key}` }),
      };
    }
  }

  const searchEndpoint = (process.env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const searchKey = process.env.SEARCH_QUERY_KEY ?? "";
  const searchUrl = `${searchEndpoint}/indexes/${INDEX_NAME}/docs/search?api-version=${SEARCH_API_VERSION}`;

  const params = event.queryStringParameters ?? {};
  const theme = params.theme?.trim();
  const concept = params.concept?.trim();
  const yearRaw = params.year?.trim();
  const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;

  const headers = { "Content-Type": "application/json", "api-key": searchKey };

  try {
    // --- Mode facettes : liste des thèmes + concepts avec leur nombre ---
    if (!theme && !concept) {
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
      if (!res.ok) throw new Error(`AI Search error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const facets = data["@search.facets"] ?? {};
      const map = (arr: { value: string; count: number }[] | undefined) =>
        (arr ?? []).map((f) => ({ value: f.value, count: f.count }));
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          themes: map(facets.themes),
          concepts: map(facets.concepts),
        }),
      };
    }

    // --- Mode browse : questions taggées d'un thème/concept (+ année) ---
    const clauses = ["doc_type eq 'question'"];
    if (theme) clauses.push(`themes/any(t: t eq '${odataEscape(theme)}')`);
    if (concept) clauses.push(`concepts/any(c: c eq '${odataEscape(concept)}')`);
    if (year !== undefined && !Number.isNaN(year)) clauses.push(`survey_year eq ${year}`);

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
    if (!res.ok) throw new Error(`AI Search error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const results = data.value ?? [];
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ results, count: results.length }),
    };
  } catch (err) {
    console.error("[themes] AI Search request failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Themes request failed" }),
    };
  }
};
