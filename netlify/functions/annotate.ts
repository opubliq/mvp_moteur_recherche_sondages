/**
 * Netlify Function — /annotate (bead jsu.6)
 *
 * POST { property, options[], question_text, items[{id,text}], with_reason? }
 *   → { annotations: { [id]: { label, reason? } }, missing[], usage? }
 *
 * Annote UN PAQUET de réponses libres, pas un run. Les fonctions du projet sont
 * synchrones (aucune background function dans `netlify.toml`, ~10 s de budget) :
 * l'orchestration — découpage, cadence, reprise, progression — vit côté client
 * (`src/lib/annotationRun.ts`). Cette fonction est volontairement sans mémoire.
 *
 * Elle n'écrit rien nulle part : les annotations sont éphémères par décision du
 * bead et ne doivent pas entrer dans les Parquet, qui restent RAW-FIRST et
 * régénérables idempotemment depuis les `.sav`.
 *
 * Le 429 d'Azure est relayé TEL QUEL au client, avec le délai d'attente : le
 * déploiement gpt-5-mini est plafonné à 30 req/min et 30 000 tokens/min, un run
 * complet frôle donc le quota en régime normal. Transformer ça en 502 ferait
 * abandonner un batch là où il suffisait d'attendre vingt secondes.
 *
 * Vars d'env requises : AOAI_ENDPOINT, AOAI_KEY, AOAI_CHAT_DEPLOYMENT.
 */

import type { Handler } from "@netlify/functions";
import {
  annotateBatch,
  MAX_ITEMS_PER_CALL,
  RateLimitError,
  type AnnotateEnv,
  type AnnotationItem,
} from "../../src/logic/annotate";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

/** Au-delà, ce n'est plus une propriété à annoter mais une taxonomie — et le prompt s'effondre. */
const MAX_OPTIONS = 12;

interface AnnotateBody {
  property?: string;
  options?: string[];
  question_text?: string;
  items?: AnnotationItem[];
  with_reason?: boolean;
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
      console.error(`[annotate] Missing env var: ${key}`);
      return fail(500, `Server configuration error: missing ${key}`);
    }
  }

  let body: AnnotateBody;
  try {
    body = JSON.parse(event.body ?? "{}") as AnnotateBody;
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
      { withReason: Boolean(body.with_reason) },
    );
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result) };
  } catch (err) {
    if (err instanceof RateLimitError) {
      return fail(429, "Quota du modèle atteint", { retry_after_ms: err.retryAfterMs });
    }
    console.error("[annotate] request failed:", err);
    return fail(502, "Annotation échouée", { details: err instanceof Error ? err.message : String(err) });
  }
};
