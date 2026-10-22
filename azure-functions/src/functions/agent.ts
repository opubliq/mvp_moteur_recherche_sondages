/**
 * Azure Function — /agent (portage de netlify/functions/agent.ts, f3i.1)
 *
 * Le fichier Netlify d'origine était déjà écrit pour cette migration (cf. son
 * en-tête) : format v2 (`Request`/`Response` Fetch standard) précisément parce
 * que le corps en `ReadableStream` Web est l'API que le modèle Node v4 d'Azure
 * Functions expose aussi (`HttpResponseBodyInit` accepte un `ReadableStream`
 * natif, cf. `node_modules/@azure/functions/types/http.d.ts`) — portage sans
 * changement de mécanisme de streaming, seule la coquille handler change.
 *
 * L'orchestration (`src/logic/agent.ts::runAgentStream`) est réutilisée telle
 * quelle, comme tous les autres endpoints.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import {
  runAgentStream,
  AgentRateLimitError,
  type AgentEnv,
  type ChatMessage,
  type MicrodataProvider,
} from "../../../src/logic/agent";
import { newRequestId, resolveClientId } from "../../../src/logic/costlog";
import { isMicrodataSurveyAccessible, resolveAccessibleQuestionIndexes } from "../../../src/logic/tenancy";
import {
  AcaSessionsExecutor,
  createRunPythonTool,
  managedIdentityTokenProvider,
  sessionIdentifier,
  staticTokenProvider,
  type AcaApiVersion,
  type RunPythonTool,
} from "../../../src/logic/pythonSandbox";
import {
  createGeoTool,
  geoGetCensusExport,
  geoManagedIdentityTokenProvider,
  geoStaticTokenProvider,
  isGeoDonationsAllowed,
  type GeoTokenProvider,
  type GeoTool,
} from "../../../src/logic/geoTool";
import { MicrodataError, handleMicrodataQuery, fetchManifest, type MicrodataConfig } from "../microdata-core/core";
import { signedBlobUrl } from "../microdata-core/sas";
import { checkAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/ratelimit";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SSE_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

const REQUIRED_ENV = [
  "AOAI_ENDPOINT",
  "AOAI_KEY",
  "AOAI_CHAT_DEPLOYMENT",
  "AOAI_EMBED_DEPLOYMENT",
  "SEARCH_ENDPOINT",
  "SEARCH_QUERY_KEY",
  "COHERE_RERANK_ENDPOINT",
  "COHERE_RERANK_DEPLOYMENT",
  "COHERE_RERANK_KEY",
  "AZURE_STORAGE_ACCOUNT",
  "AZURE_STORAGE_KEY",
  "AZURE_STORAGE_CONTAINER",
] as const;

const MAX_HISTORY = 40;

const failJson = (status: number, error: string, extra: Record<string, unknown> = {}): HttpResponseInit => ({
  status,
  headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  jsonBody: { error, ...extra },
});

function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as any).role;
    const content = (m as any).content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      out.push({ role, content });
    }
  }
  return out.slice(-MAX_HISTORY);
}

function sseFrame(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Construit l'outil `run_python` pour CETTE requête (9ou.12), ou `undefined`
 * si le kill-switch `RUN_PYTHON_ENABLED` est désactivé ou que l'endpoint n'est
 * pas configuré — une Function App sans ces app settings continue de
 * fonctionner à l'identique (aucune de ces variables n'est dans REQUIRED_ENV).
 * UNE instance par requête : c'est elle qui porte le compteur d'appels.
 */
async function buildRunPythonTool(opts: {
  auth: { userId: string; tenant?: string };
  conversationId: string | undefined;
  microdataConfig: MicrodataConfig;
  context: InvocationContext;
  geoEnv?: { baseUrl: string; getToken?: GeoTokenProvider };
}): Promise<RunPythonTool | undefined> {
  if (process.env.RUN_PYTHON_ENABLED !== "true") return undefined;
  const poolManagementEndpoint = process.env.ACA_SESSIONS_POOL_ENDPOINT;
  const idSecret = process.env.ACA_SESSIONS_ID_SECRET;
  if (!poolManagementEndpoint || !idSecret) {
    opts.context.warn("[agent] RUN_PYTHON_ENABLED=true mais ACA_SESSIONS_POOL_ENDPOINT/ACA_SESSIONS_ID_SECRET absents : outil non branché.");
    return undefined;
  }
  // Sans conversation_id (client pas encore à jour, ou absent) : pas de session
  // stable possible, on n'offre pas l'outil pour CETTE requête plutôt que de
  // dériver un identifiant par requête (variables/fichiers jamais retrouvés).
  if (!opts.conversationId) return undefined;

  const getToken = process.env.ACA_SESSIONS_TOKEN
    ? staticTokenProvider(process.env.ACA_SESSIONS_TOKEN)
    : managedIdentityTokenProvider({
        identityEndpoint: process.env.IDENTITY_ENDPOINT ?? "",
        identityHeader: process.env.IDENTITY_HEADER ?? "",
      });
  const executor = new AcaSessionsExecutor({
    poolManagementEndpoint,
    apiVersion: (process.env.ACA_SESSIONS_API_VERSION as AcaApiVersion) || undefined,
    getToken,
  });
  const sessionId = await sessionIdentifier(idSecret, opts.auth.userId, opts.conversationId);
  return createRunPythonTool({
    executor,
    sessionId,
    // Même contrôle d'accès tenant que le rail micro-données (crosstab/manifest
    // ci-dessus) : un sondage privé d'un autre tenant lève une 404, pas de fuite.
    fetchParquet: async (surveyId) => {
      if (!isMicrodataSurveyAccessible(opts.auth.tenant, surveyId)) {
        throw new MicrodataError(404, "Survey not found");
      }
      const res = await fetch(signedBlobUrl(opts.microdataConfig.storage, `${surveyId}.parquet`));
      if (!res.ok) throw new Error(`blob HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    },
    // Pont census (bead 9ou.19) : présent seulement si l'outil géo (recensement) est aussi branché.
    fetchCensusParquet: opts.geoEnv
      ? (niveau) => geoGetCensusExport({ baseUrl: opts.geoEnv!.baseUrl, getToken: opts.geoEnv!.getToken }, niveau)
      : undefined,
    limits: {
      maxCallsPerRequest: Number(process.env.RUN_PYTHON_MAX_CALLS_PER_REQUEST) || undefined,
      timeoutSeconds: Number(process.env.RUN_PYTHON_TIMEOUT_SECONDS) || undefined,
    },
  });
}

/**
 * Construit l'outil géo (recensement, 9ou.5) pour CETTE requête, ou
 * `undefined` si `GEO_API_BASE_URL` n'est pas configuré — kill-switch par
 * app setting, même mécanique que `buildRunPythonTool` : une Function App
 * sans cette variable continue de fonctionner à l'identique (pas dans
 * REQUIRED_ENV). `GEO_API_TOKEN` (statique) sert au dev/premier déploiement ;
 * en production, préférer la managed identity (`GEO_API_TOKEN_AUDIENCE`,
 * cf. docs/geo_integration.md).
 */
function buildGeoToolEnv(context: InvocationContext): { baseUrl: string; getToken?: GeoTokenProvider } | undefined {
  const baseUrl = process.env.GEO_API_BASE_URL;
  if (!baseUrl) return undefined;
  const audience = process.env.GEO_API_TOKEN_AUDIENCE;
  const getToken = process.env.GEO_API_TOKEN
    ? geoStaticTokenProvider(process.env.GEO_API_TOKEN)
    : audience
      ? geoManagedIdentityTokenProvider({
          identityEndpoint: process.env.IDENTITY_ENDPOINT ?? "",
          identityHeader: process.env.IDENTITY_HEADER ?? "",
          audience,
        })
      : undefined;
  if (!getToken) {
    context.warn(
      "[agent] GEO_API_BASE_URL configuré sans GEO_API_TOKEN ni GEO_API_TOKEN_AUDIENCE : aucun jeton envoyé " +
        "(OK seulement si l'API géo est en dev local, ENVIRONNEMENT=dev).",
    );
  }
  return { baseUrl, getToken };
}

function buildGeoTool(
  env: { baseUrl: string; getToken?: GeoTokenProvider } | undefined,
  auth: { email: string },
): GeoTool | undefined {
  if (!env) return undefined;
  const allowDonations = isGeoDonationsAllowed(
    auth.email,
    process.env.GEO_DONS_ENABLED,
    process.env.GEO_DONS_ALLOWED_EMAILS,
  );
  return createGeoTool({ ...env, allowDonations });
}

export async function agent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      context.error(`[agent] Missing env var: ${key}`);
      return failJson(500, `Server configuration error: missing ${key}`);
    }
  }

  let body: { messages?: unknown; conversation_id?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown; conversation_id?: unknown };
  } catch {
    return failJson(400, "Invalid JSON body");
  }

  const history = sanitizeHistory(body.messages);
  if (history.length === 0) {
    return failJson(400, "messages est requis (au moins un message user)");
  }
  if (history[history.length - 1].role !== "user") {
    return failJson(400, "Le dernier message doit être de rôle user");
  }

  // Après la validation du corps (une requête malformée ne consomme pas le
  // quota d'un usager légitime) mais avant tout appel au déploiement AOAI
  // partagé — c'est lui que ce plafond protège (epic z0v).
  const rateLimited = await checkRateLimit(auth, context, { bucket: "agent", headers: CORS_HEADERS });
  if (rateLimited) return rateLimited;

  const env: AgentEnv = Object.fromEntries(
    REQUIRED_ENV.map((k) => [k, process.env[k] as string]),
  ) as unknown as AgentEnv;
  env.AGENT_CHAT_DEPLOYMENT = process.env.AGENT_CHAT_DEPLOYMENT;

  const microdataConfig: MicrodataConfig = {
    storage: {
      account: process.env.AZURE_STORAGE_ACCOUNT!,
      key: process.env.AZURE_STORAGE_KEY!,
      container: process.env.AZURE_STORAGE_CONTAINER!,
    },
  };
  const microdata: MicrodataProvider = {
    crosstab: (params) => {
      if (!isMicrodataSurveyAccessible(auth.tenant, params.survey_id)) {
        throw new MicrodataError(404, "Survey not found");
      }
      return handleMicrodataQuery(params, microdataConfig);
    },
    manifest: async () => {
      const manifest = await fetchManifest(microdataConfig);
      return { surveys: manifest.surveys.filter((s) => isMicrodataSurveyAccessible(auth.tenant, s.survey_id)) };
    },
  };

  const usage = { clientId: resolveClientId(request.headers), requestId: newRequestId() };
  const indexes = resolveAccessibleQuestionIndexes(auth.tenant);
  const conversationId = typeof body.conversation_id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(body.conversation_id)
    ? body.conversation_id
    : undefined;
  const geoEnv = buildGeoToolEnv(context);
  const runPython = await buildRunPythonTool({ auth, conversationId, microdataConfig, context, geoEnv });
  const geoTool = buildGeoTool(geoEnv, auth);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(sseFrame(payload)));
      try {
        for await (const ev of runAgentStream(history, env, microdata, { usage, indexes, runPython, geoTool })) {
          send(ev);
        }
      } catch (err) {
        if (err instanceof AgentRateLimitError) {
          send({ type: "error", kind: "rate_limit", retry_after_ms: err.retryAfterMs });
        } else {
          context.error("[agent] stream failed:", err);
          send({
            type: "error",
            kind: "failed",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return { status: 200, headers: SSE_HEADERS, body: stream };
}

app.http("agent", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "agent",
  handler: agent,
});
