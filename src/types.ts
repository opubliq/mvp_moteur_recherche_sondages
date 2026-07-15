export interface Concept {
  orig: string;
  syns: string[];
  qualifiers?: string[];
  weight: number;
}

/** Contrat de la Netlify Function `/search` (voir netlify/functions/search.ts). */

export interface ResponseOption {
  code: string;
  label: string;
}

export type Pertinence = 'Exact' | 'Partiel' | 'Faible' | 'Hors-sujet';

export interface SearchResult {
  id: string;
  survey_id: string;
  survey_name: string;
  survey_year: number | null;
  pollster: string | null;
  language: string | null;
  variable: string;
  question_text: string;
  response_options: ResponseOption[];
  var_type: string | null;
  is_sociodemo: boolean;
  sociodemo_type: string | null;
  concepts: string[];
  themes: string[];
  tags: string[];
  n_respondents: number | null;
  pertinence?: Pertinence;
  score_couverture?: number;
  matched_concepts?: string[];
  /** Score de pertinence sémantique Cohere Rerank (0-1), attaché par le rerank. */
  relevance_score?: number;
  /** Question ouverte (réponse libre) — dérivé de var_type quand présent. */
  is_open?: boolean;
}


export interface FacetEntry {
  value: string;
  count: number;
}

export interface SearchFacets {
  years: FacetEntry[];
  pollsters: FacetEntry[];
  languages: FacetEntry[];
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
  facets?: SearchFacets;
  luceneQuery?: string;
}

/** Filtres facette appliqués en AND côté serveur. */
export interface SearchFilters {
  year_min?: number;
  year_max?: number;
  pollsters?: string[];
  languages?: string[];
  themes?: string[];
}

/** Doc parent (doc_type=survey) renvoyé par la Netlify Function `/survey`. */
/** Un concept dominant d'un sondage avec sa fréquence (nombre de questions). */
export interface ConceptCount {
  value: string;
  count: number;
}

export interface SurveyParent {
  id: string;
  survey_id: string;
  survey_name: string;
  survey_year: number | null;
  survey_month?: number | null;
  pollster: string | null;
  language: string | null;
  n_respondents: number | null;
  survey_description?: string | null;
  tags: string[];
  /** Concepts dominants (facette `concepts`), triés par fréquence décroissante. */
  top_concepts?: ConceptCount[];
}

/** Contrat de la Netlify Function `/survey` (voir netlify/functions/survey.ts). */
export interface SurveyDetailResponse {
  survey: SurveyParent | null;
  questions: SearchResult[];
  count: number;
}
