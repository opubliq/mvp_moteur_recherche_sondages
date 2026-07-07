/**
 * Netlify Function — /search (proxy de recherche hybride Azure AI Search)
 *
 * POST { query: string, filters?: Record<string, string|number|boolean>, top?: number }
 *
 * Flux :
 *   1. Génère l'embedding de `query` via Azure OpenAI (text-embedding-3-large, 3072 dims)
 *   2. Lance une recherche hybride sur l'index `survey-questions` :
 *      texte plein + kNN multi-vecteurs pondérés (`content_vector` poids 1.0
 *      + `survey_vector` poids 0.15)
 *   3. Applique TOUJOURS le filtre `doc_type eq 'question'` (+ filtres facette éventuels)
 *   4. Renvoie les résultats — les clés Azure ne quittent JAMAIS le serveur
 *
 * Vars d'env requises (côté serveur seulement) :
 *   SEARCH_ENDPOINT, SEARCH_QUERY_KEY, AOAI_ENDPOINT, AOAI_KEY, AOAI_EMBED_DEPLOYMENT
 */

import type { Handler } from "@netlify/functions";
import type { Concept, SearchResult } from "../../src/types";
import { scoreResult } from "../../src/logic/scoring";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const INDEX_NAME = "survey-questions";
const SEARCH_API_VERSION = "2024-07-01";
const AOAI_API_VERSION = "2024-02-01";
const MAX_TOP = 100;

// Recherche vectorielle pondérée : la requête est comparée à DEUX vecteurs par
// question — le vecteur QUESTION (content_vector, dominant) et le vecteur
// CONTEXTE sondage (survey_vector, secondaire). Le poids sondage < 1 oriente
// vers les sondages pertinents sans écraser le signal propre à la question.
const CONTENT_VECTOR_WEIGHT = 1.0;
const SURVEY_VECTOR_WEIGHT = 0.15;

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
  concepts?: Concept[];
  filters?: Record<string, string | number | boolean>;
  top?: number;
  rerank?: boolean;
}

interface AoaiEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

interface SearchResponse {
  value: any[];
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
      if (value === null || value === undefined || value === "") continue;
      if (typeof value === "string") {
        // Échapper les apostrophes OData
        const escaped = value.replace(/'/g, "''");
        clauses.push(`${field} eq '${escaped}'`);
      } else if (typeof value === "number" || typeof value === "boolean") {
        clauses.push(`${field} eq ${value}`);
      }
    }
  }

  // Support du filtre par thèmes (collection)
  if (filters && filters.themes && Array.isArray(filters.themes)) {
    for (const theme of filters.themes) {
      const escaped = theme.replace(/'/g, "''");
      clauses.push(`themes/any(t: t eq '${escaped}')`);
    }
  }

  return clauses.join(" and ");
}

/**
 * Échappe les caractères spéciaux Lucene et gère les phrases.
 */
function escapeLucene(term: string): string {
  if (!term) return "";
  const t = term.trim();
  if (t.includes(" ")) {
    return `"${t.replace(/"/g, '\\"')}"`;
  }
  return t.replace(/([!*+&|()\[\]{}^"~?:\\/])/g, "\\$1");
}

/**
 * Construit une requête Lucene à partir des concepts et leurs synonymes/qualifiers.
 */
function buildLuceneQuery(concepts: Concept[]): string {
  if (!concepts || concepts.length === 0) return "*";

  return concepts
    .map((c) => {
      const branches = [
        `${escapeLucene(c.orig)}^2`,
        ...(c.syns || []).map((s) => escapeLucene(s)),
        ...(c.qualifiers || []).map((q) => escapeLucene(q)),
      ].filter(Boolean);

      return `(${branches.join(" OR ")})`;
    })
    .join(" AND ");
}

/**
 * Appelle Azure OpenAI pour confirmer la pertinence topique des résultats.
 * On lui passe la requête et le top des résultats.
 */
async function runLLMJudge(
  query: string,
  results: SearchResult[],
): Promise<Record<string, "Pertinent" | "Hors-sujet">> {
  if (results.length === 0) return {};

  const endpoint = (process.env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = process.env.AOAI_CHAT_DEPLOYMENT ?? "";
  const key = process.env.AOAI_KEY ?? "";
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${AOAI_API_VERSION}`;

  const questionsList = results
    .map((r) => `- [ID: ${r.id}] Question: "${r.question_text}" (Sondage: ${r.survey_name})`)
    .join("\n");

  const systemPrompt = `Tu es un juge expert en pertinence pour un moteur de recherche de sondages.
Ta tâche est de confirmer si une question de sondage est topiquement pertinente par rapport à la requête de l'utilisateur.

RÈGLES :
1. Une question est "Pertinent" si elle traite directement du sujet ou d'un aspect étroitement lié.
2. Une question est "Hors-sujet" si elle utilise des mots similaires mais dans un contexte totalement différent, ou si elle est trop éloignée du sujet central de la requête.
3. Sois strict mais juste.

Requête utilisateur : "${query}"

Réponds par un objet JSON où chaque clé est l'ID de la question et la valeur est soit "Pertinent" soit "Hors-sujet".`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": key,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Voici les questions à évaluer :\n${questionsList}` },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[search] LLM Judge API error ${res.status}: ${errBody}`);
      return {};
    }

    const json = (await res.json()) as any;
    const content = json.choices[0]?.message?.content;
    if (!content) return {};

    return JSON.parse(content) as Record<string, "Pertinent" | "Hors-sujet">;
  } catch (err) {
    console.error("[search] LLM Judge failed:", err);
    return {};
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
    "AOAI_CHAT_DEPLOYMENT",
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

  const { query, concepts, filters, top = 10, rerank = false } = body;

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
      `[search] embedding OK — dims=${
        vector.length
      } query="${trimmedQuery.slice(0, 60)}"`,
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

  const luceneQuery = concepts && concepts.length > 0 ? buildLuceneQuery(concepts) : trimmedQuery;

  const searchPayload: any = {
    search: luceneQuery,
    queryType: "full", // Pour supporter la syntaxe Lucene
    vectorQueries: [
      {
        kind: "vector",
        vector,
        fields: "content_vector",
        k: 50,
        exhaustive: false,
        weight: CONTENT_VECTOR_WEIGHT,
      },
      {
        kind: "vector",
        vector,
        fields: "survey_vector",
        k: 50,
        exhaustive: false,
        weight: SURVEY_VECTOR_WEIGHT,
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
    // Avec concepts : on récupère le pool maximal de candidats (1000 = plafond
    // Azure AI Search) pour ne perdre aucun résultat Faible/Partiel/Exact au
    // moment du scoring local. Les Hors-sujet sont filtrés ensuite.
    top: concepts && concepts.length > 0 ? Math.max(clampedTop, 1000) : clampedTop,
  };

  console.log(`[search] AI Search — query="${luceneQuery}" filter="${filter}" top=${searchPayload.top}`);

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

  // -----------------------------------------------------------------------
  // Étape 3 : Scoring local et tri par pertinence
  // -----------------------------------------------------------------------
  let results = (searchResult.value ?? []) as (SearchResult & { "@search.score": number })[];

  if (concepts && concepts.length > 0) {
    // Calcul de la couverture
    results = results.map((r) => {
      const { score, pertinence, matched } = scoreResult(concepts, r);
      return {
        ...r,
        score_couverture: score,
        pertinence,
        matched_concepts: matched,
      };
    });

    // Tri : Palier de pertinence d'abord, puis score Azure
    const pertinenceOrder: Record<string, number> = {
      Exact: 4,
      Partiel: 3,
      Faible: 2,
      "Hors-sujet": 1,
    };

    results.sort((a, b) => {
      const orderA = pertinenceOrder[a.pertinence || "Hors-sujet"];
      const orderB = pertinenceOrder[b.pertinence || "Hors-sujet"];
      if (orderA !== orderB) return orderB - orderA;
      // Départage par score Azure (@search.score)
      return (b["@search.score"] || 0) - (a["@search.score"] || 0);
    });

    // ---------------------------------------------------------------------
    // Étape 4 : Juge LLM (Reranking final) — Optionnel
    // ---------------------------------------------------------------------
    if (rerank) {
      const topForJudge = results.slice(0, 15);
      const judgments = await runLLMJudge(trimmedQuery, topForJudge);
      
      let countHorsSujet = 0;
      results = results.map((r) => {
        if (judgments[r.id] === "Hors-sujet") {
          countHorsSujet++;
          return { ...r, pertinence: "Hors-sujet" as const };
        }
        return r;
      });

      console.log(`[search] LLM Judge: ${countHorsSujet} results marked as Hors-sujet among top ${topForJudge.length}`);

      // Re-tri après jugement (pour basculer les nouveaux Hors-sujet à la fin)
      results.sort((a, b) => {
        const orderA = pertinenceOrder[a.pertinence || "Hors-sujet"];
        const orderB = pertinenceOrder[b.pertinence || "Hors-sujet"];
        if (orderA !== orderB) return orderB - orderA;
        return (b["@search.score"] || 0) - (a["@search.score"] || 0);
      });

      // Filtre : on écarte les résultats jugés hors-sujet
      results = results.filter((r) => r.pertinence !== "Hors-sujet");
    }

    // On garde tout ce qui est pertinent (Exact / Partiel / Faible), sans
    // plafond de nombre : seuls les Hors-sujet sont écartés.
    results = results.filter((r) => r.pertinence !== "Hors-sujet");
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      results,
      count: results.length,
      luceneQuery, // Pour info/debug
    }),
  };
};
