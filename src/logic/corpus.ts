/**
 * Requêtes de catalogue Azure AI Search — module partagé.
 *
 * Extrait la partie « lecture du catalogue » commune à plusieurs Netlify
 * Functions (/survey, /surveys, /themes) pour la réutiliser SANS la réimplémenter
 * dans l'orchestrateur agent (`src/logic/agent.ts`). Ce sont des requêtes OData
 * de filtrage/facettage — aucune logique métier (pondération, rerank, whitelist)
 * ne vit ici : celle-là reste dans `retrieve.ts` / `rerank.ts` / `microdata-core`.
 *
 * `/survey` délègue désormais à `getSurveyCatalog` (source de vérité unique du
 * mapping code→label dont l'agent a besoin). `/surveys` et `/themes` conservent
 * leur enrichissement propre au UI (concepts dominants par sondage, mode browse)
 * et ne délèguent pas ; les helpers `listSurveys`/`listThemeFacets` d'ici en
 * fournissent la version allégée dont l'agent se sert.
 *
 * Les clés/endpoints Azure sont INJECTÉS (`CorpusEnv`), jamais lus globalement,
 * pour rester testable hors runtime Netlify — même patron que `retrieve.ts`.
 */

import { mergeFacets } from "./retrieve";
import { PUBLIC_QUESTIONS_INDEX } from "./tenancy";

const SEARCH_API_VERSION = "2024-07-01";
const SEARCH_TOP = 1000;

/** Endpoint + clé QUERY (read-only) Azure AI Search, injectés explicitement. */
export interface CorpusEnv {
  SEARCH_ENDPOINT: string;
  SEARCH_QUERY_KEY: string;
}

/** Échappe une valeur pour un littéral chaîne OData ('' = apostrophe). */
function odataEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function searchUrl(env: CorpusEnv, indexName: string): string {
  const endpoint = (env.SEARCH_ENDPOINT ?? "").replace(/\/$/, "");
  return `${endpoint}/indexes/${indexName}/docs/search?api-version=${SEARCH_API_VERSION}`;
}

async function aiSearch(env: CorpusEnv, indexName: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(searchUrl(env, indexName), {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": env.SEARCH_QUERY_KEY ?? "" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`AI Search error ${res.status} (index ${indexName}): ${await res.text()}`);
  }
  return res.json();
}

/**
 * Exécute la même requête sur chaque index accessible et concatène les
 * `value` — les `id`/`survey_id` sont disjoints entre index par construction
 * (chaque sondage n'appartient qu'à un seul index), aucune déduplication
 * n'est donc nécessaire.
 *
 * Attache `is_private` à chaque doc (f3i.18) — même principe que
 * `retrieve.ts::searchOneIndex` : c'est ici, avant le `flatMap` qui fusionne
 * tous les index, que la provenance est encore connue.
 */
async function aiSearchAll(
  env: CorpusEnv,
  indexes: string[],
  payload: Record<string, unknown>,
): Promise<{ value: any[] }> {
  const perIndex = await Promise.all(
    indexes.map(async (indexName) => {
      const data = await aiSearch(env, indexName, payload);
      const isPrivate = indexName !== PUBLIC_QUESTIONS_INDEX;
      const value = ((data.value ?? []) as Record<string, unknown>[]).map((doc) => ({
        ...doc,
        is_private: isPrivate,
      }));
      return { ...data, value };
    }),
  );
  return { value: perIndex.flatMap((d) => d.value ?? []) };
}

// Champs renvoyés par /survey (mêmes que search.ts, sans content_vector ;
// + doc_type pour partitionner parent / children).
const SURVEY_SELECT_FIELDS = [
  "id",
  "doc_type",
  "survey_id",
  "survey_name",
  "survey_description",
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
].join(",");

const SURVEYS_SELECT_FIELDS = [
  "id",
  "survey_id",
  "survey_name",
  "survey_year",
  "survey_month",
  "pollster",
  "language",
  "n_respondents",
  "survey_description",
  "tags",
].join(",");

interface SurveyDoc {
  id: string;
  doc_type?: string;
  survey_id: string;
  survey_name: string;
  variable?: string;
  [key: string]: unknown;
}

/**
 * Catalogue exhaustif d'un sondage : doc parent + toutes ses questions, triées
 * par variable. Une seule requête (filtre `survey_id`), partitionnée par
 * `doc_type` côté serveur. C'est CE qui donne à l'agent les `response_options`
 * {code,label} et `sociodemo_type` de chaque variable — donc le mapping d'un
 * sous-groupe exprimé en langage naturel sur les CODES RAW du sondage.
 */
export async function getSurveyCatalog(
  surveyId: string,
  env: CorpusEnv,
  indexes: string[] = [PUBLIC_QUESTIONS_INDEX],
): Promise<{ survey: SurveyDoc | null; questions: SurveyDoc[]; count: number } | null> {
  const filter = `survey_id eq '${odataEscape(surveyId)}'`;
  const data = (await aiSearchAll(env, indexes, {
    search: "*",
    filter,
    select: SURVEY_SELECT_FIELDS,
    top: SEARCH_TOP,
  })) as { value?: SurveyDoc[] };

  const docs = data.value ?? [];
  const survey = docs.find((d) => d.doc_type === "survey") ?? null;
  const questions = docs
    .filter((d) => d.doc_type === "question")
    .sort((a, b) =>
      (a.variable ?? "").localeCompare(b.variable ?? "", undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

  if (!survey && questions.length === 0) return null;
  return { survey, questions, count: questions.length };
}

/**
 * Liste macro des sondages (docs `survey`) + total de questions du corpus.
 * Version ALLÉGÉE pour l'agent : sans les concepts dominants par sondage que
 * /surveys calcule pour le UI (N+1 facettes coûteuses, inutiles à l'orchestration).
 */
export async function listSurveys(
  env: CorpusEnv,
  indexes: string[] = [PUBLIC_QUESTIONS_INDEX],
): Promise<{ surveys: SurveyDoc[]; count: number; total_questions: number }> {
  const data = (await aiSearchAll(env, indexes, {
    search: "*",
    filter: "doc_type eq 'survey'",
    select: SURVEYS_SELECT_FIELDS,
    top: SEARCH_TOP,
    orderby: "survey_year desc, survey_name asc",
  })) as { value?: SurveyDoc[] };
  const surveys = data.value ?? [];

  let totalQuestions = 0;
  try {
    const countData = await Promise.all(
      indexes.map((indexName) =>
        aiSearch(env, indexName, {
          search: "*",
          filter: "doc_type eq 'question'",
          top: 0,
          count: true,
        }),
      ),
    );
    totalQuestions = countData.reduce((sum, d) => sum + ((d["@odata.count"] as number) ?? 0), 0);
  } catch {
    // Non bloquant : le total n'est qu'informatif.
  }

  return { surveys, count: surveys.length, total_questions: totalQuestions };
}

/**
 * Facettes thématiques du corpus : nombre de questions par thème et par concept,
 * triées décroissant. Même requête que le mode facettes de /themes.
 */
export async function listThemeFacets(
  env: CorpusEnv,
  indexes: string[] = [PUBLIC_QUESTIONS_INDEX],
): Promise<{ themes: { value: string; count: number }[]; concepts: { value: string; count: number }[] }> {
  const FACET_COUNT = 300;
  const perIndex = await Promise.all(
    indexes.map(
      (indexName) =>
        aiSearch(env, indexName, {
          search: "*",
          filter: "doc_type eq 'question'",
          top: 0,
          facets: [`themes,count:${FACET_COUNT}`, `concepts,count:${FACET_COUNT}`],
        }) as Promise<{ "@search.facets"?: Record<string, { value: string; count: number }[]> }>,
    ),
  );

  const facets = mergeFacets(perIndex.map((d) => d["@search.facets"])) ?? {};
  const map = (arr: { value: string; count: number }[] | undefined) =>
    (arr ?? []).map((f) => ({ value: f.value, count: f.count }));
  return { themes: map(facets.themes), concepts: map(facets.concepts) };
}
