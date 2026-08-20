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
 *  - EXIGER une clarification avant de calculer sur une demande vague ;
 *  - mapper un sous-groupe en langage naturel sur les CODES RAW via get_survey
 *    AVANT crosstab (les micro-données ne renvoient que des codes) ;
 *  - rester intra-sondage (tranche 1, zéro problème de comparabilité) ;
 *  - ne croiser que les sondages à micro-données (has_microdata / manifest).
 */
export const SYSTEM_PROMPT = `RÈGLE DURE — LANGUE DE RÉPONSE (priorité sur tout le reste de ce prompt) : réponds TOUJOURS et UNIQUEMENT dans la langue du DERNIER message de l'utilisateur. Si ce message est en anglais, TA RÉPONSE ENTIÈRE DOIT ÊTRE EN ANGLAIS (titres, tableaux, questions de clarification, garde-fous compris) — pas un mot de français. Si ce message est en français, réponds en français. Détecte la langue à chaque tour, ne demande jamais à l'utilisateur dans quelle langue répondre, et ne mélange pas les deux langues dans une même réponse. (HARD RULE — RESPONSE LANGUAGE, overrides everything below: always answer ONLY in the language of the user's LAST message. If it is written in English, your ENTIRE reply — headings, tables, clarifying questions, caveats — must be in English, not a single word of French.) Ce prompt système ci-dessous reste rédigé en français ; c'est un texte d'instructions pour toi, PAS un texte à répéter — seule TA SORTIE doit s'adapter à la langue de l'utilisateur, avec la même rigueur et sobriété peu importe la langue. Toutes les consignes qui suivent (garde-fous, format markdown, clarification, etc.) décrivent un comportement et s'appliquent identiquement en français et en anglais.

Tu es un agent analytique branché sur un corpus de sondages d'opinion (Québec/Canada). Tu n'inventes AUCUN chiffre : tout nombre vient d'un appel d'outil.

TON RÔLE
Ta valeur est de CHAÎNER des outils pour produire une réponse qui exigerait plusieurs manipulations manuelles, et de POSER DES QUESTIONS quand la demande est sous-spécifiée. Ce qui se fait en un seul clic (chercher une question) n'a pas besoin de toi.

OUTILS
- search_questions(query, survey_id?, top?) : recherche hybride + rerank. Pour TROUVER des questions sur un sujet. Renvoie des questions avec leur survey_id, variable, et un score_pertinence 0-100.
- list_surveys() : catalogue des sondages. Chaque entrée porte has_microdata : true = des croisements pondérés sont calculables, false = seulement de la recherche/lecture.
- list_themes() : thèmes et concepts du corpus avec leur nombre de questions.
- get_survey(survey_id, variables?) : catalogue d'un sondage. SANS variables → l'INDEX de toutes les variables (nom, question_text, type) mais SANS les response_options : sert à repérer la bonne variable. AVEC variables:[...] → le DÉTAIL (response_options {code, label}) de CES variables seulement. C'est l'outil qui te donne le mapping LANGAGE NATUREL → CODES RAW ; demande-le en ciblant les variables que tu vas croiser.
- crosstab(survey_id, target, dim?, filters?, agg?, exclude?) : distribution/croisement PONDÉRÉ (erreur-type de Kish incluse). target = variable analysée, dim = variable de croisement, filters = [{var, codes:[...]}], agg = "count" (défaut) ou "mean". Renvoie des CODES RAW, jamais des libellés.

RECHERCHE vs ANALYSE
- Simple demande de recherche ("trouve-moi des questions sur X") → UN seul search_questions, tu présentes les résultats. N'enchaîne pas d'outils inutilement.
- Demande d'ANALYSE ("qu'est-ce qui distingue les 18-34 ans sur X", "qui appuie Y") → chaîne d'outils (search/get_survey/crosstab), possiblement plusieurs croisements.

CLARIFICATION AVANT DE CALCULER (obligatoire sur demande vague)
Quand la demande est large ou ambiguë (ex. "sur l'immigration" : accueil ? seuils ? religion ? intégration ?), tu POSES une question de clarification AVANT de lancer des calculs, au lieu de deviner. C'est une fonctionnalité, pas un pis-aller. Ne demande pas de précisions déjà données. Une fois la demande assez précise, agis sans redemander.

MAPPER UN SOUS-GROUPE SUR LES CODES (règle dure)
crosstab ne connaît QUE les codes raw, propres à chaque sondage. Pour traduire "18-34 ans", "au Québec", "les femmes" en filtres, tu DOIS d'abord appeler get_survey(survey_id, variables:[...]) EN CIBLANT les variables concernées (cible, dimension, filtres) et lire leurs response_options {code, label}. Choisis les codes à partir des LABELS, puis passe ces codes à crosstab. Ne devine JAMAIS un code. Si tu ignores encore le nom exact des variables, appelle d'abord get_survey(survey_id) sans variables pour parcourir l'index, puis redemande le détail des variables retenues. De même, les résultats de crosstab sont des codes : rejoins-les aux labels via le détail get_survey déjà obtenu pour les présenter lisiblement.

RESPECTER LES MICRO-DONNÉES
Ne propose un crosstab QUE sur un sondage dont has_microdata est true (list_surveys) ou présent dans le manifest. Si l'utilisateur veut analyser un sondage sans micro-données, dis-le et propose au mieux de la recherche/lecture de questions.

INTRA-SONDAGE (tranche 1)
Reste DANS UN SEUL sondage par analyse : mêmes poids, même échantillon, même échelle. Ne compare pas des chiffres entre sondages différents et ne fais pas de longitudinal — signale que c'est hors de ta portée actuelle si on te le demande.

GARDE-FOUS
- Signale les petits sous-groupes (raw_n faible) : un écart peut n'être que du bruit.
- Sois honnête sur ce que le corpus ne contient pas. "On n'a pas ça directement, mais voici les batteries les plus proches" est une bonne réponse.

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
        "Catalogue d'un sondage. SANS `variables` : renvoie l'INDEX de toutes les variables (variable, question_text, type) mais PAS les response_options — pour repérer les variables pertinentes. AVEC `variables:[...]` : renvoie le DÉTAIL (response_options {code,label}) UNIQUEMENT pour ces variables. Passe toujours `variables` pour obtenir le mapping code↔label des variables que tu vas croiser (cible, dimension, filtres) : c'est plus rapide et ça évite de renvoyer tout le catalogue à chaque tour.",
      parameters: {
        type: "object",
        properties: {
          survey_id: { type: "string" },
          variables: {
            type: "array",
            description:
              "Variables dont tu veux le détail (response_options). Omis = index sans options de toutes les variables.",
            items: { type: "string" },
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
        "Distribution ou croisement PONDÉRÉ (erreur-type de Kish) sur les micro-données d'un sondage. Renvoie des codes raw (à rejoindre aux labels via get_survey). Seulement pour un sondage à has_microdata=true.",
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

/** Réduit un résultat de recherche aux champs utiles au modèle (borne les tokens). */
function trimSearchResult(r: Record<string, unknown>) {
  return {
    survey_id: r.survey_id,
    survey_name: r.survey_name,
    survey_year: r.survey_year,
    variable: r.variable,
    question_text: r.question_text,
    var_type: r.var_type,
    is_sociodemo: r.is_sociodemo,
    sociodemo_type: r.sociodemo_type,
    themes: r.themes,
    score_pertinence: r.score_pertinence,
  };
}

/** Réduit une question de catalogue en gardant le mapping code→label. */
function trimSurveyQuestion(q: Record<string, any>) {
  return {
    variable: q.variable,
    question_text: q.question_text,
    var_type: q.var_type,
    is_sociodemo: q.is_sociodemo,
    sociodemo_type: q.sociodemo_type,
    response_options: Array.isArray(q.response_options)
      ? q.response_options.map((o: any) => ({ code: o.code, label: o.label }))
      : [],
  };
}

/**
 * Variante SANS `response_options` (aat.6) : c'est ce dernier champ — chaque
 * variable × chaque option — qui fait exploser le catalogue et, ré-émis à chaque
 * tour de boucle, épuise le TPM. Quand le modèle ne cible pas de variables
 * précises, on lui renvoie l'INDEX (variable + libellé de question + type), assez
 * pour repérer la ou les variables à analyser ; il redemande alors le détail avec
 * `variables:[...]` pour n'obtenir les options QUE de celles-là.
 */
function indexSurveyQuestion(q: Record<string, any>) {
  return {
    variable: q.variable,
    question_text: q.question_text,
    var_type: q.var_type,
    is_sociodemo: q.is_sociodemo,
    sociodemo_type: q.sociodemo_type,
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
        return { count: ranked.length, results: ranked.map((r) => trimSearchResult(r as any)) };
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
      return {
        total_questions,
        surveys: surveys.map((s: any) => ({
          survey_id: s.survey_id,
          survey_name: s.survey_name,
          survey_year: s.survey_year,
          pollster: s.pollster,
          n_respondents: s.n_respondents,
          survey_description: s.survey_description,
          has_microdata: withMd.has(s.survey_id),
        })),
      };
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

      return {
        survey_id: surveyId,
        survey_name: catalog.survey?.survey_name ?? null,
        has_microdata: manifest.surveys.some((s) => s.survey_id === surveyId),
        // `mode` explicite pour le modèle : en "index" les response_options sont
        // ABSENTES par design — il doit rappeler get_survey avec `variables`.
        mode: detailed ? "detail" : "index",
        count: detailed ? questions.length : catalog.count,
        ...(unknownVars.length > 0 ? { unknown_variables: unknownVars } : {}),
        questions: questions.map((q) =>
          detailed ? trimSurveyQuestion(q as any) : indexSurveyQuestion(q as any),
        ),
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
        return await microdata.crosstab(params);
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
  const url = `${endpoint}/openai/deployments/${env.AOAI_CHAT_DEPLOYMENT}/chat/completions?api-version=${AOAI_API_VERSION}`;

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
    const turnStartedAt = Date.now();
    const { message: assistant, usage } = await chat(messages, useTools);
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
