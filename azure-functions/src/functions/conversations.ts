/**
 * Azure Function — /conversations, /conversations/{id} (f3i.19.5)
 *
 * Historique de chat serveur, en remplacement du localStorage de
 * `src/logic/conversations.ts` (bascule frontend : f3i.19.6). Toujours
 * protégé par `checkAuth` — pas de mode anonyme : une identité `checkAuth`
 * "basic:*" (repli legacy) est acceptée comme n'importe quelle autre, mais
 * aucune route ici ne fonctionne sans identité résolue.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import {
  listConversations,
  loadConversation,
  saveConversation,
  renameConversation,
  deleteConversation,
  type ConversationBody,
  type ConversationStoreEnv,
} from "../logic/conversations-store";
import { checkAuth } from "../middleware/auth-transitional";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const TITLE_MAX = 64;

function storageEnv(context: InvocationContext): ConversationStoreEnv | undefined {
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) {
    context.error("[conversations] Missing env var: AZURE_STORAGE_ACCOUNT/AZURE_STORAGE_KEY");
    return undefined;
  }
  return { account, key };
}

const fail = (status: number, error: string): HttpResponseInit => ({ status, headers: CORS_HEADERS, jsonBody: { error } });

/** Même dérivation que l'ancienne version localStorage — première ligne du premier message utilisateur. */
function deriveTitle(body: ConversationBody): string {
  const messages = body.messages as Array<{ role?: string; content?: unknown }>;
  const first = messages.find((m) => m?.role === "user" && typeof m.content === "string" && m.content.trim());
  const text = (first?.content as string | undefined)?.trim().split("\n")[0] ?? "";
  if (!text) return "Nouvelle conversation";
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}

async function handleList(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  const env = storageEnv(context);
  if (!env) return fail(500, "Server configuration error");

  const metas = await listConversations(auth.userId, env);
  return { status: 200, headers: CORS_HEADERS, jsonBody: metas };
}

async function handleGet(auth: { userId: string }, id: string, env: ConversationStoreEnv): Promise<HttpResponseInit> {
  const conversation = await loadConversation(auth.userId, id, env);
  if (!conversation) return fail(404, "Conversation introuvable");
  return { status: 200, headers: CORS_HEADERS, jsonBody: conversation };
}

async function handlePut(
  request: HttpRequest,
  auth: { userId: string },
  id: string,
  env: ConversationStoreEnv,
): Promise<HttpResponseInit> {
  let payload: { messages?: unknown; traceByIndex?: unknown; title?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return fail(400, "Invalid JSON body");
  }
  if (!Array.isArray(payload.messages)) return fail(400, "messages est requis (tableau)");

  const body: ConversationBody = {
    messages: payload.messages,
    traceByIndex: (payload.traceByIndex as Record<number, unknown[]>) ?? {},
  };
  const title = typeof payload.title === "string" ? payload.title : undefined;

  const meta = await saveConversation(auth.userId, id, body, { title, deriveTitle }, env);
  return { status: 200, headers: CORS_HEADERS, jsonBody: meta };
}

async function handlePatch(
  request: HttpRequest,
  auth: { userId: string },
  id: string,
  env: ConversationStoreEnv,
): Promise<HttpResponseInit> {
  let payload: { title?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return fail(400, "Invalid JSON body");
  }
  if (typeof payload.title !== "string" || !payload.title.trim()) return fail(400, "title est requis (chaîne non vide)");

  const clean = payload.title.trim().slice(0, TITLE_MAX);
  const found = await renameConversation(auth.userId, id, clean, env);
  if (!found) return fail(404, "Conversation introuvable");
  return { status: 204, headers: CORS_HEADERS };
}

async function handleDelete(auth: { userId: string }, id: string, env: ConversationStoreEnv): Promise<HttpResponseInit> {
  await deleteConversation(auth.userId, id, env);
  return { status: 204, headers: CORS_HEADERS };
}

async function conversationItem(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  const env = storageEnv(context);
  if (!env) return fail(500, "Server configuration error");

  const id = request.params.id;
  if (!id) return fail(400, "id est requis");

  switch (request.method) {
    case "GET":
      return handleGet(auth, id, env);
    case "PUT":
      return handlePut(request, auth, id, env);
    case "PATCH":
      return handlePatch(request, auth, id, env);
    case "DELETE":
      return handleDelete(auth, id, env);
    default:
      return fail(405, "Method not allowed");
  }
}

app.http("conversations-list", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "conversations",
  handler: handleList,
});

app.http("conversations-item", {
  methods: ["GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "conversations/{id}",
  handler: conversationItem,
});
