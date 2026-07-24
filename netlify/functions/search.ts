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
  /**
   * Requête reformulée par `/decompose`, destinée au reranker Cohere. Optionnel :
   * si absente ou vide, on retombe sur la requête brute.
   */
  rerank_query?: string;
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

  const { query, concepts, filters, top = 10, rerank_query } = body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "query is required (non-empty string)" }),
    };
  }

  const trimmedQuery = query.trim();

  // Requête envoyée à Cohere. `/decompose` produit une reformulation destinée au
  // reranker (énoncé de recherche + levée d'ambiguïté) ; on retombe sur la requête
  // brute si elle manque, pour qu'un appel direct à /search reste valide.
  //
  // Ça compte : sur « intention de vote », la requête brute fait classer
  // « Intention d'ALLER voter » (participation) devant « Intention de vote »
  // (choix de parti) — deux mots quasi identiques, deux questions différentes.
  // La reformulation ('...pour un parti politique') corrige le classement.
  const rerankQuery = (rerank_query ?? "").trim() || trimmedQuery;

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
    results = await rerankCandidates(rerankQuery, results, rerankEnv);
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
