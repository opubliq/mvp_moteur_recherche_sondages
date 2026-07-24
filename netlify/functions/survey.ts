/**
 * Netlify Function — /survey (récupération exhaustive d'un sondage)
 *
 * GET  /survey?survey_id=<id>
 * POST { survey_id: string }
 *
 * Contrairement à /search, AUCUN embedding ni recherche vectorielle : on liste
 * exhaustivement un sondage par simple filtre OData. La requête AI Search elle-même
 * vit dans `src/logic/corpus.ts` (`getSurveyCatalog`), partagée avec l'orchestrateur
 * agent (`src/logic/agent.ts`) — source de vérité unique du mapping code→label.
 *
 * Vars d'env requises (côté serveur seulement) :
 *   SEARCH_ENDPOINT, SEARCH_QUERY_KEY
 */

import type { Handler } from "@netlify/functions";
import { getSurveyCatalog } from "../../src/logic/corpus";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

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

  const env = {
    SEARCH_ENDPOINT: process.env.SEARCH_ENDPOINT!,
    SEARCH_QUERY_KEY: process.env.SEARCH_QUERY_KEY!,
  };

  let catalog: Awaited<ReturnType<typeof getSurveyCatalog>>;
  try {
    catalog = await getSurveyCatalog(surveyId, env);
  } catch (err) {
    console.error("[survey] AI Search request failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Survey request failed" }),
    };
  }

  if (!catalog) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `No survey found for survey_id '${surveyId}'` }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(catalog),
  };
};
