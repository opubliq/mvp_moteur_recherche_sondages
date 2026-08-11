/**
 * Middleware de rate limiting par client (epic z0v).
 *
 * S'appelle juste après `checkAuth` dans un handler — il a besoin de l'identité
 * authentifiée, et il ne sert à rien de compter les requêtes qui repartent en
 * 401. Même contrat que `checkAuth` : renvoie `undefined` si la requête passe,
 * ou une `HttpResponseInit` (429) à retourner telle quelle.
 *
 * Réutilisable sur n'importe quel endpoint coûteux : chaque appelant fournit
 * son `bucket` (compteurs indépendants) et ses en-têtes CORS.
 */

import type { InvocationContext, HttpResponseInit } from "@azure/functions";
import { consumeQuota, resolveAgentPolicy, resolveRateLimitSubject, type RateLimitPolicy } from "../../../src/logic/ratelimit";
import { createTableCounterStore, type RateLimitStoreEnv } from "../logic/ratelimit-store";

export interface RateLimitOptions {
  /** Compteur logique, un par endpoint coûteux (défaut : `agent`). */
  bucket?: string;
  headers?: Record<string, string>;
  /** Défaut : la politique `/agent` lue dans les App Settings. */
  policy?: RateLimitPolicy;
}

function storageEnv(): RateLimitStoreEnv | undefined {
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) return undefined;
  return { account, key };
}

/**
 * Vérifie (et consomme) le quota du client de cette requête.
 *
 * Fail-open sur configuration absente ou stockage muet : cf. `consumeQuota`,
 * ce mécanisme protège l'infra partagée, il ne garde pas la porte.
 */
export async function checkRateLimit(
  auth: { userId: string; tenant?: string },
  context: InvocationContext,
  opts: RateLimitOptions = {},
): Promise<HttpResponseInit | undefined> {
  const policy = opts.policy ?? resolveAgentPolicy(process.env);
  if (policy.length === 0) return undefined;

  const env = storageEnv();
  if (!env) {
    context.warn("[ratelimit] AZURE_STORAGE_ACCOUNT/KEY absents : quota non appliqué.");
    return undefined;
  }

  const bucket = opts.bucket ?? "agent";
  const subject = resolveRateLimitSubject(auth);
  const decision = await consumeQuota(subject, policy, createTableCounterStore(env), { bucket });

  if (decision.degraded) {
    context.warn(`[ratelimit] compteurs indisponibles pour ${subject} (${bucket}) : requête laissée passer.`);
  }
  if (decision.allowed) return undefined;

  const retryAfterMs = decision.retryAfterMs ?? 60_000;
  context.warn(
    `[ratelimit] quota dépassé — client=${subject} bucket=${bucket} fenêtre=${decision.window?.name} limite=${decision.window?.limit}`,
  );

  return {
    status: 429,
    headers: {
      ...(opts.headers ?? {}),
      "Content-Type": "application/json",
      "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
    },
    // `retry_after_ms` : forme déjà attendue par le client (`src/api.ts`, qui
    // en fait un compte à rebours), identique au 429 relayé d'Azure OpenAI.
    jsonBody: {
      error: "Limite d'utilisation atteinte pour ce compte.",
      retry_after_ms: retryAfterMs,
      window: decision.window?.name,
      limit: decision.window?.limit,
    },
  };
}
