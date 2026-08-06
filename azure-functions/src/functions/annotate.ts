/**
 * Azure Function — /annotate (portage de netlify/functions/annotate.ts, f3i.1)
 * Cf. `azure-functions/src/functions/search.ts` pour le pattern de portage.
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import {
  annotateBatch,
  MAX_ITEMS_PER_CALL,
  RateLimitError,
  type AnnotateEnv,
  type AnnotationItem,
} from "../../../src/logic/annotate";
import { newRequestId, resolveClientId } from "../../../src/logic/costlog";
import { checkAuth } from "../middleware/auth-transitional";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const MAX_OPTIONS = 12;

interface AnnotateBody {
  property?: string;
  options?: string[];
  question_text?: string;
  items?: AnnotationItem[];
  with_reason?: boolean;
}

const fail = (status: number, error: string, extra: Record<string, unknown> = {}): HttpResponseInit => ({
  status,
  headers: CORS_HEADERS,
  jsonBody: { error, ...extra },
});

export async function annotate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (request.method === "OPTIONS") {
    return { status: 200, headers: CORS_HEADERS, body: "" };
  }

  const auth = await checkAuth(request, context);
  if (!("userId" in auth)) return auth;

  for (const key of ["AOAI_ENDPOINT", "AOAI_KEY", "AOAI_CHAT_DEPLOYMENT"] as const) {
    if (!process.env[key]) {
      context.error(`[annotate] Missing env var: ${key}`);
      return fail(500, `Server configuration error: missing ${key}`);
    }
  }

  let body: AnnotateBody;
  try {
    body = (await request.json()) as AnnotateBody;
  } catch {
    return fail(400, "Invalid JSON body");
  }

  const property = body.property?.trim() ?? "";
  const questionText = body.question_text?.trim() ?? "";
  const options = (body.options ?? []).map((o) => String(o).trim()).filter(Boolean);
  const items = (body.items ?? []).filter(
    (it): it is AnnotationItem => Boolean(it && typeof it.id === "string" && typeof it.text === "string"),
  );

  if (!property) return fail(400, "property est requis");
  if (options.length < 2) return fail(400, "Au moins deux étiquettes sont requises");
  if (options.length > MAX_OPTIONS) return fail(400, `Maximum ${MAX_OPTIONS} étiquettes`);
  if (items.length === 0) return fail(400, "items est requis");
  if (items.length > MAX_ITEMS_PER_CALL) {
    return fail(400, `Maximum ${MAX_ITEMS_PER_CALL} réponses par appel`);
  }

  const env: AnnotateEnv = {
    AOAI_ENDPOINT: process.env.AOAI_ENDPOINT ?? "",
    AOAI_KEY: process.env.AOAI_KEY ?? "",
    AOAI_CHAT_DEPLOYMENT: process.env.AOAI_CHAT_DEPLOYMENT ?? "",
  };

  try {
    const result = await annotateBatch(
      items,
      { property, options, questionText },
      env,
      {
        withReason: Boolean(body.with_reason),
        usage: { clientId: resolveClientId(request.headers), requestId: newRequestId() },
      },
    );
    return { status: 200, headers: CORS_HEADERS, jsonBody: result };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return fail(429, "Quota du modèle atteint", { retry_after_ms: err.retryAfterMs });
    }
    context.error("[annotate] request failed:", err);
    return fail(502, "Annotation échouée", { details: err instanceof Error ? err.message : String(err) });
  }
}

app.http("annotate", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "annotate",
  handler: annotate,
});
