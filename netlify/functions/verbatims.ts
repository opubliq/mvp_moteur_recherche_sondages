/**
 * Netlify Function — /verbatims (réponses libres d'UNE question ouverte)
 *
 * POST { survey_id, variable, query?, top?, skip? }
 *
 * Deux modes, une seule liste côté front (cf. bead jsu.4) :
 *
 *   - PARCOURS (pas de `query`) : les réponses dans l'ordre de l'index,
 *     paginées par `skip`/`top`. Sert à voir le matériau avant de savoir quoi
 *     y chercher. Aucun appel Cohere → gratuit et instantané.
 *
 *   - RECHERCHE (`query` non vide) : BM25 sur le champ `text` (analyzer
 *     fr.microsoft) filtré sur survey_id+variable, puis rerank Cohere v4.0 du
 *     pool, et on ne renvoie que le haut du panier.
 *
 * Pas de recherche vectorielle : `text_vector` est déclaré au schéma de
 * `survey-verbatims` mais volontairement non peuplé tant que BM25+rerank
 * suffit (décision de l'epic). Aucun appel LLM de synthèse — l'utilisateur
 * veut des citations brutes, pas un résumé.
 *
 * Vars d'env requises : SEARCH_ENDPOINT, SEARCH_QUERY_KEY et, en mode
 * recherche, COHERE_RERANK_ENDPOINT / _DEPLOYMENT / _KEY.
 */

import type { Handler } from "@netlify/functions";
import { cohereRerankDocuments, RerankError } from "../../src/logic/rerank";
import type { RerankEnv } from "../../src/logic/rerank";

const INDEX_NAME = "survey-verbatims";
const SEARCH_API_VERSION = "2024-07-01";

/**
 * Pool BM25 envoyé au reranker. Même ordre de grandeur que la fenêtre de rerank
 * des questions (150) : au-delà on paie de la latence Cohere sans gagner de
 * rappel, les questions du corpus plafonnant à ~1600 réponses.
 */
const RERANK_POOL = 150;
/** Citations renvoyées en mode recherche — la fourchette 10-15 du cadrage. */
const DEFAULT_TOP_SEARCH = 15;
/** Page de parcours : assez pour se faire une idée, assez court pour scroller. */
const DEFAULT_TOP_BROWSE = 50;
const MAX_TOP = 200;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

/**
 * Sociodémo du répondant, portée par chaque doc verbatim (peuplée par jsu.3).
 * Ce sont des LIBELLÉS, pas des codes — affichables tels quels.
 *
 * `marital_status` existe au schéma mais n'est renseigné dans aucun sondage
 * aujourd'hui : inutile de le transporter.
 */
const SOCIODEMO_FIELDS = ["gender", "age", "education", "income", "region", "language", "occupation"] as const;

const SELECT_FIELDS = ["id", "respondent_id", "text", ...SOCIODEMO_FIELDS].join(",");

interface VerbatimsBody {
  survey_id?: string;
  variable?: string;
  query?: string;
  top?: number;
  skip?: number;
}

interface VerbatimDoc {
  id: string;
  respondent_id: number;
  text: string;
  "@search.score"?: number;
  [field: string]: unknown;
}

/**
 * Doc Azure → contrat `/verbatims`. La sociodémo est regroupée sous une clé
 * dédiée : elle décrit QUI a répondu, pas la réponse. Les champs vides sont
 * omis pour ne pas transporter des `null` par milliers.
 */
function toVerbatim(d: VerbatimDoc) {
  const sociodemo: Record<string, string> = {};
  for (const f of SOCIODEMO_FIELDS) {
    const v = d[f];
    if (typeof v === "string" && v.trim()) sociodemo[f] = v;
  }
  return {
    id: d.id,
    respondent_id: d.respondent_id,
    text: d.text,
    ...(Object.keys(sociodemo).length > 0 ? { sociodemo } : {}),
  };
}

/** Échappe une valeur pour un littéral chaîne OData ('' = apostrophe). */
function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  let body: VerbatimsBody;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const surveyId = body.survey_id?.trim();
  const variable = body.variable?.trim();
  if (!surveyId || !variable) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "survey_id et variable sont requis" }),
    };
  }

  const query = body.query?.trim() ?? "";
  const isSearch = query.length > 0;
  const skip = Math.max(0, Math.trunc(body.skip ?? 0));
  const top = Math.min(
    MAX_TOP,
    Math.max(1, Math.trunc(body.top ?? (isSearch ? DEFAULT_TOP_SEARCH : DEFAULT_TOP_BROWSE))),
  );

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
  const searchUrl = `${searchEndpoint}/indexes/${INDEX_NAME}/docs/search?api-version=${SEARCH_API_VERSION}`;
  const headers = { "Content-Type": "application/json", "api-key": process.env.SEARCH_QUERY_KEY ?? "" };
  const filter = `survey_id eq '${odataEscape(surveyId)}' and variable eq '${odataEscape(variable)}'`;

  try {
    // --- Parcours : page brute, pas de scoring, pas de Cohere ---
    if (!isSearch) {
      const res = await fetch(searchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          search: "*",
          filter,
          select: SELECT_FIELDS,
          top,
          skip,
          count: true,
        }),
      });
      if (!res.ok) throw new Error(`AI Search error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const docs: VerbatimDoc[] = data.value ?? [];
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          survey_id: surveyId,
          variable,
          query: "",
          total: data["@odata.count"] ?? docs.length,
          results: docs.map(toVerbatim),
        }),
      };
    }

    // --- Recherche : BM25 → pool → Cohere rerank → haut du panier ---
    for (const key of ["COHERE_RERANK_ENDPOINT", "COHERE_RERANK_DEPLOYMENT", "COHERE_RERANK_KEY"] as const) {
      if (!process.env[key]) {
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: `Server configuration error: missing ${key}` }),
        };
      }
    }

    const res = await fetch(searchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        search: query,
        // `any` plutôt que `all` : une réponse libre de dix mots ne contient
        // presque jamais tous les termes de la requête. Le tri fin est de
        // toute façon le travail du reranker.
        searchMode: "any",
        searchFields: "text",
        queryType: "simple",
        filter,
        select: SELECT_FIELDS,
        top: RERANK_POOL,
        count: true,
      }),
    });
    if (!res.ok) throw new Error(`AI Search error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const pool: VerbatimDoc[] = data.value ?? [];

    if (pool.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ survey_id: surveyId, variable, query, total: 0, results: [] }),
      };
    }

    // Un verbatim est du texte nu : pas de YAML (les documents structurés du
    // rerank de questions portaient un titre et une échelle de réponse).
    const rerankEnv: RerankEnv = {
      COHERE_RERANK_ENDPOINT: process.env.COHERE_RERANK_ENDPOINT ?? "",
      COHERE_RERANK_DEPLOYMENT: process.env.COHERE_RERANK_DEPLOYMENT ?? "",
      COHERE_RERANK_KEY: process.env.COHERE_RERANK_KEY ?? "",
    };
    const scores = await cohereRerankDocuments(query, pool.map((d) => d.text ?? ""), rerankEnv);

    const ranked = pool
      .map((d, i) => ({
        ...toVerbatim(d),
        relevance_score: scores[i] ?? 0,
        // Même convention que les questions (bead 9gf.12) : 0-100 absolu,
        // aucune normalisation par requête.
        score_pertinence: Math.round((scores[i] ?? 0) * 100),
      }))
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, top);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        survey_id: surveyId,
        variable,
        query,
        total: data["@odata.count"] ?? pool.length,
        pool_size: pool.length,
        results: ranked,
      }),
    };
  } catch (err) {
    if (err instanceof RerankError) {
      console.error("[verbatims] Cohere rerank failed:", err);
      return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: "Rerank failed" }) };
    }
    console.error("[verbatims] request failed:", err);
    return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: "Verbatims request failed" }) };
  }
};
