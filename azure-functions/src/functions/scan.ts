/**
 * Azure Function — /scan (portage de netlify/functions/scan.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { scanSample, ScanRateLimitError, type ScanEnv, type ScanItem } from "../../../src/logic/scan";
import { checkAuth } from "../middleware/auth-transitional";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const MAX_ITEMS = 80;

interface ScanBody {
  question_text?: string;
  items?: Array<{ text?: unknown }>;
}

const fail = (status: number, error: string, extra: Record<string, unknown> = {}): HttpResponseInit => ({
  status,
  headers: CORS_HEADERS,
  jsonBody: { error, ...extra },
});

export async function scan(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of ["AOAI_ENDPOINT", "AOAI_KEY", "AOAI_CHAT_DEPLOYMENT"] as const) {
    if (!process.env[key]) {
      context.error(`[scan] Missing env var: ${key}`);
      return fail(500, `Server configuration error: missing ${key}`);
    }
  }

  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return fail(400, "Invalid JSON body");
  }

  const questionText = body.question_text?.trim() ?? "";
  const items: ScanItem[] = (body.items ?? [])
    .map((it) => ({ text: typeof it?.text === "string" ? it.text : "" }))
    .filter((it) => it.text.trim().length > 0);

  if (!questionText) return fail(400, "question_text est requis");
  if (items.length === 0) return fail(400, "items est requis (échantillon non vide)");
  if (items.length > MAX_ITEMS) return fail(400, `Maximum ${MAX_ITEMS} réponses par scan`);

  const env: ScanEnv = {
    AOAI_ENDPOINT: process.env.AOAI_ENDPOINT ?? "",
    AOAI_KEY: process.env.AOAI_KEY ?? "",
    AOAI_CHAT_DEPLOYMENT: process.env.AOAI_CHAT_DEPLOYMENT ?? "",
  };

  try {
    const result = await scanSample(items, questionText, env);
    return { status: 200, headers: CORS_HEADERS, jsonBody: result };
  } catch (err) {
    if (err instanceof ScanRateLimitError) {
      return fail(429, "Quota du modèle atteint", { retry_after_ms: err.retryAfterMs });
    }
    context.error("[scan] request failed:", err);
    return fail(502, "Scan échoué", { details: err instanceof Error ? err.message : String(err) });
  }
}

app.http("scan", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "scan",
  handler: scan,
});
