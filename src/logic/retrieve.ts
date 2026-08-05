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
import { logUsage, usageIdentity, type UsageContext } from "./costlog";
import { PUBLIC_QUESTIONS_INDEX } from "./tenancy";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

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
  /**
   * Identité d'usage (client_id + request_id) à attacher à l'appel embedding
   * (epic 97r). Fournie par le handler, ou par un appelant qui orchestre
   * plusieurs opérations sous une même requête (ex. la boucle agent) pour que
   * l'agrégation par requête somme boucle + outils. Si absente, la ligne sort en
   * `client_id: "unknown"` avec un request_id local (rétrocompatible).
   */
  usage?: UsageContext;
  /**
   * Index Azure AI Search à interroger, résolus côté serveur par
   * `resolveAccessibleQuestionIndexes` (f3i.11) — jamais fournis par le
   * client. Par défaut : `[survey-questions]` (public seul, rétrocompatible
   * avec le harness offline et les appelants qui ne gèrent pas le multi-tenant).
   * Plusieurs index sont interrogés en parallèle et fusionnés (candidats
   * concaténés, facettes sommées par valeur).
   */
  indexes?: string[];
}

/**
 * Candidat brut renvoyé par Azure AI Search : le document + son score hybride
 * (`@search.score`), sans aucun score de pertinence sémantique assigné.
 *
 * `is_private` (f3i.18) : provenance résolue côté serveur — `true` quand le
 * document vient d'un index privé tenant (nom différent de l'index public),
 * `false` sinon. Attaché ici, au moment où on sait de quel index chaque
 * candidat provient (avant le `flatMap` qui fusionne tous les index en un seul
 * tableau) — c'est le SEUL endroit où cette info est encore disponible. Le
 * front ne doit JAMAIS la déduire lui-même (ex. via survey_id) : il l'affiche
 * telle quelle.
 */
export type RawCandidate = SearchResult & { "@search.score": number; is_private: boolean };

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
  usage?: { prompt_tokens: number };
}

interface AzureSearchResponse {
  value: any[];
  "@odata.count"?: number;
  "@search.facets"?: Record<string, Array<{ value: any; count: number }>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Génère l'embedding d'un texte via Azure OpenAI REST API.
 *
 * @param usage identité d'usage (client_id + request_id) à attacher à la ligne
 *   costlog (epic 97r, ticket 97r.5). Optionnelle : fournie par le handler ou un
 *   orchestrateur (ex. boucle agent) pour sommer boucle + outils sous une même
 *   requête ; sinon `unknown` + id local (rétrocompatible).
 */
async function getEmbedding(text: string, env: RetrieveEnv, usage?: UsageContext): Promise<number[]> {
  const endpoint = (env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = env.AOAI_EMBED_DEPLOYMENT ?? "";
  const key = env.AOAI_KEY ?? "";

  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${AOAI_API_VERSION}`;

  const identity = usageIdentity(usage);
  const startedAt = Date.now();
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

  // Usage & coût marginal (epic 97r) — best-effort, purement additif.
  // Un embedding n'a pas de tokens de complétion.
  logUsage({
    ...identity,
    op: "embed",
    prompt_tokens: json.usage?.prompt_tokens,
    latency_ms: Date.now() - startedAt,
  });

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
 * Le retrieval ne pondère pas les groupes AND entre eux — chaque concept compte
 * également.
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
  const { filters, top = 10, usage } = options;
  const clampedTop = Math.min(Math.max(1, Number(top) || 10), MAX_TOP);

  // -----------------------------------------------------------------------
  // Étape 1 : embedding de la requête
  // -----------------------------------------------------------------------
  let vector: number[];
  try {
    vector = await getEmbedding(trimmedQuery, env, usage);
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
  // Étape 2 : recherche hybride Azure AI Search — fan-out multi-index (f3i.11)
  // -----------------------------------------------------------------------
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
      "display_label",
      "response_options",
      "var_type",
      "text_kind",
      "is_sociodemo",
      "is_ordinal",
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

  const indexes = options.indexes && options.indexes.length > 0 ? options.indexes : [PUBLIC_QUESTIONS_INDEX];
  console.log(
    `[retrieve] AI Search — index(es)=${indexes.join(",")} query="${luceneQuery}" filter="${filter}" top=${searchPayload.top}`,
  );

  const perIndex = await Promise.all(indexes.map((indexName) => searchOneIndex(indexName, searchPayload, env)));

  const candidates = perIndex.flatMap((r) => r.candidates);
  const facets = mergeFacets(perIndex.map((r) => r.facets));
  return { candidates, facets, luceneQuery };
}

/** Recherche hybride sur UN index Azure AI Search — appelé en parallèle par index accessible. */
async function searchOneIndex(
  indexName: string,
  searchPayload: Record<string, unknown>,
  env: RetrieveEnv,
): Promise<{ candidates: RawCandidate[]; facets?: AzureSearchResponse["@search.facets"] }> {
  const searchEndpoint = (env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  const searchKey = env.SEARCH_QUERY_KEY ?? ""; // clé QUERY (read-only)
  const searchUrl = `${searchEndpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;

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
      throw new Error(`AI Search error ${res.status} (index ${indexName}): ${errBody}`);
    }

    searchResult = (await res.json()) as AzureSearchResponse;
  } catch (err) {
    console.error(`[retrieve] AI Search request failed (index ${indexName}):`, err);
    throw new RetrieveError("search", err instanceof Error ? err.message : String(err));
  }

  // Provenance (f3i.18) : attachée ici, avant la fusion multi-index — c'est le
  // seul point du pipeline où on sait encore de quel index vient chaque doc.
  const isPrivate = indexName !== PUBLIC_QUESTIONS_INDEX;
  const candidates = ((searchResult.value ?? []) as RawCandidate[]).map((c) => ({
    ...c,
    is_private: isPrivate,
  }));

  return {
    candidates,
    facets: searchResult["@search.facets"],
  };
}

/**
 * Somme les comptes de facette par valeur, à travers les index interrogés.
 * Exporté : réutilisé par d'autres endpoints multi-index (ex. `/themes`).
 */
export function mergeFacets(
  perIndexFacets: Array<AzureSearchResponse["@search.facets"] | undefined>,
): AzureSearchResponse["@search.facets"] | undefined {
  const present = perIndexFacets.filter((f): f is NonNullable<typeof f> => !!f);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];

  const merged: Record<string, Map<unknown, number>> = {};
  for (const facetSet of present) {
    for (const [field, entries] of Object.entries(facetSet)) {
      const byValue = (merged[field] ??= new Map());
      for (const { value, count } of entries) {
        byValue.set(value, (byValue.get(value) ?? 0) + count);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(merged).map(([field, byValue]) => [
      field,
      Array.from(byValue, ([value, count]) => ({ value, count })),
    ]),
  );
}
