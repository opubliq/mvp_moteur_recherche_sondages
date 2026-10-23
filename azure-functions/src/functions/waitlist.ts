/**
 * Azure Function — POST /waitlist : courriel laissé sur la page « en pause ».
 * Anonyme ; ne dépend ni de Search ni des LLM (seulement Table Storage).
 */

import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { addToWaitlist, normalizeEmail } from "../logic/waitlist-store";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

async function waitlist(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === "OPTIONS") return { status: 204, headers: CORS_HEADERS };

  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) {
    context.error("[waitlist] AZURE_STORAGE_ACCOUNT/KEY absents.");
    return { status: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "storage_unconfigured" }) };
  }

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return { status: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "invalid_json" }) };
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
  if (!email) return { status: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "invalid_email" }) };

  await addToWaitlist({ account, key }, email);
  return { status: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
}

app.http("waitlist", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "waitlist",
  handler: waitlist,
});
