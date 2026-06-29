/** Contrat de la Netlify Function `/search` (voir netlify/functions/search.ts). */

export interface ResponseOption {
  code: string;
  label: string;
}

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
