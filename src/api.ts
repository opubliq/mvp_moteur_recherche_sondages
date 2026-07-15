import type { Concept, ConceptCount, SearchFilters, SearchResponse, SearchResult, SurveyDetailResponse, SurveyParent } from "./types";
import { MOCK_RESPONSE } from "./mock";

/**
 * Flag dev : si VITE_USE_MOCK=true, on renvoie une réponse mock au lieu
 * d'appeler la Netlify Function. Sert à valider le rendu quand l'index
 * Azure est vide. Désactivé par défaut.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/** Appelle la Netlify Function `/surveys` : liste de tous les sondages. */
export async function fetchAllSurveys(): Promise<{ surveys: SurveyParent[]; count: number; total_questions: number }> {
  if (USE_MOCK) {
    const surveyIds = new Set(MOCK_RESPONSE.results.map((r) => r.survey_id));
    const surveys: SurveyParent[] = Array.from(surveyIds).map((id) => {
      const first = MOCK_RESPONSE.results.find((r) => r.survey_id === id)!;
      return {
        id: first.survey_id,
        survey_id: first.survey_id,
        survey_name: first.survey_name,
        survey_year: first.survey_year,
        pollster: first.pollster,
        language: first.language,
        n_respondents: first.n_respondents,
        tags: first.tags,
      };
    });
    return { surveys, count: surveys.length, total_questions: MOCK_RESPONSE.results.length };
  }

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
  if (USE_MOCK) return { concepts: [], rerankQuery: "" };

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
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_RESPONSE;
  }

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
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const questions = MOCK_RESPONSE.results.filter((r) => r.survey_id === surveyId);
    const first = questions[0];
    return {
      survey: first
        ? {
            id: first.survey_id,
            survey_id: first.survey_id,
            survey_name: first.survey_name,
            survey_year: first.survey_year,
            pollster: first.pollster,
            language: first.language,
            n_respondents: first.n_respondents,
            tags: first.tags,
          }
        : null,
      questions,
      count: questions.length,
    };
  }

  const res = await fetch(`/survey?survey_id=${encodeURIComponent(surveyId)}`);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement du sondage échoué (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as SurveyDetailResponse;
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
