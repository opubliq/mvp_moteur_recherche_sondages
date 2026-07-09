// Données inventées pour le mockup UX. Aucune connexion à Azure.
// Structure volontairement proche de src/types.ts (SurveyParent + SearchResult).

export const CORPUS = {
  n_surveys: 12,
  n_questions: 2810,
};

// Thèmes du corpus (pour facettes + exploration)
export const THEMES = [
  { value: "Environnement", count: 412 },
  { value: "Transport", count: 388 },
  { value: "Sécurité publique", count: 301 },
  { value: "Logement", count: 274 },
  { value: "Services municipaux", count: 259 },
  { value: "Fiscalité", count: 198 },
  { value: "Culture & loisirs", count: 176 },
  { value: "Gouvernance", count: 143 },
];

const OPTS_SATISF = [
  { code: "1", label: "Très satisfait" },
  { code: "2", label: "Plutôt satisfait" },
  { code: "3", label: "Plutôt insatisfait" },
  { code: "4", label: "Très insatisfait" },
  { code: "9", label: "Ne sait pas" },
];
const OPTS_ACCORD = [
  { code: "1", label: "Tout à fait d'accord" },
  { code: "2", label: "Plutôt d'accord" },
  { code: "3", label: "Plutôt en désaccord" },
  { code: "4", label: "Tout à fait en désaccord" },
];
const OPTS_PRIORITE = [
  { code: "1", label: "Priorité élevée" },
  { code: "2", label: "Priorité moyenne" },
  { code: "3", label: "Priorité faible" },
];

// Distributions inventées (doivent sommer ~100)
export const SURVEYS = [
  {
    id: "s_2024_qc_env",
    survey_name: "Baromètre municipal — Environnement et qualité de vie",
    survey_year: 2024,
    survey_month: 5,
    pollster: "Léger",
    language: "FR",
    n_respondents: 1012,
    survey_description:
      "Sondage omnibus sur la perception des enjeux environnementaux et de la qualité de vie chez les résidents de la Ville de Québec.",
    themes: ["Environnement", "Services municipaux", "Transport"],
    top_concepts: [
      { value: "qualité de l'eau", count: 8 },
      { value: "collecte des déchets", count: 6 },
      { value: "espaces verts", count: 5 },
      { value: "pollution", count: 4 },
    ],
    questions: [
      {
        variable: "Q1", pertinence: "Exact", themes: ["Environnement"], is_sociodemo: false,
        question_text: "Dans quelle mesure êtes-vous satisfait de la qualité de l'eau potable dans votre quartier ?",
        response_options: OPTS_SATISF,
        dist: [34, 41, 14, 7, 4],
      },
      {
        variable: "Q2", pertinence: "Exact", themes: ["Environnement", "Services municipaux"], is_sociodemo: false,
        question_text: "Comment évaluez-vous la qualité du service de collecte des déchets et du recyclage ?",
        response_options: OPTS_SATISF,
        dist: [28, 45, 18, 6, 3],
      },
      {
        variable: "Q3", pertinence: "Partiel", themes: ["Environnement"], is_sociodemo: false,
        question_text: "Diriez-vous que la Ville en fait assez pour protéger les espaces verts et la canopée urbaine ?",
        response_options: OPTS_ACCORD,
        dist: [22, 38, 27, 13],
      },
      {
        variable: "Q4", pertinence: "Faible", themes: ["Transport"], is_sociodemo: false,
        question_text: "À quel point la circulation automobile nuit-elle à votre qualité de vie au quotidien ?",
        response_options: OPTS_ACCORD,
        dist: [31, 34, 22, 13],
      },
      {
        variable: "Q5open", pertinence: "Partiel", themes: ["Environnement"], is_sociodemo: false, is_open: true,
        question_text: "Selon vous, quel est le principal problème environnemental à Québec ? (question ouverte)",
        response_options: [],
        dist: [],
      },
      {
        variable: "AGE", pertinence: "Hors-sujet", themes: [], is_sociodemo: true, sociodemo_type: "âge",
        question_text: "Quel est votre groupe d'âge ?",
        response_options: [
          { code: "1", label: "18-34 ans" }, { code: "2", label: "35-54 ans" }, { code: "3", label: "55 ans +" },
        ],
        dist: [29, 38, 33],
      },
    ],
  },
  {
    id: "s_2023_qc_transport",
    survey_name: "Mobilité et transport en commun",
    survey_year: 2023,
    survey_month: 10,
    pollster: "SOM",
    language: "FR",
    n_respondents: 854,
    survey_description:
      "Étude sur les habitudes de déplacement et la perception du réseau de transport en commun dans la région de la Capitale-Nationale.",
    themes: ["Transport", "Environnement"],
    top_concepts: [
      { value: "transport en commun", count: 9 },
      { value: "pistes cyclables", count: 5 },
      { value: "stationnement", count: 4 },
    ],
    questions: [
      {
        variable: "T1", pertinence: "Exact", themes: ["Transport"], is_sociodemo: false,
        question_text: "Quel est votre niveau de satisfaction à l'égard du réseau d'autobus dans votre secteur ?",
        response_options: OPTS_SATISF,
        dist: [18, 39, 27, 12, 4],
      },
      {
        variable: "T2", pertinence: "Partiel", themes: ["Transport"], is_sociodemo: false,
        question_text: "Le développement des pistes cyclables devrait-il être une priorité pour la Ville ?",
        response_options: OPTS_PRIORITE,
        dist: [44, 33, 23],
      },
      {
        variable: "T3", pertinence: "Faible", themes: ["Transport"], is_sociodemo: false,
        question_text: "Trouvez-vous facilement du stationnement lorsque vous vous déplacez au centre-ville ?",
        response_options: OPTS_ACCORD,
        dist: [12, 24, 34, 30],
      },
    ],
  },
  {
    id: "s_2022_qc_secur",
    survey_name: "Sécurité publique et sentiment de sécurité",
    survey_year: 2022,
    survey_month: 3,
    pollster: "Léger",
    language: "FR",
    n_respondents: 1105,
    survey_description:
      "Perception de la sécurité, du travail des services de police et des enjeux de cohabitation sociale.",
    themes: ["Sécurité publique", "Gouvernance"],
    top_concepts: [
      { value: "sentiment de sécurité", count: 7 },
      { value: "police", count: 6 },
      { value: "itinérance", count: 3 },
    ],
    questions: [
      {
        variable: "S1", pertinence: "Faible", themes: ["Sécurité publique"], is_sociodemo: false,
        question_text: "Vous sentez-vous en sécurité lorsque vous marchez seul(e) le soir dans votre quartier ?",
        response_options: OPTS_ACCORD,
        dist: [41, 34, 17, 8],
      },
      {
        variable: "S2", pertinence: "Partiel", themes: ["Sécurité publique"], is_sociodemo: false,
        question_text: "Comment évaluez-vous le travail du Service de police de la Ville de Québec ?",
        response_options: OPTS_SATISF,
        dist: [23, 44, 21, 8, 4],
      },
    ],
  },
  {
    id: "s_2024_qc_logement",
    survey_name: "Logement et abordabilité",
    survey_year: 2024,
    survey_month: 2,
    pollster: "Pallas Data",
    language: "FR",
    n_respondents: 763,
    survey_description:
      "Enjeux liés au coût du logement, à l'accès à la propriété et à la crise locative dans la région.",
    themes: ["Logement", "Fiscalité"],
    top_concepts: [
      { value: "coût du logement", count: 6 },
      { value: "crise du logement", count: 4 },
      { value: "propriété", count: 3 },
    ],
    questions: [
      {
        variable: "L1", pertinence: "Faible", themes: ["Logement"], is_sociodemo: false,
        question_text: "À quel point le coût du logement est-il un enjeu préoccupant pour votre ménage ?",
        response_options: OPTS_ACCORD,
        dist: [48, 29, 15, 8],
      },
    ],
  },
];

// Concepts issus de la décomposition de la requête (mock GPT expansion)
export const DEMO_QUERY = "qualité de l'eau potable";
export const DEMO_CONCEPTS = [
  { orig: "qualité", syns: ["qualité", "état", "propreté"], qualifiers: [], weight: 0.3 },
  { orig: "eau", syns: ["eau", "aqueduc"], qualifiers: ["potable", "à boire", "buvable"], weight: 0.7 },
];

// Index rapide id -> survey
export function surveyById(id) {
  return SURVEYS.find((s) => s.id === id);
}
export function questionByVar(surveyId, variable) {
  const s = surveyById(surveyId);
  return s ? s.questions.find((q) => q.variable === variable) : null;
}

// Compte les pertinences (hors Hors-sujet) d'une liste de questions
export function relevanceCounts(questions) {
  const c = { Exact: 0, Partiel: 0, Faible: 0 };
  for (const q of questions) if (c[q.pertinence] != null) c[q.pertinence]++;
  return c;
}
