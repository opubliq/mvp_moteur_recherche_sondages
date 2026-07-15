/**
 * Récupération hybride Azure AI Search — module partagé.
 *
 * Extrait la partie « récupération » de la Netlify Function `/search` pour la
 * réutiliser telle quelle dans un harness d'évaluation offline (sans dupliquer
 * la requête hybride).
 *
 * `retrieve()` produit les CANDIDATS BRUTS renvoyés par Azure — les documents
 * + leur `@search.score` — AVANT le rerank sémantique Cohere. Aucun score de
 * pertinence (`relevance_score` / `score_pertinence`) n'est assigné ici : c'est
 * le rôle de `rerank.ts`. Cette séparation permet au harness offline d'appeler
 * `retrieve()` sans jamais déclencher d'appel Cohere.
 *
 * Le flux :
 *   1. Embedding de la requête via Azure OpenAI (text-embedding-3-large, 3072 dims)
 *   2. Construction de la requête Lucene à partir des concepts (`buildLuceneQuery`)
 *   3. Recherche hybride kNN multi-vecteurs sur l'index `survey-questions`
 *
 * Les clés/endpoints Azure sont injectés via le paramètre `env` (jamais lus
 * globalement) pour que le harness offline puisse les fournir librement.
 */

import type { Concept, SearchFilters, SearchResult } from "../types";

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

// Nombre de voisins kNN récupérés par vectorQuery. Bumpé de 50 à 200 pour
// alimenter un pool profond en amont du rerank sémantique Cohere (bead 9gf.11).
const VECTOR_K = 200;

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
  filters?: SearchFilters;
  top?: number;
}

/**
 * Candidat brut renvoyé par Azure AI Search : le document + son score hybride
 * (`@search.score`), sans aucun score de pertinence sémantique assigné.
 */
export type RawCandidate = SearchResult & { "@search.score": number };

/** Résultat de `retrieve()` : les candidats bruts + la requête Lucene utilisée. */
export interface RetrieveResult {
  candidates: RawCandidate[];
  facets?: Record<string, Array<{ value: any; count: number }>>;
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
  "@search.facets"?: Record<string, Array<{ value: any; count: number }>>;
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
 *
 * Les questions SOCIODÉMO sont exclues de la recherche. Ce sont les batteries
 * signalétiques standard (revenu, âge, scolarité, genre...) présentes dans
 * presque tous les sondages : elles matchent fort en sémantique sur beaucoup de
 * sujets sans jamais être ce qu'on cherche. Ex. « impôts riches » fait remonter
 * « Quel est votre revenu annuel ? », qui parle bien de richesse mais n'est
 * qu'un classificateur de répondant, pas une question de contenu. Les écarter
 * au retrieval plutôt qu'au scoring évite qu'elles occupent la fenêtre de
 * rerank au détriment de vraies questions.
 *
 * Elles restent accessibles par la vue détail d'un sondage (`/survey`), qui
 * n'utilise pas cette fonction.
 *
 * `is_sociodemo eq null` est conservé volontairement : un document dont le
 * drapeau manque ne doit pas disparaître silencieusement de la recherche.
 */
function buildFilter(filters?: SearchFilters): string {
  const clauses: string[] = [
    "doc_type eq 'question'",
    "(is_sociodemo eq false or is_sociodemo eq null)",
  ];

  if (filters) {
    if (filters.year_min != null) {
      clauses.push(`survey_year ge ${filters.year_min}`);
    }
    if (filters.year_max != null) {
      clauses.push(`survey_year le ${filters.year_max}`);
    }

    if (filters.pollsters && filters.pollsters.length > 0) {
      // search.in(pollster, 'Sondeur 1|Sondeur 2', '|')
      const joined = filters.pollsters
        .map((p) => p.replace(/'/g, "''"))
        .join("|");
      clauses.push(`search.in(pollster, '${joined}', '|')`);
    }

    if (filters.languages && filters.languages.length > 0) {
      const joined = filters.languages
        .map((l) => l.replace(/'/g, "''"))
        .join("|");
      clauses.push(`search.in(language, '${joined}', '|')`);
    }

    if (filters.themes && filters.themes.length > 0) {
      for (const theme of filters.themes) {
        const escaped = theme.replace(/'/g, "''");
        clauses.push(`themes/any(t: t eq '${escaped}')`);
      }
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
 *
 * `c.weight` n'est PAS lu ici et n'influence jamais la requête : c'est un champ
 * cosmétique affiché/éditable dans l'UI (`ConceptChips`) pour donner à
 * l'utilisateur un indice d'importance relative, rien d'autre. Le retrieval ne
 * pondère pas les groupes AND entre eux — chaque concept compte également.
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
        k: VECTOR_K,
        exhaustive: false,
        weight: CONTENT_VECTOR_WEIGHT,
      },
      {
        kind: "vector",
        vector,
        fields: "survey_vector",
        k: VECTOR_K,
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
  const facets = searchResult["@search.facets"];
  return { candidates, facets, luceneQuery };
}
