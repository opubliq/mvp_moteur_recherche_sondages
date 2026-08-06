/**
 * Azure Function — /auth/signup, /auth/login, /auth/logout, /auth/me (f3i.19.1)
 *
 * Premier étage du remplacement du Basic Auth global (`../middleware/auth.ts`)
 * par de vrais comptes. Pas encore branché sur les autres handlers (aucun
 * changement de comportement pour eux) — cf. f3i.19.2/.3 pour la bascule.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { signup, login, logout, verifySession, type AuthStoreEnv, type AuthSession } from "../logic/auth-store";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

interface CredentialsBody {
  email?: string;
  password?: string;
}

function storageEnv(context: InvocationContext): AuthStoreEnv | undefined {
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) {
    context.error("[auth] Missing env var: AZURE_STORAGE_ACCOUNT/AZURE_STORAGE_KEY");
    return undefined;
  }
  return { account, key, passwordPepper: process.env.PASSWORD_PEPPER };
}

function bearerToken(request: HttpRequest): string | undefined {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : undefined;
}

function sessionJson(session: AuthSession): HttpResponseInit["jsonBody"] {
  return { token: session.token, user: { userId: session.userId, email: session.email, tenant: session.tenant } };
}

async function readCredentials(request: HttpRequest): Promise<CredentialsBody | undefined> {
  try {
    return (await request.json()) as CredentialsBody;
  } catch {
    return undefined;
  }
}

async function handleSignup(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const env = storageEnv(context);
  if (!env) return { status: 500, headers: CORS_HEADERS, jsonBody: { error: "Server configuration error" } };

  const body = await readCredentials(request);
  if (!body?.email || !body?.password) {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "email and password are required" } };
  }

  const result = await signup(body.email, body.password, env);
  if ("error" in result) {
    const status = result.error === "email_taken" ? 409 : 400;
    return { status, headers: CORS_HEADERS, jsonBody: { error: result.error } };
  }
  return { status: 201, headers: CORS_HEADERS, jsonBody: sessionJson(result) };
}

async function handleLogin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const env = storageEnv(context);
  if (!env) return { status: 500, headers: CORS_HEADERS, jsonBody: { error: "Server configuration error" } };

  const body = await readCredentials(request);
  if (!body?.email || !body?.password) {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "email and password are required" } };
  }

  const result = await login(body.email, body.password, env);
  if ("error" in result) {
    return { status: 401, headers: CORS_HEADERS, jsonBody: { error: "invalid_credentials" } };
  }
  return { status: 200, headers: CORS_HEADERS, jsonBody: sessionJson(result) };
}

async function handleLogout(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const env = storageEnv(context);
  if (!env) return { status: 500, headers: CORS_HEADERS, jsonBody: { error: "Server configuration error" } };

  const token = bearerToken(request);
  if (token) await logout(token, env);
  // Un body (même vide) sur un 204 est rejeté par le runtime Functions (le
  // Response Fetch standard interdit un body sur 204/205/304) — pas de `body`.
  return { status: 204, headers: CORS_HEADERS };
}

async function handleMe(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") return { status: 200, headers: CORS_HEADERS, body: "" };

  const env = storageEnv(context);
  if (!env) return { status: 500, headers: CORS_HEADERS, jsonBody: { error: "Server configuration error" } };

  const token = bearerToken(request);
  const identity = token ? await verifySession(token, env) : undefined;
  if (!identity) return { status: 401, headers: CORS_HEADERS, jsonBody: { error: "invalid_session" } };
  return { status: 200, headers: CORS_HEADERS, jsonBody: identity };
}

app.http("auth-signup", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "auth/signup", handler: handleSignup });
app.http("auth-login", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "auth/login", handler: handleLogin });
app.http("auth-logout", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "auth/logout", handler: handleLogout });
app.http("auth-me", { methods: ["GET", "OPTIONS"], authLevel: "anonymous", route: "auth/me", handler: handleMe });
