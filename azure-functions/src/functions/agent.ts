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
import { MicrodataError, handleMicrodataQuery, fetchManifest, type MicrodataConfig } from "../microdata-core/core";
import { checkAuth } from "../middleware/auth-transitional";
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

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(sseFrame(payload)));
      try {
        for await (const ev of runAgentStream(history, env, microdata, { usage, indexes })) {
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
