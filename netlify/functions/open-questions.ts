/**
 * Netlify Function — /open-questions (catalogue des questions ouvertes)
 *
 *   GET /open-questions
 *       → { results: SearchResult[], count }
 *
 * Filtre pur, aucune recherche sémantique : toutes les questions dont les
 * réponses sont de la prose libre, cross-sondage. Sert le sélecteur de l'espace
 * « Réponses libres », qui doit pouvoir sauter d'une question à l'autre sans
 * repasser par la recherche.
 *
 * Le prédicat est le MÊME que côté front (`isVerbatim`, src/lib/verbatims.ts) :
 * `var_type == "open"` seul attraperait aussi les réponses d'un mot et les
 * colonnes vides. Cf. `ingestion/SCHEMA.md` § text_kind.
 */

import type { Handler } from "@netlify/functions";

const INDEX_NAME = "survey-questions";
const SEARCH_API_VERSION = "2024-07-01";
/** Le corpus en compte ~82 aujourd'hui ; large de côté pour l'ingestion à venir. */
const MAX_RESULTS = 1000;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Sous-ensemble de /search suffisant pour un sélecteur (pas de response_options :
// une question ouverte n'en a pas). Reste compatible SearchResult.
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

  try {
    const res = await fetch(searchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": searchKey },
      body: JSON.stringify({
        search: "*",
        filter: "doc_type eq 'question' and var_type eq 'open' and text_kind eq 'prose'",
        select: RESULT_FIELDS,
        // Pas d'orderby : `survey_id` n'est pas sortable dans l'index. Le
        // regroupement par sondage se fait côté front.
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
    console.error("[open-questions] AI Search request failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Open questions request failed" }),
    };
  }
};
