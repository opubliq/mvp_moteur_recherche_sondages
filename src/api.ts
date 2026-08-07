import type { Concept, ConceptCount, MicrodataQuery, MicrodataResponse, SearchFilters, SearchResponse, SearchResult, SurveyDetailResponse, SurveyParent, VerbatimsResponse } from "./types";
import type { AnnotateResult, AnnotationItem, AnnotationSpec } from "./logic/annotate";
import type { ScanItem, ScanResult } from "./logic/scan";
import type { ChatMessage as AgentMessage, ToolTrace as AgentToolTrace, AgentEvent } from "./logic/agent";

export type { AgentMessage, AgentToolTrace, AgentEvent };

/**
 * Base des endpoints API (f3i.1/f3i.2) : vide par défaut → chemin RELATIF,
 * same-origin, exactement le comportement historique quand frontend et
 * functions sont servis depuis le même domaine (Netlify aujourd'hui).
 *
 * `VITE_API_BASE_URL` (ex. `https://opubliq-sondages-functions.azurewebsites.net`)
 * permet de découpler l'hébergement du frontend de celui des Azure Functions
 * tant que `b1d`/`f3i.2` n'ont pas mis en place un routage same-origin
 * (Static Web Apps lié, proxy, Front Door). Sans cette variable, rien ne
 * change : `apiUrl("/search")` reste `"/search"`.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

const AUTH_TOKEN_KEY = "opubliq.auth.v1.token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* quota / mode privé : la session ne survit pas au refresh, tant pis */
  }
}

/**
 * En-tête `Authorization` à fusionner dans tout appel protégé par `checkAuth`
 * côté serveur (cf. `azure-functions/src/middleware/auth-transitional.ts`).
 * Objet vide si non connecté : `checkAuth` retombe alors sur le Basic Auth
 * global tant que `ALLOW_BASIC_AUTH_FALLBACK` n'est pas basculé à `false`
 * (f3i.20) — ajouter ce header partout est donc sans régression.
 */
export function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AuthUser {
  userId: string;
  email: string;
  tenant?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/** Erreur porteuse d'un message serveur ("email_taken", "invalid_credentials", …). */
export class AuthError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "AuthError";
  }
}

async function readAuthError(res: Response): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new AuthError(data.error ?? `http_${res.status}`);
}

export async function signup(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(apiUrl("/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return readAuthError(res);
  return (await res.json()) as AuthSession;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return readAuthError(res);
  return (await res.json()) as AuthSession;
}

export async function logout(): Promise<void> {
  await fetch(apiUrl("/auth/logout"), { method: "POST", headers: authHeader() });
}

/** `null` si aucune session valide (token absent ou expiré) — pas une erreur. */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/auth/me"), { headers: authHeader() });
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

/** Appelle la Netlify Function `/surveys` : liste de tous les sondages. */
export async function fetchAllSurveys(): Promise<{ surveys: SurveyParent[]; count: number; total_questions: number }> {
  const res = await fetch(apiUrl("/surveys"));
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
  const res = await fetch(apiUrl("/decompose"), {
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
  const res = await fetch(apiUrl("/search"), {
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
  const res = await fetch(apiUrl(`/survey?survey_id=${encodeURIComponent(surveyId)}`));

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
  const res = await fetch(apiUrl("/microdata"), {
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

export interface RawExportResponse {
  survey_id: string;
  columns: string[];
  row_count: number;
  rows: Record<string, number | string | null>[];
}

/**
 * Appelle `/microdata-raw` : export ligne-par-répondant (non agrégé) pour les
 * colonnes demandées — distinct de `fetchMicrodata` (distributions/crosstabs
 * pondérés). Sert la feuille "par sondage" de l'export Excel (bead f3i.13).
 * Lève `NoMicrodataError` si le sondage n'a pas de Parquet (404).
 */
export async function fetchMicrodataRaw(surveyId: string, columns: string[]): Promise<RawExportResponse> {
  const res = await fetch(apiUrl("/microdata-raw"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ survey_id: surveyId, columns }),
  });
  if (res.status === 404) {
    throw new NoMicrodataError(`Aucune microdonnée pour ${surveyId}`);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Export brut échoué (${res.status}): ${txt || res.statusText}`);
  }
  return (await res.json()) as RawExportResponse;
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
  const res = await fetch(apiUrl("/verbatims"), {
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
  const res = await fetch(apiUrl("/annotate"), {
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
  const res = await fetch(apiUrl("/scan"), {
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
  const res = await fetch(apiUrl("/open-questions"));
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
  const res = await fetch(apiUrl("/themes"));
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
  const res = await fetch(apiUrl(`/themes?${params.toString()}`));
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chargement des questions échoué (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as { results: SearchResult[] };
  return data.results;
}

/** Quota du modèle atteint pendant un tour de l'agent : relayer le délai, pas 502. */
export class AgentRateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Quota du modèle atteint");
    this.name = "AgentRateLimitError";
  }
}

/** Réponse de `/agent` (bead aat.1) — voir netlify/functions/agent.ts. */
export interface AgentChatResponse {
  message: string;
  messages: AgentMessage[];
  trace: AgentToolTrace[];
  iterations: number;
  stopped_reason: "final" | "max_iterations" | "deadline";
}

/** Frame d'erreur du flux SSE /agent (hors union AgentEvent : purement transport). */
type AgentStreamError = { type: "error"; kind: "rate_limit" | "failed"; retry_after_ms?: number; message?: string };

/**
 * Appelle `/agent` en STREAMING (bead aat.4). POST le fil, lit le flux SSE et
 * relaie chaque `AgentEvent` à `onEvent` au fil de l'eau (outils en direct, puis
 * réponse). Résout avec le `result` de l'event `done` (fil à réinjecter + trace).
 *
 * On lit le corps via `ReadableStream` plutôt qu'`EventSource` : ce dernier ne
 * fait que du GET et ne peut pas porter le fil `messages` en body. Ce câblage est
 * transport-agnostique (Netlify aujourd'hui, Azure Functions après l'epic b1d).
 */
export async function agentChatStream(
  messages: AgentMessage[],
  onEvent: (ev: AgentEvent) => void,
): Promise<AgentChatResponse> {
  const res = await fetch(apiUrl("/agent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  // Erreur AVANT l'ouverture du flux (env manquant, corps invalide, 429 précoce).
  if (!res.ok || !res.body) {
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as { retry_after_ms?: number };
      throw new AgentRateLimitError(data.retry_after_ms ?? 20000);
    }
    const body = await res.text().catch(() => "");
    throw new Error(`Agent échoué (${res.status}): ${body || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AgentChatResponse | null = null;

  // Traite une frame SSE (bloc séparé par `\n\n`) : on ne lit que les lignes `data:`.
  const handleFrame = (frame: string) => {
    const dataLines = frame
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim());
    if (dataLines.length === 0) return;
    let payload: AgentEvent | AgentStreamError;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      return; // frame incomplète/parasite : ignorée
    }
    if (payload.type === "error") {
      const e = payload as AgentStreamError;
      if (e.kind === "rate_limit") throw new AgentRateLimitError(e.retry_after_ms ?? 20000);
      throw new Error(`Agent échoué: ${e.message ?? "erreur inconnue"}`);
    }
    if (payload.type === "done") result = payload.result;
    onEvent(payload);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Découpe sur le séparateur d'events SSE ; garde le reliquat partiel en buffer.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      handleFrame(frame);
    }
  }
  if (buffer.trim()) handleFrame(buffer); // dernière frame sans `\n\n` final

  if (!result) throw new Error("Agent: flux terminé sans résultat final");
  return result;
}
