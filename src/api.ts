import type { Concept, ConceptCount, MicrodataQuery, MicrodataResponse, SearchFilters, SearchResponse, SearchResult, SurveyDetailResponse, SurveyParent } from "./types";

/** Appelle la Netlify Function `/surveys` : liste de tous les sondages. */
export async function fetchAllSurveys(): Promise<{ surveys: SurveyParent[]; count: number; total_questions: number }> {
  const res = await fetch("/surveys");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement des sondages échoué (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as { surveys: SurveyParent[]; count: number; total_questions: number };
}

/** Appelle la Netlify Function `/decompose`. */
export interface DecomposeResponse {
  concepts: Concept[];
  /** Reformulation pour le reranker ; vide = retomber sur la requête brute. */
  rerankQuery: string;
}

export async function decompose(query: string): Promise<DecomposeResponse> {
  const res = await fetch("/decompose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Décomposition échouée (${res.status}): ${body || res.statusText}`);
  }

  const data = await res.json();
  return { concepts: data.concepts, rerankQuery: data.rerank_query ?? "" };
}

/** Appelle la Netlify Function `/search`. */
export async function search(
  query: string,
  filters: SearchFilters,
  top = 30,
  concepts?: Concept[],
  rerank = false,
  rerankQuery?: string,
): Promise<SearchResponse> {
  const res = await fetch("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filters, top, concepts, rerank, rerank_query: rerankQuery }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Recherche échouée (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as SearchResponse;
}

/** Appelle la Netlify Function `/survey` : doc parent + toutes ses questions. */
export async function fetchSurvey(surveyId: string): Promise<SurveyDetailResponse> {
  const res = await fetch(`/survey?survey_id=${encodeURIComponent(surveyId)}`);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement du sondage échoué (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as SurveyDetailResponse;
}

/** Levée quand un sondage n'a pas de microdonnées (Parquet absent, 404). */
export class NoMicrodataError extends Error {}

/**
 * Appelle la Netlify Function `/microdata` : distribution / crosstab / moyenne
 * pondérée sur le Parquet répondant d'un sondage. Renvoie les CODES bruts (le
 * mapping code→label se fait côté composant via response_options).
 * Lève `NoMicrodataError` si le sondage n'a pas de Parquet (404).
 */
export async function fetchMicrodata<Row = Record<string, number | string>>(
  query: MicrodataQuery,
): Promise<MicrodataResponse<Row>> {
  const body = {
    survey_id: query.surveyId,
    target: query.target,
    dim: query.dim,
    filters: query.filters ?? [],
    agg: query.agg ?? "count",
    exclude: query.exclude ?? [],
  };
  const res = await fetch("/microdata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    throw new NoMicrodataError(`Aucune microdonnée pour ${query.surveyId}`);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Microdonnées échouées (${res.status}): ${txt || res.statusText}`);
  }
  return (await res.json()) as MicrodataResponse<Row>;
}

/**
 * Appelle `/themes` (sans param) : facettes thèmes + concepts du corpus,
 * chacune triée par nombre de questions décroissant.
 */
export async function fetchThemeFacets(): Promise<{ themes: ConceptCount[]; concepts: ConceptCount[] }> {
  const res = await fetch("/themes");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement des thèmes échoué (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as { themes: ConceptCount[]; concepts: ConceptCount[] };
}

/**
 * Appelle `/themes?theme=…` ou `?concept=…` : questions taggées, cross-sondage.
 * `year` optionnel pour restreindre à une année.
 */
export async function fetchQuestionsByTag(
  dim: "theme" | "concept",
  value: string,
  year?: number,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ [dim]: value });
  if (year != null) params.set("year", String(year));
  const res = await fetch(`/themes?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement des questions échoué (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as { results: SearchResult[] };
  return data.results;
}
