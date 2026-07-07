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
}


export interface SearchResponse {
  results: SearchResult[];
  count: number;
}

/** Filtres facette appliqués en AND côté serveur (`field eq value`). */
export interface SearchFilters {
  survey_year?: number;
  pollster?: string;
  language?: string;
}

/** Doc parent (doc_type=survey) renvoyé par la Netlify Function `/survey`. */
export interface SurveyParent {
  id: string;
  survey_id: string;
  survey_name: string;
  survey_year: number | null;
  pollster: string | null;
  language: string | null;
  n_respondents: number | null;
  tags: string[];
}

/** Contrat de la Netlify Function `/survey` (voir netlify/functions/survey.ts). */
export interface SurveyDetailResponse {
  survey: SurveyParent | null;
  questions: SearchResult[];
  count: number;
}
