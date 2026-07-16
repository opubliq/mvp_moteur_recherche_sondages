/**
 * Netlify Function — /survey (récupération exhaustive d'un sondage)
 *
 * GET  /survey?survey_id=<id>
 * POST { survey_id: string }
 *
 * Contrairement à /search, AUCUN embedding ni recherche vectorielle : on liste
 * exhaustivement un sondage par simple filtre OData.
 *
 *   1. Doc parent  : filtre `doc_type eq 'survey'   and survey_id eq '<id>'`
 *   2. Questions   : filtre `doc_type eq 'question' and survey_id eq '<id>'`,
 *                    `top` élevé (eeq_2014 = 128 questions), triées par variable.
 *
 * Une seule requête AI Search couvre les deux : filtre `survey_id eq '<id>'`,
 * puis on partitionne par `doc_type` côté serveur.
 *
 * Vars d'env requises (côté serveur seulement) :
 *   SEARCH_ENDPOINT, SEARCH_QUERY_KEY
 */

import type { Handler } from "@netlify/functions";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const INDEX_NAME = "survey-questions";
const SEARCH_API_VERSION = "2024-07-01";
const SEARCH_TOP = 1000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Champs renvoyés (mêmes que search.ts, sans content_vector ; + doc_type pour
// partitionner parent / children).
const SELECT_FIELDS = [
  "id",
  "doc_type",
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
  "is_sociodemo",
  "is_ordinal",
  "sociodemo_type",
  "concepts",
  "themes",
  "tags",
  "n_respondents",
].join(",");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IndexDoc {
  id: string;
  doc_type?: string;
  survey_id: string;
  survey_name: string;
  survey_year: number | null;
  pollster: string | null;
  language: string | null;
  variable?: string;
  [key: string]: unknown;
}

interface SearchResponse {
  value: IndexDoc[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extrait survey_id depuis le body POST ou la query string GET. */
function extractSurveyId(event: Parameters<Handler>[0]): string | null {
  if (event.httpMethod === "GET") {
    const id = event.queryStringParameters?.survey_id;
    return id && id.trim() ? id.trim() : null;
  }
  try {
    const body = JSON.parse(event.body ?? "{}") as { survey_id?: unknown };
    return typeof body.survey_id === "string" && body.survey_id.trim()
      ? body.survey_id.trim()
      : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // Vérification des vars d'env (fail fast, sans divulguer les valeurs)
  for (const key of ["SEARCH_ENDPOINT", "SEARCH_QUERY_KEY"] as const) {
    if (!process.env[key]) {
      console.error(`[survey] Missing env var: ${key}`);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Server configuration error: missing ${key}` }),
      };
    }
  }

  const surveyId = extractSurveyId(event);
  if (!surveyId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "survey_id is required (non-empty string)" }),
    };
  }

  // Échappe les apostrophes OData ('  ->  '')
  const escapedId = surveyId.replace(/'/g, "''");
  const filter = `survey_id eq '${escapedId}'`;

  const searchEndpoint = (process.env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const searchKey = process.env.SEARCH_QUERY_KEY ?? ""; // clé QUERY (read-only)
  const searchUrl = `${searchEndpoint}/indexes/${INDEX_NAME}/docs/search?api-version=${SEARCH_API_VERSION}`;

  // Le champ `variable` n'est pas sortable côté index → tri client après coup.
  const searchPayload = {
    search: "*",
    filter,
    select: SELECT_FIELDS,
    top: SEARCH_TOP,
  };

  console.log(`[survey] AI Search — filter="${filter}" top=${SEARCH_TOP}`);

  let searchResult: SearchResponse;
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

    searchResult = (await res.json()) as SearchResponse;
  } catch (err) {
    console.error("[survey] AI Search request failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Survey request failed" }),
    };
  }

  const docs = searchResult.value ?? [];
  const survey = docs.find((d) => d.doc_type === "survey") ?? null;
  const questions = docs
    .filter((d) => d.doc_type === "question")
    .sort((a, b) =>
      (a.variable ?? "").localeCompare(b.variable ?? "", undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

  if (!survey && questions.length === 0) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `No survey found for survey_id '${surveyId}'` }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      survey,
      questions,
      count: questions.length,
    }),
  };
};
