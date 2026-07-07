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
 * Vars d'env requises :
 *   AOAI_ENDPOINT, AOAI_KEY, AOAI_CHAT_DEPLOYMENT
 */

import type { Handler } from "@netlify/functions";
import type { Concept } from "../../src/types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const AOAI_API_VERSION = "2024-02-01"; // Version pour Chat Completion

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `Tu es un expert en analyse linguistique et recherche d'information. Ta tâche est de décomposer une requête utilisateur (recherche dans une base de sondages) en concepts indépendants pondérés.

STRUCTURE JSON ATTENDUE :
{
  "concepts": [
    {
      "orig": "terme original",
      "syns": ["synonyme1", "synonyme2"],
      "qualifiers": ["adjectif1", "adjectif2"], // optionnel
      "weight": 0.0-1.0
    }
  ]
}

RÈGLES CRITIQUES :
1. DÉCOMPOSITION : Identifie les axes de recherche RÉELLEMENT INDÉPENDANTS.
2. SYNONYMES : Courts (1-3 mots), variantes morphologiques. Cherchables comme sous-chaîne. Pas de paraphrases.
3. QUALIFIERS (Optionnels) : Structure à 2 niveaux. Le nom de base ("orig") doit rester valide seul (ex: "eau" + qualifiers:["potable"]).
4. POIDS : La somme des poids DOIT être égale à 1.0. 
   - Poids fort au concept-objet principal.
   - Poids faible (ex: 0.2 ou 0.3) aux concepts évaluatifs génériques (satisfaction, accès, qualité, état).
5. DÉDUPLICATION : Ne pas inclure "orig" dans "syns" ou "qualifiers".
6. LANGUE : La sortie doit être dans la même langue que la requête (généralement Français).

EXEMPLE :
Requête : "satisfaction sur la qualité de l'eau potable"
Réponse :
{
  "concepts": [
    {
      "orig": "eau",
      "syns": ["ressource hydrique"],
      "qualifiers": ["potable", "à boire"],
      "weight": 0.7
    },
    {
      "orig": "qualité",
      "syns": ["satisfaction", "état"],
      "weight": 0.3
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DecomposeBody {
  query: string;
}

interface DecomposeResponse {
  concepts: Concept[];
}

interface AoaiChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise les concepts : dédoublonnage, nettoyage et s'assure que la somme des poids vaut 1.
 */
function normalizeConcepts(concepts: Concept[]): Concept[] {
  if (!concepts || concepts.length === 0) return [];

  // 1. Nettoyage et dédoublonnage pour chaque concept
  const cleaned = concepts.map((c) => {
    const orig = c.orig.trim();
    const syns = Array.from(new Set((c.syns || []).map((s) => s.trim()).filter((s) => s.toLowerCase() !== orig.toLowerCase())));
    const qualifiers = Array.from(new Set((c.qualifiers || []).map((q) => q.trim()).filter((q) => q.toLowerCase() !== orig.toLowerCase())));
    
    return {
      orig,
      syns,
      qualifiers: qualifiers.length > 0 ? qualifiers : undefined,
      weight: Math.max(0, c.weight || 0),
    };
  });

  // 2. Normalisation des poids (somme = 1)
  const totalWeight = cleaned.reduce((acc, c) => acc + c.weight, 0);
  
  if (totalWeight === 0) {
    const equalWeight = 1 / cleaned.length;
    cleaned.forEach((c) => (c.weight = equalWeight));
  } else if (Math.abs(totalWeight - 1.0) > 0.001) {
    cleaned.forEach((c) => (c.weight = c.weight / totalWeight));
  }

  return cleaned;
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

  // Appel Azure OpenAI
  const endpoint = (process.env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = process.env.AOAI_CHAT_DEPLOYMENT ?? "";
  const key = process.env.AOAI_KEY ?? "";
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${AOAI_API_VERSION}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": key,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query.trim() },
        ],
        // gpt-5-mini est un modèle reasoning : temperature doit rester à 1 (défaut),
        // reasoning_effort "minimal" garde la latence basse pour le hot path.
        reasoning_effort: "minimal",
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`AOAI chat error ${res.status}: ${errBody}`);
    }

    const json = (await res.json()) as AoaiChatResponse;
    const content = json.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from AOAI");
    }

    const parsed = JSON.parse(content) as DecomposeResponse;
    const normalized = normalizeConcepts(parsed.concepts);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        concepts: normalized,
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
