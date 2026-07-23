/**
 * Netlify Function — /agent (bead aat.1)
 *
 * POST { messages: [{ role: "user"|"assistant", content: string }] }
 *   → { message, messages, trace, iterations, stopped_reason }
 *
 * Adaptateur MINCE : parse la requête HTTP, valide l'env, injecte les
 * endpoints/clés dans la boucle tool-use (`src/logic/agent.ts`), sérialise la
 * réponse. Aucune logique d'orchestration ici — elle vit dans le module partagé,
 * testable hors runtime Netlify.
 *
 * La clé AOAI et la clé de stockage ne quittent JAMAIS le serveur : la boucle
 * tourne côté fonction, le client n'envoie/reçoit que le fil de messages.
 *
 * LIMITE (documentée, cf. src/logic/agent.ts) : fonction SYNCHRONE, ~10 s de
 * budget Netlify. Une chaîne longue d'outils peut être coupée par la plateforme.
 * Le streaming / la déportation de la boucle relèvent de aat.3.
 *
 * Vars d'env requises (serveur only) : AOAI_ENDPOINT, AOAI_KEY, AOAI_CHAT_DEPLOYMENT,
 *   AOAI_EMBED_DEPLOYMENT, SEARCH_ENDPOINT, SEARCH_QUERY_KEY, COHERE_RERANK_ENDPOINT,
 *   COHERE_RERANK_DEPLOYMENT, COHERE_RERANK_KEY, AZURE_STORAGE_ACCOUNT,
 *   AZURE_STORAGE_KEY, AZURE_STORAGE_CONTAINER.
 */

import type { Handler } from "@netlify/functions";
import {
  runAgent,
  AgentRateLimitError,
  type AgentEnv,
  type ChatMessage,
  type MicrodataProvider,
} from "../../src/logic/agent";
import { handleMicrodataQuery, fetchManifest, type MicrodataConfig } from "./microdata-core/core.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
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

const fail = (statusCode: number, error: string, extra: Record<string, unknown> = {}) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ error, ...extra }),
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

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return fail(405, "Method Not Allowed");
  }

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      console.error(`[agent] Missing env var: ${key}`);
      return fail(500, `Server configuration error: missing ${key}`);
    }
  }

  let body: { messages?: unknown };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return fail(400, "Invalid JSON body");
  }

  const history = sanitizeHistory(body.messages);
  if (history.length === 0) {
    return fail(400, "messages est requis (au moins un message user)");
  }
  if (history[history.length - 1].role !== "user") {
    return fail(400, "Le dernier message doit être de rôle user");
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
  const microdata: MicrodataProvider = {
    crosstab: (params) => handleMicrodataQuery(params, microdataConfig),
    manifest: () => fetchManifest(microdataConfig),
  };

  try {
    const result = await runAgent(history, env, microdata);
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof AgentRateLimitError) {
      return fail(429, "Quota du modèle atteint", { retry_after_ms: err.retryAfterMs });
    }
    console.error("[agent] loop failed:", err);
    return fail(502, "Agent échoué", { details: err instanceof Error ? err.message : String(err) });
  }
};
