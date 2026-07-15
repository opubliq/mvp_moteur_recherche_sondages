/**
 * Netlify Function — /decompose
 *
 * Transforme une requête utilisateur brute en un objet JSON de concepts pondérés
 * pour enrichir la recherche (pattern scoring_search_output.md).
 *
 * POST { query: string }
 *
 * Flux :
 *   1. Appel Azure OpenAI (GPT-4o) avec un prompt système structuré.
 *   2. Normalisation des poids (somme = 1.0).
 *   3. Nettoyage des doublons (syns/qualifiers).
 *
 * La logique de décomposition (prompt, call AOAI, normalisation) vit dans le
 * module partagé `src/logic/decompose.ts` — réutilisé tel quel par le harness
 * d'éval offline pour garantir une expansion prod-fidèle. Cette fonction ne fait
 * qu'encapsuler l'HTTP (CORS, validation du body, gestion d'erreurs).
 *
 * Vars d'env requises :
 *   AOAI_ENDPOINT, AOAI_KEY, AOAI_CHAT_DEPLOYMENT
 */

import type { Handler } from "@netlify/functions";
import { decomposeQuery, type DecomposeEnv } from "../../src/logic/decompose";

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

interface DecomposeBody {
  query: string;
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

  // Vérification des vars d'env
  const requiredEnv = ["AOAI_ENDPOINT", "AOAI_KEY", "AOAI_CHAT_DEPLOYMENT"] as const;
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`[decompose] Missing env var: ${key}`);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Server configuration error: missing ${key}` }),
      };
    }
  }

  // Parse du body
  let body: DecomposeBody;
  try {
    body = JSON.parse(event.body ?? "{}") as DecomposeBody;
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { query } = body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "query is required" }),
    };
  }

  // Décomposition via le module partagé (prompt + call AOAI + normalisation)
  const env: DecomposeEnv = {
    AOAI_ENDPOINT: process.env.AOAI_ENDPOINT ?? "",
    AOAI_KEY: process.env.AOAI_KEY ?? "",
    AOAI_CHAT_DEPLOYMENT: process.env.AOAI_CHAT_DEPLOYMENT ?? "",
  };

  try {
    const { concepts, rerankQuery } = await decomposeQuery(query, env);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        concepts,
        // Reformulation destinée au reranker sémantique (voir decompose.ts).
        // Le client la renvoie telle quelle à /search.
        rerank_query: rerankQuery,
      }),
    };
  } catch (err) {
    console.error("[decompose] Request failed:", err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to decompose query", details: err instanceof Error ? err.message : String(err) }),
    };
  }
};
