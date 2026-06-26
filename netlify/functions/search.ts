/**
 * Netlify Function — /search (proxy de recherche hybride Azure AI Search)
 *
 * POST { query: string, filters?: Record<string, string|number|boolean>, top?: number }
 *
 * Flux :
 *   1. Génère l'embedding de `query` via Azure OpenAI (text-embedding-3-large, 3072 dims)
 *   2. Lance une recherche hybride sur l'index `survey-questions` :
 *      texte plein + vecteur kNN sur `content_vector`
 *   3. Applique TOUJOURS le filtre `doc_type eq 'question'` (+ filtres facette éventuels)
 *   4. Renvoie les résultats — les clés Azure ne quittent JAMAIS le serveur
 *
 * Vars d'env requises (côté serveur seulement) :
 *   SEARCH_ENDPOINT, SEARCH_QUERY_KEY, AOAI_ENDPOINT, AOAI_KEY, AOAI_EMBED_DEPLOYMENT
 */

import type { Handler } from "@netlify/functions";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const INDEX_NAME = "survey-questions";
const SEARCH_API_VERSION = "2024-07-01";
const AOAI_API_VERSION = "2024-02-01";
const MAX_TOP = 50;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchBody {
  query: string;
  filters?: Record<string, string | number | boolean>;
  top?: number;
}

interface AoaiEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

interface SearchResponse {
  value: unknown[];
  "@odata.count"?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Génère l'embedding d'un texte via Azure OpenAI REST API. */
async function getEmbedding(text: string): Promise<number[]> {
  const endpoint = (process.env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = process.env.AOAI_EMBED_DEPLOYMENT ?? "";
  const key = process.env.AOAI_KEY ?? "";

  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${AOAI_API_VERSION}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify({ input: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AOAI embeddings error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as AoaiEmbeddingResponse;
  return json.data[0].embedding;
}

/**
 * Construit la clause OData $filter.
 * Le filtre `doc_type eq 'question'` est TOUJOURS inclus en premier.
 * Les filtres additionnels sont ANDés uniquement pour les types scalaires sûrs.
 */
function buildFilter(filters?: Record<string, string | number | boolean>): string {
  const clauses: string[] = ["doc_type eq 'question'"];

  if (filters) {
    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      if (typeof value === "string") {
        // Échapper les apostrophes OData
        const escaped = value.replace(/'/g, "''");
        clauses.push(`${field} eq '${escaped}'`);
      } else if (typeof value === "number" || typeof value === "boolean") {
        clauses.push(`${field} eq ${value}`);
      }
    }
  }

  return clauses.join(" and ");
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // Vérification des vars d'env (fail fast, sans divulguer les valeurs)
  const requiredEnv = [
    "SEARCH_ENDPOINT",
    "SEARCH_QUERY_KEY",
    "AOAI_ENDPOINT",
    "AOAI_KEY",
    "AOAI_EMBED_DEPLOYMENT",
  ] as const;

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`[search] Missing env var: ${key}`);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Server configuration error: missing ${key}` }),
      };
    }
  }

  // Parse du body
  let body: SearchBody;
  try {
    body = JSON.parse(event.body ?? "{}") as SearchBody;
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { query, filters, top = 10 } = body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "query is required (non-empty string)" }),
    };
  }

  const trimmedQuery = query.trim();
  const clampedTop = Math.min(Math.max(1, Number(top) || 10), MAX_TOP);

  // -----------------------------------------------------------------------
  // Étape 1 : embedding de la requête
  // -----------------------------------------------------------------------
  let vector: number[];
  try {
    vector = await getEmbedding(trimmedQuery);
    console.log(
      `[search] embedding OK — dims=${vector.length} query="${trimmedQuery.slice(0, 60)}"`,
    );
  } catch (err) {
    console.error("[search] Embedding generation failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to generate query embedding" }),
    };
  }

  // -----------------------------------------------------------------------
  // Étape 2 : recherche hybride Azure AI Search
  // -----------------------------------------------------------------------
  const searchEndpoint = (process.env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const searchKey = process.env.SEARCH_QUERY_KEY ?? ""; // clé QUERY (read-only)
  const searchUrl = `${searchEndpoint}/indexes/${INDEX_NAME}/docs/search?api-version=${SEARCH_API_VERSION}`;
  const filter = buildFilter(filters);

  const searchPayload = {
    search: trimmedQuery,
    vectorQueries: [
      {
        kind: "vector",
        vector,
        fields: "content_vector",
        k: 50,
        exhaustive: false,
      },
    ],
    filter,
    select: [
      "id",
      "survey_id",
      "survey_name",
      "survey_year",
      "pollster",
      "language",
      "variable",
      "question_text",
      "response_options",
      "var_type",
      "is_sociodemo",
      "sociodemo_type",
      "concepts",
      "themes",
      "tags",
      "n_respondents",
    ].join(","),
    top: clampedTop,
  };

  console.log(`[search] AI Search — filter="${filter}" top=${clampedTop}`);

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
    console.error("[search] AI Search request failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Search request failed" }),
    };
  }

  const results = searchResult.value ?? [];

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      results,
      count: results.length,
    }),
  };
};
