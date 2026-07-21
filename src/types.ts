export interface Concept {
  orig: string;
  syns: string[];
  qualifiers?: string[];
}

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
  /** Libellé court/propre authored (LLM), pour l'affichage. Fallback question_text. */
  display_label?: string | null;
  response_options: ResponseOption[];
  var_type: string | null;
  is_sociodemo: boolean;
  /**
   * Ordinalité des catégories (orthogonale à `var_type`) : true si les niveaux
   * ont un ordre intrinsèque (Likert, satisfaction, fréquence…) ou si `scale`.
   * L'ordre du gradient suit l'ordre du tableau `response_options`, pas les codes.
   */
  is_ordinal: boolean;
  sociodemo_type: string | null;
  concepts: string[];
  themes: string[];
  tags: string[];
  n_respondents: number | null;
  /** Score de pertinence sémantique Cohere Rerank (0-1), attaché par le rerank. */
  relevance_score?: number;
  /**
   * Score de pertinence affichable, 0-100 = `relevance_score` × 100 arrondi.
   *
   * ABSOLU : aucune normalisation par requête (pas de min-max, pas de rescale
   * sur le max de la requête). Un 40 veut dire la même chose d'une requête à
   * l'autre. Gradient CONTINU : il n'existe plus de palier Exact/Partiel/Faible
   * — aucun seuil ne les séparait proprement (6/14 requêtes au mieux sur le
   * golden), le chevauchement est assumé (bead 9gf.12).
   */
  score_pertinence?: number;
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

/* --- Microdonnées répondant : contrat de la Netlify Function `/microdata` --- */

/** Une catégorie d'une distribution univariée pondérée. */
export interface DistributionRow {
  target_code: number | string;
  weighted_n: number;
  raw_n: number;
  share: number; // 0..1
}

/** Une cellule d'un crosstab (part normalisée PAR groupe de dimension). */
export interface CrosstabRow {
  dim_code: number | string;
  target_code: number | string;
  weighted_n: number;
  raw_n: number;
  col_share: number; // 0..1, somme à 1 par dim_code
}

/** Moyenne pondérée globale d'une cible numérique. */
export interface MeanRow {
  mean: number;
  min: number;
  max: number;
  weighted_n: number;
  raw_n: number;
}

/** Moyenne pondérée par groupe de dimension. */
export interface MeanByGroupRow {
  dim_code: number | string;
  mean: number;
  weighted_n: number;
  raw_n: number;
}

export type MicrodataMode = "distribution" | "crosstab" | "mean" | "mean_by_group";

export interface MicrodataResponse<Row = Record<string, number | string>> {
  survey_id: string;
  target: string;
  dim: string | null;
  mode: MicrodataMode;
  filters: { var: string; codes: (string | number)[] }[];
  row_count: number;
  rows: Row[];
}

export interface MicrodataQuery {
  surveyId: string;
  target: string;
  dim?: string;
  filters?: { var: string; codes: (string | number)[] }[];
  agg?: "count" | "mean";
  /** Codes de la cible à exclure (refus/NSP) — pour des moyennes sensées. */
  exclude?: (string | number)[];
}
