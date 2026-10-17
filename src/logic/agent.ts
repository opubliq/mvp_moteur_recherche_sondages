/**
 * Orchestrateur agent analytique (bead aat.1) — module partagé.
 *
 * Une BOUCLE tool-use (function calling) contre le endpoint chat Azure OpenAI
 * déjà en place (`AOAI_CHAT_DEPLOYMENT`, le même que le LLM judge de /search et
 * l'annotation). PAS de LangChain, PAS de nouveau fournisseur. Le LLM décide
 * quel outil appeler et rédige la réponse ; il ne CALCULE rien — c'est
 * /microdata (core.ts) qui calcule, sous pondération et erreur-type de Kish.
 *
 * Les outils WRAPPENT les fonctions existantes, sans réimplémenter la logique :
 *   - search_questions → retrieve() + rerankCandidates() (recherche hybride + Cohere)
 *   - get_survey       → getSurveyCatalog() (catalogue, codes↔labels, sociodemo)
 *   - crosstab         → handleMicrodataQuery() (distribution/crosstab pondéré)
 *   - list_surveys     → listSurveys() + fetchManifest() (flag has_microdata)
 *   - list_themes      → listThemeFacets()
 *
 * BUDGET DE TEMPS. Les fonctions Netlify synchrones sont plafonnées (~10 s par
 * défaut). Une chaîne d'outils (LLM ↔ tool ↔ LLM…) dépasse facilement ce budget :
 * chaque appel AOAI d'un modèle *reasoning* coûte quelques secondes, chaque
 * crosstab DuckDB aussi. En pratique le mode synchrone ne tient qu'un ou deux
 * allers-retours. Le streaming / découpage (rendre la réponse au fil de l'eau,
 * ou déporter la boucle) relève de aat.3 ; ici on borne la boucle
 * (`MAX_ITERATIONS`, `deadlineMs`) et on documente la limite. Les constantes
 * sont réglables ; `netlify dev` a un timeout plus permissif, ce qui rend la
 * boucle testable en local.
 *
 * La clé AOAI (et la clé de stockage) ne quittent JAMAIS le serveur : cette
 * boucle tourne côté fonction, le client ne voit que le fil de messages.
 */

import type { Concept, SearchFilters } from "../types";
import { retrieve, RetrieveError, type RetrieveEnv } from "./retrieve";
import { rerankCandidates, RerankError, type RerankEnv } from "./rerank";
import { logUsage, usageIdentity, type UsageContext } from "./costlog";
import {
  getSurveyCatalog,
  listSurveys,
  listThemeFacets,
  type CorpusEnv,
} from "./corpus";
import { PUBLIC_QUESTIONS_INDEX } from "./tenancy";

// Les micro-données (crosstab pondéré + manifest) vivent dans le CŒUR PORTABLE
// `netlify/functions/microdata-core/core.ts`, qui dépend de Node (DuckDB natif,
// node:crypto). L'importer ICI (fichier `src/`, typé sous lib DOM sans @types/node)
// ferait échouer le typecheck de l'app. On l'INJECTE donc via `MicrodataProvider`,
// que le handler Netlify (côté Node) construit à partir de core.ts. Même esprit
// que l'injection de `env` et de `chat` : le module reste testable hors runtime.

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Route Chat Completions Azure OpenAI (gpt-5-mini, cf. src/logic/annotate.ts). */
const AOAI_API_VERSION = "2024-12-01-preview";

/**
 * Effort de raisonnement du modèle. L'orchestration (choisir un outil, décider
 * de poser une question de clarification, enchaîner) demande un peu plus que le
 * simple rangement de l'annotation ("minimal"). "low" est un compromis coût /
 * qualité ; réglable si le rendu final (aat.3) exige davantage.
 */
const AGENT_REASONING_EFFORT = "low";

/** Plafond d'itérations de la boucle (un tour = un appel AOAI + ses outils). */
const MAX_ITERATIONS = 8;

/**
 * Budget mural de la boucle. Volontairement au-dessus des 10 s d'une fonction
 * Netlify synchrone : la plateforme tuera la requête avant, mais en local
 * (`netlify dev`, budget plus large) la boucle peut aller au bout. Passé ce
 * délai, on demande une réponse finale SANS outils plutôt que d'enchaîner.
 */
const DEFAULT_DEADLINE_MS = 40000;

/** Plafond de tokens de sortie par appel (raisonnement compris). */
const MAX_COMPLETION_TOKENS = 4000;

/** Résultats de recherche renvoyés au modèle par appel (borne les tokens). */
const SEARCH_TOOL_TOP = 12;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Endpoints/clés dont la boucle a besoin CÔTÉ src, injectés explicitement.
 *  (Le stockage micro-données est fourni séparément via `MicrodataProvider`.) */
export interface AgentEnv {
  // Chat (orchestrateur)
  AOAI_ENDPOINT: string;
  AOAI_KEY: string;
  AOAI_CHAT_DEPLOYMENT: string;
  /** Déploiement dédié à l'orchestrateur (bead 9ou.13, gpt-5.5) ; repli sur
   *  AOAI_CHAT_DEPLOYMENT, partagé avec scan/annotate/judge qui restent sur gpt-5-mini. */
  AGENT_CHAT_DEPLOYMENT?: string;
  // Recherche hybride + embedding (search_questions)
  SEARCH_ENDPOINT: string;
  SEARCH_QUERY_KEY: string;
  AOAI_EMBED_DEPLOYMENT: string;
  // Rerank Cohere (search_questions)
  COHERE_RERANK_ENDPOINT: string;
  COHERE_RERANK_DEPLOYMENT: string;
  COHERE_RERANK_KEY: string;
}

/** Paramètres de crosstab (miroir de MicrodataParams de core.ts, sans y coupler src). */
export interface CrosstabParams {
  survey_id: string;
  target: string;
  dim?: string;
  filters?: { var: string; codes: (string | number)[] }[];
  agg?: "count" | "mean";
  exclude?: (string | number)[];
}

/** Manifest allégé : seuls les survey_id calculables importent au garde-fou. */
export interface ManifestLike {
  surveys: { survey_id: string }[];
}

/**
 * Accès aux micro-données, INJECTÉ par le handler Netlify depuis le cœur
 * portable (`handleMicrodataQuery`, `fetchManifest`). `crosstab` peut lever une
 * erreur métier (ex. MicrodataError) : `executeTool` la capture et la renvoie au
 * modèle comme `{ error }` plutôt que de faire échouer la boucle.
 */
export interface MicrodataProvider {
  crosstab(params: CrosstabParams): Promise<unknown>;
  manifest(): Promise<ManifestLike>;
}

/** Un message du fil, format Chat Completions (sous-ensemble utilisé). */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface AoaiChatResponse {
  choices: Array<{
    message: { role: "assistant"; content: string | null; tool_calls?: ToolCall[] };
    finish_reason?: string;
  }>;
  /**
   * Consommation de tokens du tour (epic 97r). Le system prompt + les schémas
   * d'outils sont repayés à CHAQUE tour, donc le coût agent est proportionnel au
   * nombre de tours : d'où le comptage par tour (op:"agent_turn").
   *
   * `prompt_tokens_details.cached_tokens` est le levier : ce sont justement ces
   * tokens répétés qu'Azure peut servir au tarif caché (1/10). Voir
   * `UsageRecord.cached_tokens`.
   */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

/** Trace d'un appel d'outil, pour le debug et le futur rendu (aat.3). */
export interface ToolTrace {
  tool: string;
  args: unknown;
  ok: boolean;
  error?: string;
}

export interface AgentResult {
  /** Réponse finale de l'assistant (texte). Peut être une question de clarification. */
  message: string;
  /** Fil complet (system exclu), pour poursuivre la conversation au tour suivant. */
  messages: ChatMessage[];
  /** Journal des outils appelés dans l'ordre. */
  trace: ToolTrace[];
  iterations: number;
  stopped_reason: "final" | "max_iterations" | "deadline";
}

/**
 * Événements émis au fil de la boucle par `runAgentStream` (bead aat.4).
 *
 * Canal VOLONTAIREMENT transport-agnostique : la boucle `yield` ces objets, un
 * adaptateur mince (Netlify aujourd'hui, Azure Functions après l'epic b1d) les
 * encode en SSE. Aucune primitive de streaming propriétaire ici.
 *
 * Niveau A (livré) : progression des outils (`tool_start`/`tool_end`) en direct,
 * puis la réponse finale d'un bloc (`message`). Niveau B (plus tard) ajoutera un
 * type `token` sur CE MÊME canal, sans rien casser côté client.
 */
export type AgentEvent =
  /** Un outil va être exécuté (pastille "en cours" côté UI). */
  | { type: "tool_start"; tool: string; args: unknown }
  /** L'outil a répondu : sa trace (ok/erreur) est connue. */
  | { type: "tool_end"; trace: ToolTrace }
  /** Réponse finale rédigée de l'assistant (Niveau A : d'un bloc). */
  | { type: "message"; content: string }
  /** Fin de boucle : le résultat complet fait autorité (fil à réinjecter, trace). */
  | { type: "done"; result: AgentResult };

/** Levée sur quota AOAI (429) : l'appelant relaie le délai, il ne 502 pas. */
export class AgentRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Quota du modèle atteint");
    this.name = "AgentRateLimitError";
  }
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * Le prompt encode les décisions du bead (docs/aiagent_usecase.md) :
 *  - distinguer recherche (un search) d'analyse (chaîne d'outils) ;
 *  - AGIR avant de demander (bead 9ou.1) : hypothèse raisonnable + exécution +
 *    une ligne d'hypothèse ; question seulement si la demande est ininterprétable,
 *    et jamais après un feu vert ;
 *  - mapper un sous-groupe en langage naturel sur les CODES RAW via get_survey
 *    AVANT crosstab (les micro-données ne renvoient que des codes) ;
 *  - rester intra-sondage (tranche 1, zéro problème de comparabilité) ;
 *  - ne croiser que les sondages à micro-données (has_microdata / manifest).
 */
export const SYSTEM_PROMPT = `RÈGLE DURE — LANGUE DE RÉPONSE (priorité sur tout le reste de ce prompt) : réponds TOUJOURS et UNIQUEMENT dans la langue du DERNIER message de l'utilisateur. Si ce message est en anglais, TA RÉPONSE ENTIÈRE DOIT ÊTRE EN ANGLAIS (titres, tableaux, questions de clarification, garde-fous compris) — pas un mot de français. Si ce message est en français, réponds en français. Détecte la langue à chaque tour, ne demande jamais à l'utilisateur dans quelle langue répondre, et ne mélange pas les deux langues dans une même réponse. (HARD RULE — RESPONSE LANGUAGE, overrides everything below: always answer ONLY in the language of the user's LAST message. If it is written in English, your ENTIRE reply — headings, tables, clarifying questions, caveats — must be in English, not a single word of French.) Ce prompt système ci-dessous reste rédigé en français ; c'est un texte d'instructions pour toi, PAS un texte à répéter — seule TA SORTIE doit s'adapter à la langue de l'utilisateur, avec la même rigueur et sobriété peu importe la langue. Toutes les consignes qui suivent (garde-fous, format markdown, clarification, etc.) décrivent un comportement et s'appliquent identiquement en français et en anglais.

Tu es un agent analytique branché sur un corpus de sondages d'opinion (Québec/Canada). Tu n'inventes AUCUN chiffre : tout nombre vient d'un appel d'outil.

TON RÔLE
Ta valeur est de CHAÎNER des outils pour produire une réponse qui exigerait plusieurs manipulations manuelles, et de LIVRER un résultat même quand la demande est sous-spécifiée : tu choisis une lecture raisonnable, tu exécutes, et tu dis quelle hypothèse tu as prise. Ce qui se fait en un seul clic (chercher une question) n'a pas besoin de toi.

OUTILS
- search_questions(query, survey_id?, top?) : recherche hybride + rerank. Pour TROUVER des questions sur un sujet. Renvoie des questions avec leur survey_id, variable, et un score_pertinence 0-100.
- list_surveys() : catalogue des sondages. Chaque entrée porte has_microdata : true = des croisements pondérés sont calculables, false = seulement de la recherche/lecture.
- list_themes() : thèmes et concepts du corpus avec leur nombre de questions.
- get_survey(survey_id, variables?, query?) : catalogue d'un sondage. AVEC variables:[...] → le DÉTAIL (response_options "code=label") de CES variables seulement : c'est l'outil qui te donne le mapping LANGAGE NATUREL → CODES RAW. AVEC query:"mots-clés" → les lignes d'index "variable | type | libellé" qui contiennent ces mots (filtre lexical : mets les mots dans la langue du sondage, ex. anglais pour la CES, et plusieurs synonymes). SANS les deux → l'index : lignes complètes pour un petit sondage, NOMS seulement pour un gros (les variables sociodémo sont toujours listées en lignes). L'index n'est montré qu'une fois puis retiré du fil : note les noms de variables qui t'intéressent.
- crosstab(survey_id, target, dim?, filters?, agg?, exclude?) : distribution/croisement PONDÉRÉ (erreur-type de Kish incluse). target = variable analysée, dim = variable de croisement, filters = [{var, codes:[...]}], agg = "count" (défaut) ou "mean". Renvoie des CODES RAW, jamais des libellés.

RECHERCHE vs ANALYSE
- Simple demande de recherche ("trouve-moi des questions sur X") → UN seul search_questions, tu présentes les résultats. N'enchaîne pas d'outils inutilement.
- Demande d'ANALYSE ("qu'est-ce qui distingue les 18-34 ans sur X", "qui appuie Y") → chaîne d'outils (search/get_survey/crosstab), possiblement plusieurs croisements.

RÈGLE DURE — AGIS D'ABORD, NE DEMANDE PAS
Par défaut, tu NE POSES PAS de question : tu fais une hypothèse raisonnable, tu APPELLES LES OUTILS, tu montres le résultat, puis tu termines par UNE ligne "Hypothèse : … — dis-moi si tu préfères … et je relance." (dans la langue de l'utilisateur). Une demande large n'est PAS une raison de demander : "sur l'immigration" → prends la lecture la plus fréquente dans le corpus (ou les 2-3 batteries les plus pertinentes), calcule, et nomme ce que tu as retenu. Idem pour le choix du sondage (le plus récent avec micro-données et la variable pertinente), de la variable, des modalités à regrouper, de la pondération, du nombre de résultats : choisis, exécute, annonce.
Tu ne poses une question QUE si la demande est réellement ininterprétable (aucune lecture raisonnable possible, ex. un mot isolé sans sens identifiable). Dans ce cas : UNE seule question, courte, qui regroupe tout, avec 2-3 options concrètes. Jamais deux fois sur le même point, jamais une précision déjà donnée, jamais une question annoncée "rapide" ou "finale".

RÈGLE DURE — UN FEU VERT, C'EST DÉFINITIF
Dès que l'utilisateur donne un signal d'aller de l'avant ("go", "vas-y", "oui", "ok", "lance", "exécute", ou toute réponse à ta question précédente), tu EXÉCUTES IMMÉDIATEMENT (appels d'outils) — AUCUNE nouvelle question, sans exception, même sur un détail que tu viens de remarquer. Tout point encore ouvert se règle par un défaut raisonnable, mentionné dans ta ligne d'hypothèse.

MAPPER UN SOUS-GROUPE SUR LES CODES (règle dure)
crosstab ne connaît QUE les codes raw, propres à chaque sondage. Pour traduire "18-34 ans", "au Québec", "les femmes" en filtres, tu DOIS d'abord appeler get_survey(survey_id, variables:[...]) EN CIBLANT les variables concernées (cible, dimension, filtres) et lire leurs response_options {code, label}. Choisis les codes à partir des LABELS, puis passe ces codes à crosstab. Ne devine JAMAIS un code. Si tu ignores encore le nom exact des variables, trouve-les d'abord avec search_questions(query, survey_id) ou get_survey(survey_id, query:"mots-clés") (préférable à l'index complet sur un gros sondage), puis demande le détail des variables retenues. De même, les résultats de crosstab sont des codes : rejoins-les aux labels via le détail get_survey déjà obtenu pour les présenter lisiblement.

RESPECTER LES MICRO-DONNÉES
Ne propose un crosstab QUE sur un sondage dont has_microdata est true (list_surveys) ou présent dans le manifest. Si l'utilisateur veut analyser un sondage sans micro-données, dis-le et propose au mieux de la recherche/lecture de questions.

INTRA-SONDAGE (tranche 1)
Reste DANS UN SEUL sondage par analyse : mêmes poids, même échantillon, même échelle. Ne compare pas des chiffres entre sondages différents et ne fais pas de longitudinal — signale que c'est hors de ta portée actuelle si on te le demande.

GARDE-FOUS
- Signale les petits sous-groupes (raw_n faible) : un écart peut n'être que du bruit.
- Sois honnête sur ce que le corpus ne contient pas. "On n'a pas ça directement, mais voici les batteries les plus proches" est une bonne réponse.
- Ces garde-fous (taille d'échantillon, codage, méthode, absence de micro-données) ne sont JAMAIS une raison de bloquer ni de demander : applique un défaut prudent (ex. regrouper des modalités, exclure les NSP/refus, rester sur la variable la plus proche), exécute, et SIGNALE la limite dans la réponse.

FORMAT DE RÉPONSE (markdown — ta réponse est RENDUE en markdown)
Structure toujours ta réponse en markdown, pas en texte plat :
- Titres de section avec ## et ### (PAS des lignes de texte en gras isolées ; PAS un seul # en début de réponse suivi de tout le reste à plat).
- Quand tu listes des questions/variables d'un ou plusieurs sondages, utilise un TABLEAU markdown (ex. colonnes Sondage | Variable | Libellé | µ-données). Un inventaire se lit en tableau, pas en puces imbriquées.
- **Gras** pour les chiffres-clés, les noms de variables et les libellés de réponse ; puces pour les énumérations courtes.
- Va à l'essentiel : pas de préambule ni de méta-commentaire sur ta démarche. Une réponse courte et bien structurée vaut mieux qu'un long rapport.

RAPPEL FINAL : avant d'écrire ta réponse, vérifie la langue du dernier message utilisateur et écris TOUTE ta réponse dans cette langue (English in, English out — français si la question est en français).`;

// ---------------------------------------------------------------------------
// Définitions des outils (format function calling OpenAI/Azure)
// ---------------------------------------------------------------------------

export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "search_questions",
      description:
        "Recherche hybride (sémantique + rerank Cohere) de questions du corpus sur un sujet. Renvoie les questions les plus pertinentes avec leur survey_id, variable, thèmes et un score de pertinence 0-100.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Sujet ou intention de recherche, en langage naturel." },
          survey_id: { type: "string", description: "Restreindre la recherche à un seul sondage (optionnel)." },
          top: { type: "integer", description: `Nombre de résultats (défaut ${SEARCH_TOOL_TOP}).` },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_surveys",
      description:
        "Liste tous les sondages du corpus (année, maison, N, description) avec un flag has_microdata indiquant si des croisements pondérés y sont calculables.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_themes",
      description: "Liste les thèmes et concepts du corpus avec le nombre de questions par thème/concept.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_survey",
      description:
        "Catalogue d'un sondage. AVEC `variables:[...]` : DÉTAIL (response_options \"code=label\") UNIQUEMENT pour ces variables — à demander pour toute variable que tu croises (cible, dimension, filtres). AVEC `query` : lignes d'index \"variable | type | libellé\" filtrées par mots-clés (lexical ; mots dans la langue du sondage, synonymes OK). SANS les deux : index compact (noms seulement pour un gros sondage) + variables sociodémo. Préfère `query` ou `variables` à l'index complet.",
      parameters: {
        type: "object",
        properties: {
          survey_id: { type: "string" },
          variables: {
            type: "array",
            description:
              "Variables dont tu veux le détail (response_options). Omis = index sans options.",
            items: { type: "string" },
          },
          query: {
            type: "string",
            description:
              "Mots-clés pour filtrer l'index (sans `variables`). Ex. \"satisfaction democracy\" sur la CES. Ignoré si `variables` est fourni.",
          },
        },
        required: ["survey_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crosstab",
      description:
        "Distribution ou croisement PONDÉRÉ (erreur-type de Kish) sur les micro-données d'un sondage. Renvoie `columns` + `rows` (une ligne = un tableau aligné sur columns), en codes raw (à rejoindre aux labels via get_survey). Seulement pour un sondage à has_microdata=true.",
      parameters: {
        type: "object",
        properties: {
          survey_id: { type: "string" },
          target: { type: "string", description: "Variable analysée (nom raw de la variable)." },
          dim: { type: "string", description: "Variable de croisement (optionnel) ; absente = distribution simple." },
          filters: {
            type: "array",
            description: "Sous-population : liste de {var, codes:[...]}. Les codes viennent de get_survey.",
            items: {
              type: "object",
              properties: {
                var: { type: "string" },
                codes: { type: "array", items: { type: ["string", "number"] } },
              },
              required: ["var", "codes"],
              additionalProperties: false,
            },
          },
          agg: { type: "string", enum: ["count", "mean"], description: "count = distribution/crosstab ; mean = moyenne pondérée d'une cible numérique." },
          exclude: { type: "array", description: "Codes de la cible à exclure (refus/NSP), surtout en mean.", items: { type: ["string", "number"] } },
        },
        required: ["survey_id", "target"],
        additionalProperties: false,
      },
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Dispatch des outils (in-process, wrappe les fonctions existantes)
// ---------------------------------------------------------------------------

function retrieveEnv(env: AgentEnv): RetrieveEnv {
  return {
    SEARCH_ENDPOINT: env.SEARCH_ENDPOINT,
    SEARCH_QUERY_KEY: env.SEARCH_QUERY_KEY,
    AOAI_ENDPOINT: env.AOAI_ENDPOINT,
    AOAI_KEY: env.AOAI_KEY,
    AOAI_EMBED_DEPLOYMENT: env.AOAI_EMBED_DEPLOYMENT,
  };
}
function rerankEnv(env: AgentEnv): RerankEnv {
  return {
    COHERE_RERANK_ENDPOINT: env.COHERE_RERANK_ENDPOINT,
    COHERE_RERANK_DEPLOYMENT: env.COHERE_RERANK_DEPLOYMENT,
    COHERE_RERANK_KEY: env.COHERE_RERANK_KEY,
  };
}
function corpusEnv(env: AgentEnv): CorpusEnv {
  return { SEARCH_ENDPOINT: env.SEARCH_ENDPOINT, SEARCH_QUERY_KEY: env.SEARCH_QUERY_KEY };
}

/**
 * Résultats de recherche COMPACTS (9ou.10) : une ligne
 * `survey_id | variable | type | score | question_text [socio:x] {thèmes}` par
 * résultat + une table `surveys` {survey_id: "nom (année)"} donnée une seule
 * fois (le nom long bilingue se répétait à chaque ligne).
 */
export const SEARCH_TEXT_MAX = 200;
export function compactSearchResults(results: Record<string, any>[]) {
  const surveys: Record<string, string> = {};
  const lines = results.map((r) => {
    const sid = String(r.survey_id ?? "");
    if (!(sid in surveys)) surveys[sid] = `${r.survey_name ?? sid}${r.survey_year ? ` (${r.survey_year})` : ""}`;
    const socio = r.is_sociodemo ? ` [socio:${r.sociodemo_type ?? "?"}]` : "";
    const themes = Array.isArray(r.themes) && r.themes.length ? ` {${r.themes.join(", ")}}` : "";
    return `${sid} | ${r.variable} | ${r.var_type ?? "?"} | ${r.score_pertinence ?? "?"} | ${truncate(String(r.question_text ?? ""), SEARCH_TEXT_MAX)}${socio}${themes}`;
  });
  return { count: lines.length, format: "survey_id | variable | type | score_pertinence | question_text", surveys, results: lines };
}

/** Catalogue de sondages COMPACT (9ou.10) : une ligne par sondage, description tronquée. */
export const SURVEY_DESC_MAX = 140;
export function compactSurveyList(surveys: Record<string, any>[], withMicrodata: Set<string>) {
  return {
    format: "survey_id | année | nom | maison | N | micro-données | description",
    surveys: surveys.map(
      (s) =>
        `${s.survey_id} | ${s.survey_year ?? "?"} | ${s.survey_name ?? ""} | ${s.pollster ?? ""} | N=${s.n_respondents ?? "?"} | ${withMicrodata.has(s.survey_id) ? "has_microdata" : "no_microdata"} | ${truncate(String(s.survey_description ?? ""), SURVEY_DESC_MAX)}`,
    ),
  };
}

/**
 * Index COMPACT (aat.6, puis 9ou.10). Le catalogue complet d'un gros sondage
 * (ces_2025 : ~590 variables) pesait ~30k tokens en JSON objet et était repayé à
 * chaque tour : 100-400k tokens d'input par requête. On renvoie désormais une
 * LIGNE texte par variable — `variable | type | libellé court` — où le libellé
 * est `display_label` (court, distinctif dans une batterie) à défaut le
 * question_text, tronqué. Les response_options restent réservées au mode détail.
 */
export const INDEX_LABEL_MAX = 90;
/** Au-delà de ce nombre de variables, l'index sans `query` ne liste que les NOMS. */
export const INDEX_FULL_MAX = 150;
/** Lignes max renvoyées pour un index filtré par `query`. */
export const INDEX_QUERY_MAX = 50;
/** Options max par variable en mode détail (listes de pays, etc.). */
export const DETAIL_OPTIONS_MAX = 120;

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Une ligne d'index : `variable | type | libellé` (+ ` [socio:type]`). */
export function indexLine(q: Record<string, any>): string {
  const label = truncate(String(q.display_label || q.question_text || ""), INDEX_LABEL_MAX);
  const socio = q.is_sociodemo ? ` [socio:${q.sociodemo_type ?? "?"}]` : "";
  return `${q.variable} | ${q.var_type ?? "?"} | ${label}${socio}`;
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Filtre l'index par mots-clés (OU, classé par nombre de mots trouvés). Un mot
 * long est réduit à ses 6 premières lettres (« démocratie » → « democr » trouve
 * aussi « democracy ») : recherche lexicale bon marché, pas sémantique — le
 * modèle peut passer des synonymes / la langue du sondage, ou search_questions.
 */
export function filterIndex(questions: Record<string, any>[], query: string): Record<string, any>[] {
  const terms = [...new Set(norm(query).split(/[^a-z0-9_]+/).filter((t) => t.length >= 3))].map((t) =>
    t.length > 6 ? t.slice(0, 6) : t,
  );
  if (terms.length === 0) return [];
  return questions
    .map((q) => {
      const hay = norm(`${q.variable ?? ""} ${q.display_label ?? ""} ${q.question_text ?? ""} ${q.sociodemo_type ?? ""}`);
      return { q, score: terms.filter((t) => hay.includes(t)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.q);
}

/**
 * Construit la réponse get_survey en mode INDEX (sans `variables`).
 *  - `query` fourni → lignes compactes des variables qui matchent (≤ INDEX_QUERY_MAX) ;
 *  - petit sondage (≤ INDEX_FULL_MAX) → toutes les lignes compactes ;
 *  - gros sondage → NOMS seulement + lignes des variables sociodémo + consigne
 *    de filtrer avec `query` ou search_questions(survey_id).
 * Les variables sociodémo sont toujours listées en lignes complètes : ce sont
 * les dimensions/filtres de presque toute analyse.
 */
export function buildSurveyIndex(questions: Record<string, any>[], query?: string) {
  const socio = questions.filter((q) => q.is_sociodemo).map(indexLine);
  if (query && query.trim()) {
    const hits = filterIndex(questions, query);
    return {
      query,
      matched: hits.length,
      questions: hits.slice(0, INDEX_QUERY_MAX).map(indexLine),
      ...(hits.length > INDEX_QUERY_MAX ? { truncated: true } : {}),
      sociodemo: socio,
      hint:
        hits.length === 0
          ? "Aucune variable ne contient ces mots. Essaie des synonymes dans la langue du sondage, ou search_questions(query, survey_id) (sémantique, multilingue)."
          : "Format : variable | type | libellé. Demande ensuite get_survey(survey_id, variables:[...]) pour les codes.",
    };
  }
  if (questions.length <= INDEX_FULL_MAX) {
    return { format: "variable | type | libellé", questions: questions.map(indexLine) };
  }
  return {
    variable_names: questions.map((q) => String(q.variable)),
    sociodemo: socio,
    hint: `Gros sondage (${questions.length} variables) : seuls les NOMS sont listés. Pour les libellés, rappelle get_survey(survey_id, query:"mots-clés") (filtre lexical, mots dans la langue du sondage, plusieurs synonymes OK) ou search_questions(query, survey_id), puis get_survey(survey_id, variables:[...]) pour les codes.`,
  };
}

/** Options compactes `code=label` (moitié moins de tokens que {code,label}). */
function compactOptions(opts: unknown): { options: string[]; omitted?: number } {
  if (!Array.isArray(opts)) return { options: [] };
  const all = opts.map((o: any) => {
    const code = String(o?.code ?? "");
    let label = String(o?.label ?? "").trim();
    // Préfixe « 3. » redondant avec le code (« 3. 1922 » → « 1922 »).
    if (label.startsWith(`${code}. `)) label = label.slice(code.length + 2).trim();
    // « 15 » pour le code 15 : le label n'apporte rien au-delà du code.
    return label === code || label === "" ? code : `${code}=${label}`;
  });
  return all.length > DETAIL_OPTIONS_MAX
    ? { options: all.slice(0, DETAIL_OPTIONS_MAX), omitted: all.length - DETAIL_OPTIONS_MAX }
    : { options: all };
}

/** Détail d'une variable (mode `variables`) : question complète + options compactes. */
export function detailSurveyQuestion(q: Record<string, any>) {
  const { options, omitted } = compactOptions(q.response_options);
  return {
    variable: q.variable,
    label: q.display_label ?? undefined,
    question_text: q.question_text,
    var_type: q.var_type,
    ...(q.is_sociodemo ? { sociodemo_type: q.sociodemo_type } : {}),
    response_options: options,
    ...(omitted ? { options_omitted: omitted } : {}),
  };
}

/**
 * Stub qui REMPLACE, dans le fil, un résultat get_survey en mode index déjà lu
 * par le modèle (9ou.10) : l'index n'est utile qu'au tour où il choisit ses
 * variables ; le repayer à chaque tour suivant dominait le coût. On garde la
 * liste sociodémo (petite, utile pour les filtres) et la façon de le rouvrir.
 */
export const ELIDED_INDEX_NOTE =
  "Index déjà consulté au tour précédent, retiré du fil pour économiser des tokens. Pour retrouver une variable : get_survey(survey_id, query:\"mots-clés\") ou search_questions(query, survey_id).";

export function elideIndexResult(content: string): string {
  try {
    const r = JSON.parse(content);
    if (!r || r.mode !== "index") return content;
    return JSON.stringify({
      survey_id: r.survey_id,
      has_microdata: r.has_microdata,
      mode: "index_elided",
      ...(r.query ? { query: r.query } : {}),
      ...(Array.isArray(r.sociodemo) ? { sociodemo: r.sociodemo } : {}),
      note: ELIDED_INDEX_NOTE,
    });
  } catch {
    return content;
  }
}

/** Lignes max d'un crosstab renvoyées au modèle (au-delà : dimension trop fine). */
export const CROSSTAB_ROWS_MAX = 200;

function roundNum(x: unknown): unknown {
  if (typeof x !== "number" || !Number.isFinite(x) || Number.isInteger(x)) return x;
  return Math.abs(x) < 1 ? Number(x.toFixed(4)) : Number(x.toFixed(1));
}

/**
 * Compacte un résultat crosstab pour le modèle (9ou.10) : `rows` d'objets à
 * floats pleine précision → `columns` + `rows` en tableaux, nombres arrondis
 * (parts/ET à 4 décimales, effectifs/moyennes à 1). ~4-5× moins de tokens à
 * information égale pour la rédaction. Une dimension très fine (âge en années :
 * ~460 lignes) est plafonnée à CROSSTAB_ROWS_MAX avec une consigne de regroupement.
 * Tout résultat d'une autre forme est renvoyé tel quel.
 */
export function compactCrosstabResult(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const r = result as Record<string, unknown>;
  const rows = r.rows;
  if (!Array.isArray(rows) || rows.length === 0 || !rows.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
    return result;
  }
  const columns = [...new Set(rows.flatMap((x) => Object.keys(x as object)))];
  const kept = rows.slice(0, CROSSTAB_ROWS_MAX);
  const { rows: _drop, ...meta } = r;
  void _drop;
  for (const k of Object.keys(meta)) if (meta[k] === null) delete meta[k];
  return {
    ...meta,
    columns,
    rows: kept.map((x) => columns.map((c) => roundNum((x as Record<string, unknown>)[c] ?? null))),
    ...(rows.length > CROSSTAB_ROWS_MAX
      ? {
          rows_omitted: rows.length - CROSSTAB_ROWS_MAX,
          hint: "Dimension trop fine : regroupe-la (ex. tranches d'âge via plusieurs crosstabs filtrés, ou une variable déjà groupée) plutôt que de croiser chaque modalité.",
        }
      : {}),
  };
}

/**
 * Exécute UN outil et renvoie l'objet résultat (sérialisé ensuite en message
 * tool). Ne LÈVE pas sur erreur métier : renvoie `{ error }` pour que le modèle
 * puisse corriger (ex. sondage sans micro-données) plutôt que faire échouer la
 * boucle. Le manifest est passé en cache pour le garde-fou has_microdata.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  env: AgentEnv,
  microdata: MicrodataProvider,
  manifestCache: { current: ManifestLike | null },
  usage?: UsageContext,
  indexes: string[] = [PUBLIC_QUESTIONS_INDEX],
): Promise<unknown> {
  const getManifest = async (): Promise<ManifestLike> => {
    if (!manifestCache.current) manifestCache.current = await microdata.manifest();
    return manifestCache.current;
  };

  switch (name) {
    case "search_questions": {
      const query = String(args.query ?? "").trim();
      if (!query) return { error: "query est requis" };
      const top = Number(args.top) > 0 ? Number(args.top) : SEARCH_TOOL_TOP;
      const filters: SearchFilters | undefined = args.survey_id
        ? ({ survey_id: String(args.survey_id) } as unknown as SearchFilters)
        : undefined;
      const concepts: Concept[] | undefined = undefined;
      try {
        // Identité de la requête agent (client_id + request_id) propagée à
        // l'embedding (op:"embed") ET au rerank (op:"rerank", tickets 97r.3/97r.5)
        // pour que l'agrégation par requête somme la boucle + les /search
        // déclenchés sous un même request_id, au crédit du même client.
        const { candidates } = await retrieve(query, concepts, retrieveEnv(env), {
          filters,
          top,
          usage,
          indexes,
        });
        let ranked = await rerankCandidates(query, candidates, rerankEnv(env), usage);
        ranked = ranked
          .map((r) => ({ ...r, score_pertinence: Math.round((r.relevance_score ?? 0) * 100) }))
          .slice(0, top);
        return compactSearchResults(ranked as any[]);
      } catch (err) {
        if (err instanceof RetrieveError || err instanceof RerankError) return { error: err.message };
        throw err;
      }
    }

    case "list_surveys": {
      const [{ surveys, total_questions }, manifest] = await Promise.all([
        listSurveys(corpusEnv(env), indexes),
        getManifest(),
      ]);
      const withMd = new Set(manifest.surveys.map((s) => s.survey_id));
      return { total_questions, ...compactSurveyList(surveys as any[], withMd) };
    }

    case "list_themes":
      return await listThemeFacets(corpusEnv(env), indexes);

    case "get_survey": {
      const surveyId = String(args.survey_id ?? "").trim();
      if (!surveyId) return { error: "survey_id est requis" };
      const catalog = await getSurveyCatalog(surveyId, corpusEnv(env), indexes);
      if (!catalog) return { error: `Aucun sondage pour survey_id '${surveyId}'` };
      const manifest = await getManifest();

      // aat.6 : `variables` cible le détail (response_options) sur quelques
      // variables au lieu de renvoyer — et ré-émettre à chaque tour — TOUT le
      // catalogue exhaustif. Sans `variables`, on renvoie l'INDEX sans options.
      const wanted = Array.isArray(args.variables)
        ? (args.variables as unknown[]).map((v) => String(v)).filter(Boolean)
        : [];
      const detailed = wanted.length > 0;
      const questions = detailed
        ? catalog.questions.filter((q) => wanted.includes(String((q as any).variable)))
        : catalog.questions;

      // Variables demandées mais introuvables : le signaler pour que le modèle
      // corrige (faute de frappe sur un nom de variable) plutôt que de deviner.
      const unknownVars = detailed
        ? wanted.filter((v) => !catalog.questions.some((q) => String((q as any).variable) === v))
        : [];

      const base = {
        survey_id: surveyId,
        survey_name: catalog.survey?.survey_name ?? null,
        has_microdata: manifest.surveys.some((s) => s.survey_id === surveyId),
        count: catalog.count,
      };
      if (!detailed) {
        // `mode` explicite pour le modèle : en "index" les response_options sont
        // ABSENTES par design — il doit rappeler get_survey avec `variables`.
        const query = typeof args.query === "string" ? args.query : undefined;
        return { ...base, mode: "index", ...buildSurveyIndex(catalog.questions as any[], query) };
      }
      return {
        ...base,
        mode: "detail",
        count: questions.length,
        ...(unknownVars.length > 0 ? { unknown_variables: unknownVars } : {}),
        questions: questions.map((q) => detailSurveyQuestion(q as any)),
      };
    }

    case "crosstab": {
      const surveyId = String(args.survey_id ?? "").trim();
      if (!surveyId) return { error: "survey_id est requis" };
      // Garde-fou dur (critère d'acceptation) : pas de croisement sur un sondage
      // absent du manifest, même si le modèle a ignoré la consigne du prompt.
      const manifest = await getManifest();
      if (!manifest.surveys.some((s) => s.survey_id === surveyId)) {
        return { error: `Le sondage '${surveyId}' n'a pas de micro-données calculables (absent du manifest). Aucun croisement possible ; propose de la recherche/lecture.` };
      }
      const params: CrosstabParams = {
        survey_id: surveyId,
        target: String(args.target ?? ""),
        dim: args.dim ? String(args.dim) : undefined,
        filters: Array.isArray(args.filters) ? (args.filters as any) : [],
        agg: args.agg === "mean" ? "mean" : "count",
        exclude: Array.isArray(args.exclude) ? (args.exclude as any) : [],
      };
      try {
        return compactCrosstabResult(await microdata.crosstab(params));
      } catch (err) {
        // Erreur métier remontée telle quelle au modèle (ex. cible invalide).
        return { error: err instanceof Error ? err.message : String(err) };
      }
    }

    default:
      return { error: `Outil inconnu : ${name}` };
  }
}

// ---------------------------------------------------------------------------
// Appel AOAI (chat completions, tools)
// ---------------------------------------------------------------------------

/**
 * Résultat d'un tour de chat : le message de l'assistant + l'usage tokens du
 * tour (epic 97r). L'usage est porté ici pour que la boucle émette une ligne
 * `agent_turn` par tour sans re-parser la réponse HTTP.
 */
export interface ChatTurn {
  message: AoaiChatResponse["choices"][0]["message"];
  usage?: AoaiChatResponse["usage"];
}

export type ChatFn = (messages: ChatMessage[], useTools: boolean) => Promise<ChatTurn>;

/** Appel AOAI par défaut. Mirroir de src/logic/annotate.ts (reasoning model). */
function makeAoaiChat(env: AgentEnv): ChatFn {
  const endpoint = (env.AOAI_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = env.AGENT_CHAT_DEPLOYMENT || env.AOAI_CHAT_DEPLOYMENT;
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${AOAI_API_VERSION}`;

  return async (messages, useTools) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": env.AOAI_KEY ?? "" },
      body: JSON.stringify({
        messages,
        ...(useTools ? { tools: TOOL_DEFS, tool_choice: "auto" } : {}),
        reasoning_effort: AGENT_REASONING_EFFORT,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
      }),
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      throw new AgentRateLimitError(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 20000);
    }
    if (!res.ok) {
      throw new Error(`AOAI error ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as AoaiChatResponse;
    const msg = json.choices?.[0]?.message;
    if (!msg) throw new Error("Réponse vide du modèle");
    return { message: msg, usage: json.usage };
  };
}

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------

export interface RunAgentOptions {
  /** Injection de l'appel chat (tests). Défaut : AOAI réel. */
  chat?: ChatFn;
  /** Injection du dispatch d'outil (tests). Défaut : executeTool réel. */
  execute?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Budget mural en ms. Défaut DEFAULT_DEADLINE_MS. */
  deadlineMs?: number;
  /**
   * Identité d'usage de TOUTE la requête agent (epic 97r) : client_id du tenant
   * + request_id corrélant les lignes `agent_turn` de chaque tour ET les
   * `embed`/`rerank` des /search déclenchés. Fournie par le handler Netlify ; à
   * défaut `unknown` + id local (rétrocompatible pour un appel direct du module
   * hors endpoint).
   */
  usage?: UsageContext;
  /**
   * Index catalogue accessibles (f3i.11), résolus par le handler Netlify
   * depuis le Basic Auth AVANT d'entrer dans la boucle agent — jamais recalculés
   * ici. Défaut `[survey-questions]` (public seul, rétrocompatible) : sans ça,
   * un compte client ne verrait pas son corpus privé dans les réponses de
   * l'agent, alors même que /search le voit déjà (incohérence UX à éviter).
   */
  indexes?: string[];
}

/**
 * Boucle tool-use en GÉNÉRATEUR (bead aat.4) : `yield` des `AgentEvent` au fil
 * de l'eau (outils qui démarrent/finissent, puis réponse finale). `history` NE
 * contient PAS le system prompt (ajouté ici). Se termine par UN event `done`
 * portant le résultat complet (fil à réinjecter + trace) qui fait autorité.
 *
 * `runAgent` (plus bas) draine ce générateur pour l'usage synchrone : la logique
 * de boucle n'existe qu'ICI, un seul endroit à maintenir.
 */
export async function* runAgentStream(
  history: ChatMessage[],
  env: AgentEnv,
  microdata: MicrodataProvider,
  opts: RunAgentOptions = {},
): AsyncGenerator<AgentEvent, void, void> {
  const chat = opts.chat ?? makeAoaiChat(env);
  // Identité résolue une seule fois : le request_id retenu (fourni ou généré)
  // doit être le MÊME pour la boucle et pour les outils.
  const identity = usageIdentity(opts.usage);
  const usageCtx: UsageContext = { clientId: identity.client_id, requestId: identity.request_id };
  const manifestCache: { current: ManifestLike | null } = { current: null };
  const indexes = opts.indexes ?? [PUBLIC_QUESTIONS_INDEX];
  const execute =
    opts.execute ??
    ((name: string, args: Record<string, unknown>) =>
      executeTool(name, args, env, microdata, manifestCache, usageCtx, indexes));
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const start = Date.now();

  // Fil de travail : system + historique client. On renverra `messages` sans le system.
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const trace: ToolTrace[] = [];

  let iterations = 0;
  // 9ou.10 : messages [0, seenUpTo) ont déjà été envoyés au modèle au moins une
  // fois. Les résultats get_survey en mode index parmi eux sont remplacés par un
  // stub avant l'appel suivant (l'index n'est lu qu'une fois, pas repayé).
  let seenUpTo = 0;
  const elided = new Set<number>();

  // Émet le message final + l'event `done` terminal, puis termine le générateur.
  function* finish(
    assistant: AoaiChatResponse["choices"][0]["message"],
    stopped_reason: AgentResult["stopped_reason"],
  ): Generator<AgentEvent> {
    const content = assistant.content ?? "";
    yield { type: "message", content };
    yield {
      type: "done",
      result: { message: content, messages: messages.slice(1), trace, iterations, stopped_reason },
    };
  }

  while (true) {
    iterations += 1;
    const overBudget = Date.now() - start >= deadlineMs;
    const atMaxIter = iterations > MAX_ITERATIONS;
    // Passé le budget ou le plafond d'itérations : dernier appel SANS outils pour
    // forcer une réponse rédigée (ou une question) plutôt qu'un nouvel outil.
    const useTools = !overBudget && !atMaxIter;

    // Un tour = un appel LLM (repayant system prompt + schémas d'outils). On
    // mesure la latence autour du fetch et on émet UNE ligne agent_turn par tour,
    // y compris le tour final de rédaction (useTools=false). turn_index 0-based.
    for (let i = 0; i < seenUpTo; i++) {
      const m = messages[i];
      if (m.role !== "tool" || elided.has(i) || typeof m.content !== "string") continue;
      m.content = elideIndexResult(m.content);
      elided.add(i);
    }
    const turnStartedAt = Date.now();
    const { message: assistant, usage } = await chat(messages, useTools);
    seenUpTo = messages.length;
    logUsage({
      ...identity,
      op: "agent_turn",
      prompt_tokens: usage?.prompt_tokens,
      completion_tokens: usage?.completion_tokens,
      cached_tokens: usage?.prompt_tokens_details?.cached_tokens,
      latency_ms: Date.now() - turnStartedAt,
      meta: { turn_index: iterations - 1 },
    });
    messages.push({
      role: "assistant",
      content: assistant.content ?? null,
      ...(assistant.tool_calls ? { tool_calls: assistant.tool_calls } : {}),
    });

    const toolCalls = assistant.tool_calls ?? [];
    if (toolCalls.length === 0) {
      yield* finish(assistant, overBudget ? "deadline" : atMaxIter ? "max_iterations" : "final");
      return;
    }

    // Le modèle a demandé un/des outil(s) mais on ne les offre plus (budget/plafond) :
    // sécurité — on coupe et on rend ce qu'il a écrit.
    if (!useTools) {
      yield* finish(assistant, overBudget ? "deadline" : "max_iterations");
      return;
    }

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      yield { type: "tool_start", tool: call.function.name, args };
      let result: unknown;
      let ok = true;
      let errMsg: string | undefined;
      try {
        result = await execute(call.function.name, args);
        if (result && typeof result === "object" && "error" in (result as any)) {
          ok = false;
          errMsg = String((result as any).error);
        }
      } catch (err) {
        if (err instanceof AgentRateLimitError) throw err;
        ok = false;
        errMsg = err instanceof Error ? err.message : String(err);
        result = { error: errMsg };
      }
      const t: ToolTrace = { tool: call.function.name, args, ok, ...(errMsg ? { error: errMsg } : {}) };
      trace.push(t);
      yield { type: "tool_end", trace: t };
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
}

/**
 * Fait tourner la boucle tool-use et renvoie le résultat final (mode SYNCHRONE).
 * Draine `runAgentStream` : même logique, un seul chemin. Une `AgentRateLimitError`
 * levée dans la boucle se propage telle quelle à l'appelant (comportement inchangé).
 */
export async function runAgent(
  history: ChatMessage[],
  env: AgentEnv,
  microdata: MicrodataProvider,
  opts: RunAgentOptions = {},
): Promise<AgentResult> {
  let result: AgentResult | null = null;
  for await (const ev of runAgentStream(history, env, microdata, opts)) {
    if (ev.type === "done") result = ev.result;
  }
  if (!result) throw new Error("runAgent: flux terminé sans event `done`");
  return result;
}
