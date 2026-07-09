/**
 * Récupération hybride Azure AI Search — module partagé.
 *
 * Extrait la partie « récupération » de la Netlify Function `/search` pour la
 * réutiliser telle quelle dans un harness d'évaluation offline (sans dupliquer
 * la requête hybride).
 *
 * `retrieve()` produit les CANDIDATS BRUTS renvoyés par Azure — les documents
 * + leur `@search.score` — AVANT tout scoring local (`scoreResult`) et AVANT le
 * filtre « Hors-sujet ». Aucun palier de pertinence n'est assigné ici.
 *
 * Le flux :
 *   1. Embedding de la requête via Azure OpenAI (text-embedding-3-large, 3072 dims)
 *   2. Construction de la requête Lucene à partir des concepts (`buildLuceneQuery`)
 *   3. Recherche hybride kNN multi-vecteurs sur l'index `survey-questions`
 *
 * Les clés/endpoints Azure sont injectés via le paramètre `env` (jamais lus
 * globalement) pour que le harness offline puisse les fournir librement.
 */

import type { Concept, SearchResult } from "../types";

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Endpoints + clés Azure requis par la récupération, injectés explicitement. */
export interface RetrieveEnv {
  SEARCH_ENDPOINT: string;
  SEARCH_QUERY_KEY: string;
  AOAI_ENDPOINT: string;
  AOAI_KEY: string;
  AOAI_EMBED_DEPLOYMENT: string;
}

/** Options facultatives de la récupération (filtres facette + taille du pool). */
export interface RetrieveOptions {
  filters?: Record<string, string | number | boolean>;
  top?: number;
}

/**
 * Candidat brut renvoyé par Azure AI Search : le document + son score hybride
 * (`@search.score`), sans aucun palier de pertinence assigné.
 */
export type RawCandidate = SearchResult & { "@search.score": number };

/** Résultat de `retrieve()` : les candidats bruts + la requête Lucene utilisée. */
export interface RetrieveResult {
  candidates: RawCandidate[];
  luceneQuery: string;
}

/**
 * Erreur de récupération porteuse de l'étape ayant échoué, pour que l'appelant
 * (ex. la fonction `/search`) puisse renvoyer le bon message HTTP.
 */
export class RetrieveError extends Error {
  constructor(
    public readonly stage: "embedding" | "search",
    message: string,
  ) {
    super(message);
    this.name = "RetrieveError";
  }
}

interface AoaiEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

interface AzureSearchResponse {
  value: any[];
  "@odata.count"?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Génère l'embedding d'un texte via Azure OpenAI REST API. */
async function getEmbedding(text: string, env: RetrieveEnv): Promise<number[]> {
  const endpoint = (env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = env.AOAI_EMBED_DEPLOYMENT ?? "";
  const key = env.AOAI_KEY ?? "";

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
export function buildLuceneQuery(concepts: Concept[]): string {
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

// ---------------------------------------------------------------------------
// Récupération
// ---------------------------------------------------------------------------

/**
 * Récupère les candidats bruts Azure AI Search pour une requête donnée.
 *
 * @param query    Requête utilisateur brute (sera trim()).
 * @param concepts Concepts pondérés (décomposition `/decompose`) ; si absents,
 *                 la requête texte brute est utilisée telle quelle.
 * @param env      Endpoints/clés Azure injectés (voir {@link RetrieveEnv}).
 * @param options  Filtres facette + taille du pool (voir {@link RetrieveOptions}).
 * @returns        Candidats bruts + requête Lucene utilisée.
 * @throws {RetrieveError} Étape `"embedding"` ou `"search"` selon l'échec.
 */
export async function retrieve(
  query: string,
  concepts: Concept[] | undefined,
  env: RetrieveEnv,
  options: RetrieveOptions = {},
): Promise<RetrieveResult> {
  const trimmedQuery = query.trim();
  const { filters, top = 10 } = options;
  const clampedTop = Math.min(Math.max(1, Number(top) || 10), MAX_TOP);

  // -----------------------------------------------------------------------
  // Étape 1 : embedding de la requête
  // -----------------------------------------------------------------------
  let vector: number[];
  try {
    vector = await getEmbedding(trimmedQuery, env);
    console.log(
      `[retrieve] embedding OK — dims=${
        vector.length
      } query="${trimmedQuery.slice(0, 60)}"`,
    );
  } catch (err) {
    console.error("[retrieve] Embedding generation failed:", err);
    throw new RetrieveError("embedding", err instanceof Error ? err.message : String(err));
  }

  // -----------------------------------------------------------------------
  // Étape 2 : recherche hybride Azure AI Search
  // -----------------------------------------------------------------------
  const searchEndpoint = (env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const searchKey = env.SEARCH_QUERY_KEY ?? ""; // clé QUERY (read-only)
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

  console.log(`[retrieve] AI Search — query="${luceneQuery}" filter="${filter}" top=${searchPayload.top}`);

  let searchResult: AzureSearchResponse;
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

    searchResult = (await res.json()) as AzureSearchResponse;
  } catch (err) {
    console.error("[retrieve] AI Search request failed:", err);
    throw new RetrieveError("search", err instanceof Error ? err.message : String(err));
  }

  const candidates = (searchResult.value ?? []) as RawCandidate[];
  return { candidates, luceneQuery };
}
