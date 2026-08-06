/**
 * Netlify Function — /agent (beads aat.1, streaming aat.4)
 *
 * POST { messages: [{ role: "user"|"assistant", content: string }] }
 *   → flux SSE (text/event-stream) : une suite d'`AgentEvent` encodés
 *     `data: <json>\n\n`, terminée par un event `{ type:"done", result }`.
 *
 * Format de fonction Netlify **v2** (`export default (Request) => Response`),
 * choisi EXPRÈS : le corps de la réponse est un `ReadableStream` Web standard,
 * exactement l'API de streaming qu'Azure Functions (modèle Node v4) expose aussi.
 * Lors de l'epic b1d (migration hors Netlify), SEUL ce fichier est à re-porter —
 * l'orchestration vit dans `src/logic/agent.ts` et n'y touche pas.
 *
 * Adaptateur MINCE : parse la requête, valide l'env, injecte endpoints/clés +
 * accès micro-données dans `runAgentStream`, ré-encode chaque event en SSE. La
 * clé AOAI et la clé de stockage ne quittent JAMAIS le serveur : la boucle tourne
 * côté fonction, le client n'envoie/reçoit que le fil de messages + les events.
 *
 * Le mur ~10 s d'une fonction synchrone ne s'applique plus tel quel : les octets
 * du flux gardent la connexion vivante (et disparaîtra sur Azure, timeout large).
 *
 * Vars d'env requises (serveur only) : AOAI_ENDPOINT, AOAI_KEY, AOAI_CHAT_DEPLOYMENT,
 *   AOAI_EMBED_DEPLOYMENT, SEARCH_ENDPOINT, SEARCH_QUERY_KEY, COHERE_RERANK_ENDPOINT,
 *   COHERE_RERANK_DEPLOYMENT, COHERE_RERANK_KEY, AZURE_STORAGE_ACCOUNT,
 *   AZURE_STORAGE_KEY, AZURE_STORAGE_CONTAINER.
 */

import {
  runAgentStream,
  AgentRateLimitError,
  type AgentEnv,
  type ChatMessage,
  type MicrodataProvider,
} from "../../src/logic/agent";
import { newRequestId, resolveClientId } from "../../src/logic/costlog";
import { isMicrodataSurveyAccessible, resolveAccessibleQuestionIndexes, resolveAuthorizedTenant } from "../../src/logic/tenancy";
import { MicrodataError, handleMicrodataQuery, fetchManifest, type MicrodataConfig } from "./microdata-core/core.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** En-têtes du flux SSE (CORS inclus). `no-transform` empêche tout tampon proxy. */
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

/** Plafond de messages du fil (borne la taille du POST et le coût). */
const MAX_HISTORY = 40;

/** Réponse d'erreur JSON classique (avant l'ouverture du flux). */
const failJson = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

/** Ne garde que les messages user/assistant textuels du client (le reste est reconstruit). */
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

/** Encode un objet en une frame SSE `data: <json>\n\n` (JSON sur une seule ligne). */
function sseFrame(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 200, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return failJson(405, "Method Not Allowed");
  }

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`[agent] Missing env var: ${key}`);
      return failJson(500, `Server configuration error: missing ${key}`);
    }
  }

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
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

  const env: AgentEnv = Object.fromEntries(
    REQUIRED_ENV.map((k) => [k, process.env[k] as string]),
  ) as unknown as AgentEnv;

  // Accès micro-données injecté depuis le cœur portable (côté Node) : garde le
  // module d'orchestration `src/logic/agent.ts` libre de toute dépendance Node.
  const microdataConfig: MicrodataConfig = {
    storage: {
      account: process.env.AZURE_STORAGE_ACCOUNT!,
      key: process.env.AZURE_STORAGE_KEY!,
      container: process.env.AZURE_STORAGE_CONTAINER!,
    },
  };
  // Isolation multi-tenant (f3i.14) : l'outil micro-données de l'agent passait
  // directement par le cœur portable, sans jamais consulter le tenant résolu —
  // un sondage privé (ex. `medaillon_organismes_qualitatif`, opubliq) était donc
  // interrogeable par n'importe quel compte via l'agent. Filtre ici, au même
  // point d'injection que les index catalogue (`resolveAccessibleQuestionIndexes`
  // juste en dessous).
  const tenant = resolveAuthorizedTenant(req.headers);

  const microdata: MicrodataProvider = {
    crosstab: (params) => {
      if (!isMicrodataSurveyAccessible(tenant, params.survey_id)) {
        throw new MicrodataError(404, "Survey not found");
      }
      return handleMicrodataQuery(params, microdataConfig);
    },
    manifest: async () => {
      const manifest = await fetchManifest(microdataConfig);
      return { surveys: manifest.surveys.filter((s) => isMicrodataSurveyAccessible(tenant, s.survey_id)) };
    },
  };

  // Identité d'usage de la requête agent (epic 97r, ticket 97r.5) : un request_id
  // unique qui corrèle les lignes agent_turn de la boucle ET les embed/rerank des
  // /search déclenchés, au crédit du tenant résolu des en-têtes.
  const usage = { clientId: resolveClientId(req.headers), requestId: newRequestId() };

  // Index accessibles : résolus côté serveur depuis le Basic Auth uniquement
  // (jamais depuis une entrée du client) — cf f3i.11 / src/logic/tenancy.ts.
  const indexes = resolveAccessibleQuestionIndexes(tenant);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(sseFrame(payload)));
      try {
        for await (const ev of runAgentStream(history, env, microdata, { usage, indexes })) {
          send(ev);
        }
      } catch (err) {
        // Le flux SSE a déjà un statut 200 : une erreur en cours de boucle ne peut
        // plus devenir un 429/502 HTTP, on la relaie DANS le flux. Le client mappe
        // `rate_limit` sur son compte à rebours, comme l'ancien 429 JSON.
        if (err instanceof AgentRateLimitError) {
          send({ type: "error", kind: "rate_limit", retry_after_ms: err.retryAfterMs });
        } else {
          console.error("[agent] stream failed:", err);
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

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
};
