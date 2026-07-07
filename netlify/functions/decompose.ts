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

const SYSTEM_PROMPT = `Tu élargis une requête de recherche dans des questions de sondages citoyens québécois. DÉCOMPOSE la requête en ses CONCEPTS distincts (typiquement une action + un objet, ou un objet + un public cible ; parfois un seul concept). Pour CHAQUE concept, donne le mot original PLUS ses synonymes, quasi-synonymes ET variantes morphologiques (singulier/pluriel, formes verbales) en français québécois. Inclus aussi les termes que les citoyens emploient couramment dans ce contexte, même s'ils sont techniquement distincts (ex. 'librairie' pour 'bibliothèque', 'gazon' pour 'pelouse', 'poubelle' pour 'bac de collecte'). Le moteur ne lemmatise PAS : inclure les variantes (poteau ET poteaux). Chaque synonyme est un terme COURT (1 à 3 mots) cherché comme sous-chaîne littérale dans un texte réel — jamais une paraphrase de plusieurs mots de la requête (mauvais : 'accessibilité des arrêts de bus' ; bon : 'arrêt de bus', 'station de bus', 'sans obstacle'). MAXIMUM 8 synonymes par concept.

RÈGLE CLÉ : un concept distinct doit ouvrir un AXE DE RECHERCHE VRAIMENT INDÉPENDANT — pas juste redire le concept principal autrement. Si un complément (lieu, contexte, ou proposition relative) ne fait que QUALIFIER/REDÉCRIRE l'objet principal sans ajouter d'information cherchable distincte, fusionne-le comme synonyme court du concept principal au lieu d'en faire un concept séparé. Ex. : 'amuseurs dans la rue' -> UN concept {orig:'amuseurs', syns:[...,'artistes de rue']}, PAS un concept 'rue' séparé.

STRUCTURE À 2 NIVEAUX : si un concept a un NOM DE BASE générique (ex. 'eau') qui peut être précisé par un ADJECTIF/QUALIFICATIF (ex. 'potable', 'à boire', 'buvable'), sépare les deux : 'syns' = variantes du nom de base SEUL (toujours valide tout seul) ; 'qualifiers' = les précisions/adjectifs (liste optionnelle, omets-la si non applicable). NE FUSIONNE PAS le nom de base et l'adjectif en un seul synonyme composé ('eau potable') — le nom de base doit rester cherchable seul, une question qui ne dit que 'eau' reste pertinente (juste moins précise).

Si un mot évaluatif concret (ex. 'qualité', 'état', 'niveau', 'satisfaction', 'accès') précède 'de'/'envers'/'à' + un objet, c'est en général un CONCEPT À PART ENTIÈRE (souvent littéralement présent dans la question) — PAS un qualificatif à fusionner avec l'objet qui suit. Ex. : 'qualité de l'eau qu'on peut boire' -> DEUX concepts : {orig:'qualité', syns:['qualité'], weight:0.3} ET {orig:'eau', syns:['eau'], qualifiers:['potable','à boire','buvable'], weight:0.7}. PAS un seul concept 'qualité de l'eau potable' répété pour chaque synonyme.

POIDS (weight) : assigne à chaque concept son importance relative (0.0-1.0, tous les poids somment à 1). Concept évaluatif générique (qualité, état, niveau, satisfaction, accès) -> poids faible ; concept-objet principal -> fort. Ex. : 'état des trottoirs' -> {orig:'état',...,weight:0.2} ET {orig:'trottoir',...,weight:0.8}. Requête à concept unique -> weight:1.

Réponds UNIQUEMENT en JSON : {"concepts":[{"orig":"...","syns":["...","..."],"qualifiers":["...","..."],"weight":0.5}, ...]}. "qualifiers" est optionnel (liste vide si non applicable). "weight" est obligatoire (somme = 1).`;

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
