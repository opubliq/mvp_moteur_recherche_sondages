import type { SearchFilters, SearchResponse, SurveyDetailResponse } from "./types";
import { MOCK_RESPONSE } from "./mock";

/**
 * Flag dev : si VITE_USE_MOCK=true, on renvoie une réponse mock au lieu
 * d'appeler la Netlify Function. Sert à valider le rendu quand l'index
 * Azure est vide. Désactivé par défaut.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/** Appelle la Netlify Function `/search`. */
export async function search(
  query: string,
  filters: SearchFilters,
  top = 30,
): Promise<SearchResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_RESPONSE;
  }

  const res = await fetch("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filters, top }),
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
