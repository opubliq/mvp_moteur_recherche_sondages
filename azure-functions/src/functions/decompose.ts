/**
 * Azure Function — /decompose (portage de netlify/functions/decompose.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { decomposeQuery, type DecomposeEnv } from "../../../src/logic/decompose";
import { newRequestId, resolveClientId } from "../../../src/logic/costlog";
import { checkAuth } from "../middleware/auth";
import { checkRateLimit } from "../middleware/ratelimit";
import { resolveDecomposePolicy } from "../../../src/logic/ratelimit";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

interface DecomposeBody {
  query: string;
}

export async function decompose(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  const requiredEnv = ["FOUNDRY_CHAT_ENDPOINT", "FOUNDRY_CHAT_KEY", "FOUNDRY_CHAT_DEPLOYMENT"] as const;
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      context.error(`[decompose] Missing env var: ${key}`);
      return { status: 500, headers: CORS_HEADERS, jsonBody: { error: `Server configuration error: missing ${key}` } };
    }
  }

  let body: DecomposeBody;
  try {
    body = (await request.json()) as DecomposeBody;
  } catch {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "Invalid JSON body" } };
  }

  const { query } = body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return { status: 400, headers: CORS_HEADERS, jsonBody: { error: "query is required" } };
  }

  // Après validation du corps mais avant l'appel au déploiement `gpt-5.4-mini`
  // partagé avec un autre projet — c'est lui que ce plafond protège (epic z0v).
  const rateLimited = await checkRateLimit(auth, context, {
    bucket: "decompose",
    policy: resolveDecomposePolicy(process.env),
    headers: CORS_HEADERS,
  });
  if (rateLimited) return rateLimited;

  const env: DecomposeEnv = {
    FOUNDRY_CHAT_ENDPOINT: process.env.FOUNDRY_CHAT_ENDPOINT ?? "",
    FOUNDRY_CHAT_KEY: process.env.FOUNDRY_CHAT_KEY ?? "",
    FOUNDRY_CHAT_DEPLOYMENT: process.env.FOUNDRY_CHAT_DEPLOYMENT ?? "",
  };

  try {
    const usage = { clientId: resolveClientId(request.headers), requestId: newRequestId() };
    const { concepts, rerankQuery } = await decomposeQuery(query, env, usage);

    return {
      status: 200,
      headers: CORS_HEADERS,
      jsonBody: { concepts, rerank_query: rerankQuery },
    };
  } catch (err) {
    context.error("[decompose] Request failed:", err);
    return {
      status: 502,
      headers: CORS_HEADERS,
      jsonBody: { error: "Failed to decompose query", details: err instanceof Error ? err.message : String(err) },
    };
  }
}

app.http("decompose", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "decompose",
  handler: decompose,
});
