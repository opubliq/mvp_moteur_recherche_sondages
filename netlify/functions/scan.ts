/**
 * Netlify Function — /scan (scanner de réponses libres)
 *
 * POST { question_text, items[{text}] }
 *   → { property, labels[], rationale?, usage? }
 *
 * Lit un ÉCHANTILLON de réponses et propose une grille d'annotation (une
 * propriété à distinguer + ses étiquettes). C'est l'amorce du cold start de
 * l'annotation (jsu.6) : elle préremplit la carte, l'utilisateur corrige puis
 * essaie. Un seul appel LLM, sans mémoire, qui n'écrit rien — comme /annotate,
 * les résultats sont éphémères et RAW-FIRST.
 *
 * Le 429 d'Azure est relayé tel quel avec son délai : le déploiement gpt-5-mini
 * est plafonné (30 req/min, 30 000 tokens/min) et le scan partage ce quota avec
 * les runs d'annotation.
 *
 * Vars d'env requises : AOAI_ENDPOINT, AOAI_KEY, AOAI_CHAT_DEPLOYMENT.
 */

import type { Handler } from "@netlify/functions";
import { scanSample, ScanRateLimitError, type ScanEnv, type ScanItem } from "../../src/logic/scan";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

/** Au-delà, l'échantillon ne tient plus dans le budget d'un appel synchrone (cf. SCAN_SAMPLE_SIZE, + marge). */
const MAX_ITEMS = 80;

interface ScanBody {
  question_text?: string;
  items?: Array<{ text?: unknown }>;
}

const fail = (statusCode: number, error: string, extra: Record<string, unknown> = {}) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ error, ...extra }),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return fail(405, "Method Not Allowed");
  }

  for (const key of ["AOAI_ENDPOINT", "AOAI_KEY", "AOAI_CHAT_DEPLOYMENT"] as const) {
    if (!process.env[key]) {
      console.error(`[scan] Missing env var: ${key}`);
      return fail(500, `Server configuration error: missing ${key}`);
    }
  }

  let body: ScanBody;
  try {
    body = JSON.parse(event.body ?? "{}") as ScanBody;
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
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof ScanRateLimitError) {
      return fail(429, "Quota du modèle atteint", { retry_after_ms: err.retryAfterMs });
    }
    console.error("[scan] request failed:", err);
    return fail(502, "Scan échoué", { details: err instanceof Error ? err.message : String(err) });
  }
};
