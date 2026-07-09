/**
 * Netlify Function — /surveys (liste macro de tous les sondages)
 *
 * GET  /surveys
 *
 * Renvoie la liste de tous les documents de type 'survey' dans l'index.
 * Permet de construire l'onglet Exploration.
 */

import type { Handler } from "@netlify/functions";

const INDEX_NAME = "survey-questions";
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

// Nombre de concepts dominants remontés par sondage (facette, tri décroissant).
const TOP_CONCEPTS = 6;

/**
 * Concepts dominants d'un sondage : facette `concepts` sur ses questions,
 * triée par fréquence décroissante. Renvoie [] en cas d'échec (non bloquant).
 */
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

  const searchPayload = {
    search: "*",
    filter: "doc_type eq 'survey'",
    select: SELECT_FIELDS,
    top: SEARCH_TOP,
    orderby: "survey_year desc, survey_name asc",
  };

  try {
    const res = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": searchKey,
      },
      body: JSON.stringify(searchPayload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`AI Search error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const surveys = data.value || [];

    // On récupère aussi le nombre total de questions via une requête légère (top=0)
    const countPayload = {
      search: "*",
      filter: "doc_type eq 'question'",
      top: 0,
      count: true,
    };
    
    const countRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": searchKey,
      },
      body: JSON.stringify(countPayload),
    });
    
    let totalQuestions = 0;
    if (countRes.ok) {
      const countData = await countRes.json();
      totalQuestions = countData["@odata.count"] || 0;
    }

    // Concepts dominants par sondage (facettes en parallèle, une par survey_id).
    const surveysWithConcepts = await Promise.all(
      surveys.map(async (s: { survey_id: string }) => ({
        ...s,
        top_concepts: await fetchTopConcepts(searchUrl, searchKey, s.survey_id),
      })),
    );

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        surveys: surveysWithConcepts,
        count: surveysWithConcepts.length,
        total_questions: totalQuestions,
      }),
    };
  } catch (err) {
    console.error("[surveys] AI Search request failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Surveys request failed" }),
    };
  }
};
