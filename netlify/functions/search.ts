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
import type { Concept, SearchResult, SearchFilters, SearchFacets } from "../../src/types";
import { retrieve, RetrieveError } from "../../src/logic/retrieve";
import type { RetrieveEnv, RawCandidate } from "../../src/logic/retrieve";
import { rerankCandidates, RerankError } from "../../src/logic/rerank";
import type { RerankEnv } from "../../src/logic/rerank";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const AOAI_API_VERSION = "2024-02-01"; // Utilisé par le LLM Judge

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
  filters?: SearchFilters;
  top?: number;
  rerank?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    "COHERE_RERANK_ENDPOINT",
    "COHERE_RERANK_DEPLOYMENT",
    "COHERE_RERANK_KEY",
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

  const env: RetrieveEnv = {
    SEARCH_ENDPOINT: process.env.SEARCH_ENDPOINT!,
    SEARCH_QUERY_KEY: process.env.SEARCH_QUERY_KEY!,
    AOAI_ENDPOINT: process.env.AOAI_ENDPOINT!,
    AOAI_KEY: process.env.AOAI_KEY!,
    AOAI_EMBED_DEPLOYMENT: process.env.AOAI_EMBED_DEPLOYMENT!,
  };

  const rerankEnv: RerankEnv = {
    COHERE_RERANK_ENDPOINT: process.env.COHERE_RERANK_ENDPOINT!,
    COHERE_RERANK_DEPLOYMENT: process.env.COHERE_RERANK_DEPLOYMENT!,
    COHERE_RERANK_KEY: process.env.COHERE_RERANK_KEY!,
  };

  // -----------------------------------------------------------------------
  // Étapes 1 & 2 : Récupération hybride (via module partagé)
  // -----------------------------------------------------------------------
  let results: (SearchResult & { "@search.score": number })[];
  let luceneQuery: string;
  let rawFacets: Record<string, Array<{ value: any; count: number }>> | undefined;

  try {
    const result = await retrieve(trimmedQuery, concepts, env, { filters, top });
    results = result.candidates;
    luceneQuery = result.luceneQuery;
    rawFacets = result.facets;
  } catch (err) {

    if (err instanceof RetrieveError) {
      console.error(`[search] Retrieval failed at stage ${err.stage}:`, err.message);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message }),
      };
    }
    console.error("[search] Unexpected error during retrieval:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error during retrieval" }),
    };
  }

  // -----------------------------------------------------------------------
  // Étape 3 : Rerank sémantique Cohere (bead 9gf.11)
  // -----------------------------------------------------------------------
  // Reranke la fenêtre top-150 (triée par @search.score) via Cohere Rerank et
  // attache un `relevance_score` 0-1 à chaque candidat. C'est désormais l'ORDRE
  // DE TRI PRIMAIRE des résultats. La query envoyée à Cohere est la query
  // utilisateur BRUTE (pas les concepts).
  try {
    results = await rerankCandidates(trimmedQuery, results, rerankEnv);
  } catch (err) {
    if (err instanceof RerankError) {
      console.error("[search] Cohere rerank failed:", err.message);
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: err.message }),
      };
    }
    console.error("[search] Unexpected error during rerank:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error during rerank" }),
    };
  }

  // -----------------------------------------------------------------------
  // Étape 4 : Score de pertinence affichable (bead 9gf.12)
  // -----------------------------------------------------------------------
  // Le scoring lexical par sous-chaîne est SUPPRIMÉ (baseline P@Exact 23.9 %,
  // gelée dans `eval/_baseline_scoring.ts` à seule fin de comparaison). Le score
  // est désormais le `relevance_score` Cohere ×100, arrondi.
  //
  // ABSOLU : aucune normalisation par requête. CONTINU : plus aucun palier
  // Exact/Partiel/Faible — aucun seuil ne les séparait proprement sur le golden.
  // Les résultats sortent déjà triés par `relevance_score` décroissant
  // (`rerankCandidates`), donc l'ordre du tableau EST l'ordre de pertinence.
  results = results.map((r) => ({
    ...r,
    score_pertinence: Math.round((r.relevance_score ?? 0) * 100),
  }));

  // Juge LLM optionnel (opt-in via body.rerank) — gate topique explicite.
  // Il ne teinte plus aucun champ de palier : il ne fait que retirer du pool
  // les résultats jugés hors-sujet, en préservant l'ordre Cohere des survivants.
  if (concepts && concepts.length > 0 && rerank) {
    const topForJudge = results.slice(0, 15);
    const judgments = await runLLMJudge(trimmedQuery, topForJudge);

    const before = results.length;
    results = results.filter((r) => judgments[r.id] !== "Hors-sujet");

    console.log(
      `[search] LLM Judge: ${before - results.length} results filtered as Hors-sujet among top ${topForJudge.length}`,
    );
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      results,
      count: results.length,
      facets: rawFacets ? {
        years: (rawFacets.survey_year || []).map(f => ({ value: String(f.value), count: f.count })),
        pollsters: (rawFacets.pollster || []).map(f => ({ value: String(f.value), count: f.count })),
        languages: (rawFacets.language || []).map(f => ({ value: String(f.value), count: f.count })),
      } : undefined,
      luceneQuery, // Pour info/debug
    }),
  };
};
