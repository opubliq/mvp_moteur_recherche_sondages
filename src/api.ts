import type { Concept, ConceptCount, MicrodataQuery, MicrodataResponse, SearchFilters, SearchResponse, SearchResult, SurveyDetailResponse, SurveyParent, VerbatimsResponse } from "./types";
import type { AnnotateResult, AnnotationItem, AnnotationSpec } from "./logic/annotate";
import type { ScanItem, ScanResult } from "./logic/scan";

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
  rerankQuery?: string,
): Promise<SearchResponse> {
  const res = await fetch("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filters, top, concepts, rerank_query: rerankQuery }),
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
    ...(query.annotation ? { annotation: query.annotation } : {}),
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
 * Appelle `/verbatims` : les réponses libres d'UNE question ouverte.
 *
 * Sans `query` → parcours paginé (aucun scoring, aucun appel Cohere).
 * Avec `query` → BM25 + rerank Cohere, les meilleures citations d'abord.
 */
export async function fetchVerbatims(params: {
  surveyId: string;
  variable: string;
  query?: string;
  top?: number;
  skip?: number;
}): Promise<VerbatimsResponse> {
  const res = await fetch("/verbatims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      survey_id: params.surveyId,
      variable: params.variable,
      query: params.query ?? "",
      top: params.top,
      skip: params.skip,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement des réponses échoué (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as VerbatimsResponse;
}

/** Quota du modèle atteint : le run doit attendre `retryAfterMs`, pas abandonner. */
export class AnnotateRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Quota du modèle atteint");
    this.name = "AnnotateRateLimitError";
  }
}

/**
 * Appelle `/annotate` : annote UN paquet de réponses (≤ 25, cf.
 * `MAX_ITEMS_PER_CALL`). Le découpage et la cadence sont l'affaire de
 * `runAnnotation` (src/lib/annotationRun.ts), pas de cette fonction.
 */
export async function annotateChunk(params: {
  spec: AnnotationSpec;
  items: AnnotationItem[];
  withReason?: boolean;
  signal?: AbortSignal;
}): Promise<AnnotateResult> {
  const res = await fetch("/annotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property: params.spec.property,
      options: params.spec.options,
      question_text: params.spec.questionText,
      items: params.items,
      with_reason: params.withReason ?? false,
    }),
    signal: params.signal,
  });

  if (res.status === 429) {
    const data = (await res.json().catch(() => ({}))) as { retry_after_ms?: number };
    throw new AnnotateRateLimitError(data.retry_after_ms ?? 20000);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Annotation échouée (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as AnnotateResult;
}

/** Quota du modèle atteint pendant un scan : réessayer plus tard, pas boucler. */
export class ScanRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Quota du modèle atteint");
    this.name = "ScanRateLimitError";
  }
}

/**
 * Appelle `/scan` : propose une grille d'annotation (propriété + étiquettes) à
 * partir d'un échantillon de réponses. Un seul appel — pas d'orchestration,
 * contrairement à `annotateChunk`.
 */
export async function scanQuestion(params: {
  questionText: string;
  items: ScanItem[];
  signal?: AbortSignal;
}): Promise<ScanResult> {
  const res = await fetch("/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question_text: params.questionText,
      items: params.items,
    }),
    signal: params.signal,
  });

  if (res.status === 429) {
    const data = (await res.json().catch(() => ({}))) as { retry_after_ms?: number };
    throw new ScanRateLimitError(data.retry_after_ms ?? 20000);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scan échoué (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as ScanResult;
}

/**
 * Appelle `/open-questions` : toutes les questions à réponses libres du corpus,
 * cross-sondage. Sert le sélecteur de l'espace « Réponses libres ».
 */
export async function fetchOpenQuestions(): Promise<SearchResult[]> {
  const res = await fetch("/open-questions");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement des questions ouvertes échoué (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as { results: SearchResult[] };
  return data.results;
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
