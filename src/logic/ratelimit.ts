/**
 * Rate limiting par client — epic z0v.
 *
 * PROBLÈME. Les déploiements Azure OpenAI partagés par tous les clients du
 * projet (`gpt-5-mini` pour `/agent`, `gpt-5.4-mini` pour `/decompose` — ce
 * dernier PARTAGÉ AVEC UN AUTRE PROJET, cf. `pricing/STRATEGIE_PRICING.md`
 * §Garde-fous techniques, la source de l'epic z0v) peuvent être épuisés par un
 * seul appelant en boucle (script buggé, abus), causant des 429 chez tous les
 * autres — y compris, pour `gpt-5.4-mini`, chez un projet qui n'a rien à voir
 * avec celui-ci. Il faut un plafond par client appliqué AVANT chaque appel.
 *
 * CE QUE CE MODULE N'EST PAS. Pas les forfaits business (Gratuit/Découverte/
 * Actif/Pro, bead sai.1) : ici, un seuil technique unique, volontairement HAUT,
 * dont aucun usager légitime ne doit jamais s'approcher. Il protège l'infra, il
 * ne facture rien.
 *
 * DESIGN. Fenêtres fixes, compteur par (client, fenêtre) dans un store injecté.
 * Zéro dépendance externe ici (le module vit dans `src/logic/`, importable des
 * deux côtés comme `costlog.ts`) : l'implémentation Azure Table Storage est
 * dans `azure-functions/src/logic/ratelimit-store.ts`, ce qui laisse toute la
 * logique de décision testable sans émulateur.
 *
 * POURQUOI PAS UN COMPTEUR EN MÉMOIRE. La Function App tourne en plan **Flex
 * Consumption** (cf. `docs/azure_functions_migration.md`) : scale-out
 * multi-instances et cold starts fréquents. Un compteur process-local serait
 * remis à zéro à chaque instance — soit un plafond réel égal à N × la limite,
 * exactement la garantie qu'on cherche à donner. Table Storage est déjà utilisé
 * pour Users/Sessions/Conversations : pas de nouvelle dépendance, pas de Redis.
 */

import { sanitizeClientId, UNKNOWN_CLIENT_ID } from "./costlog";

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

/**
 * Un tour d'agent dure plusieurs secondes et se déclenche à la main : 30/min
 * (un toutes les 2 s en continu) est hors d'atteinte d'un humain, et 1000/jour
 * dépasse d'un ordre de grandeur la session de travail la plus intense
 * observée. Un script en boucle, lui, franchit les deux en quelques secondes.
 * Ajustables sans redéploiement via App Settings (voir {@link resolveAgentPolicy}).
 */
export const DEFAULT_AGENT_PER_MINUTE = 30;
export const DEFAULT_AGENT_PER_DAY = 1000;

/**
 * `/decompose` tourne à chaque recherche (pas seulement en tour d'agent) :
 * une session de recherche active peut légitimement l'appeler plus souvent
 * qu'un tour d'agent, d'où un plafond plus haut. Reste hors d'atteinte d'un
 * usage manuel normal ; un script qui balaie des requêtes en boucle le
 * franchit en quelques secondes. Ajustables via App Settings (voir
 * {@link resolveDecomposePolicy}).
 */
export const DEFAULT_DECOMPOSE_PER_MINUTE = 60;
export const DEFAULT_DECOMPOSE_PER_DAY = 2000;

export interface RateLimitWindow {
  /** Suffixe de la clé de compteur : le renommer repart d'un compteur vierge. */
  name: string;
  windowMs: number;
  limit: number;
}

export type RateLimitPolicy = RateLimitWindow[];

/**
 * Compteur persisté pour un couple (client, fenêtre). Une seule ligne par
 * couple, réécrite quand la fenêtre tourne — pas une ligne par fenêtre écoulée,
 * qui ferait grossir la table indéfiniment sans mécanisme de purge (Table
 * Storage n'a pas de TTL).
 */
export interface RateLimitCounter {
  count: number;
  windowStart: number;
  /** Jeton de concurrence optimiste, opaque pour ce module. */
  etag: string;
}

/**
 * Accès au stockage des compteurs. `create`/`update` renvoient `false` (et non
 * une exception) quand la ligne a bougé sous nos pieds — le conflit est un cas
 * NORMAL sous concurrence, pas une erreur ; c'est ce qui rend l'incrément
 * atomique sans transaction.
 */
export interface RateLimitCounterStore {
  read(subject: string, key: string): Promise<RateLimitCounter | undefined>;
  /** `false` si la ligne existe déjà (course entre deux requêtes du même client). */
  create(subject: string, key: string, windowStart: number, count: number): Promise<boolean>;
  /** `false` si l'etag ne correspond plus (ligne modifiée entre-temps). */
  update(subject: string, key: string, windowStart: number, count: number, etag: string): Promise<boolean>;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Fenêtre ayant refusé, pour le log et le message d'erreur. */
  window?: RateLimitWindow;
  /** Temps restant avant la fin de cette fenêtre. */
  retryAfterMs?: number;
  /** Le stockage n'a pas répondu : décision prise en fail-open (cf. {@link consumeQuota}). */
  degraded?: boolean;
}

/** Nombre de tentatives d'incrément avant d'abandonner (fail-open) sur conflit. */
const MAX_ATTEMPTS = 4;

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  // Un `0` ou une valeur illisible dans les App Settings bloquerait TOUT LE
  // MONDE : on retombe sur le défaut plutôt que sur un plafond nul. Couper le
  // rate limiting est un geste explicite (`RATE_LIMIT_DISABLED=true`).
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/**
 * Politique minute+jour à partir d'une paire de variables d'env, vide si
 * `RATE_LIMIT_DISABLED=true` — soupape d'urgence commune à tous les buckets
 * pour rouvrir le robinet sans redéployer si un seuil s'avère trop bas.
 */
function resolveMinuteDayPolicy(
  env: Record<string, string | undefined>,
  perMinuteVar: string,
  perDayVar: string,
  defaults: { perMinute: number; perDay: number },
): RateLimitPolicy {
  if (env.RATE_LIMIT_DISABLED === "true") return [];
  return [
    { name: "minute", windowMs: MINUTE_MS, limit: positiveInt(env[perMinuteVar], defaults.perMinute) },
    { name: "day", windowMs: DAY_MS, limit: positiveInt(env[perDayVar], defaults.perDay) },
  ];
}

/** Politique appliquée à `/agent` (déploiement `gpt-5-mini`). */
export function resolveAgentPolicy(env: Record<string, string | undefined>): RateLimitPolicy {
  return resolveMinuteDayPolicy(env, "RATE_LIMIT_AGENT_PER_MINUTE", "RATE_LIMIT_AGENT_PER_DAY", {
    perMinute: DEFAULT_AGENT_PER_MINUTE,
    perDay: DEFAULT_AGENT_PER_DAY,
  });
}

/**
 * Politique appliquée à `/decompose` (déploiement `gpt-5.4-mini`, partagé
 * avec un autre projet — cible nommément citée par l'epic z0v).
 */
export function resolveDecomposePolicy(env: Record<string, string | undefined>): RateLimitPolicy {
  return resolveMinuteDayPolicy(env, "RATE_LIMIT_DECOMPOSE_PER_MINUTE", "RATE_LIMIT_DECOMPOSE_PER_DAY", {
    perMinute: DEFAULT_DECOMPOSE_PER_MINUTE,
    perDay: DEFAULT_DECOMPOSE_PER_DAY,
  });
}

/** Début de la fenêtre fixe contenant `now`. */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

/** Clé de compteur : un endpoint coûteux = un `bucket`, indépendant des autres. */
export function counterKey(bucket: string, windowName: string): string {
  return `${bucket}-${windowName}`;
}

/**
 * Client auquel imputer la consommation. Le tenant PRIME sur l'utilisateur :
 * le quota protège le déploiement partagé entre CLIENTS, donc les comptes d'un
 * même client P2 partagent un seul seau — le débordement d'un de ses usagers
 * reste ainsi confiné à ce client au lieu de manger le TPM des autres. Les
 * comptes P1 (sans tenant) sont eux plafonnés individuellement.
 *
 * Jamais dérivé du header `x-client-id` (falsifiable : il suffirait d'en
 * changer à chaque requête pour repartir d'un compteur vierge) — uniquement de
 * l'identité authentifiée résolue par `checkAuth`, cf. `src/logic/tenancy.ts`
 * qui applique déjà cette règle au contrôle d'accès.
 */
export function resolveRateLimitSubject(auth: { userId?: string; tenant?: string }): string {
  return sanitizeClientId(auth.tenant) ?? sanitizeClientId(auth.userId) ?? UNKNOWN_CLIENT_ID;
}

/**
 * Incrémente un compteur de fenêtre et renvoie sa nouvelle valeur, ou
 * `undefined` si le stockage n'a pas coopéré (erreur ou conflits répétés).
 */
async function increment(
  store: RateLimitCounterStore,
  subject: string,
  key: string,
  start: number,
): Promise<number | undefined> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = await store.read(subject, key);
    if (!current) {
      if (await store.create(subject, key, start, 1)) return 1;
      continue;
    }
    // Fenêtre tournée (ou horloge revenue en arrière) : la ligne repart à 1.
    if (current.windowStart !== start) {
      if (await store.update(subject, key, start, 1, current.etag)) return 1;
      continue;
    }
    const next = current.count + 1;
    if (await store.update(subject, key, start, next, current.etag)) return next;
  }
  return undefined;
}

/**
 * Consomme une unité de quota pour `subject` et décide si la requête passe.
 *
 * FAIL-OPEN ASSUMÉ : si le stockage des compteurs est indisponible, la requête
 * PASSE (avec `degraded: true`). Ce mécanisme protège contre l'abus, il n'est
 * pas un contrôle d'accès — une panne de Table Storage ne doit pas couper
 * l'agent à tous les clients honnêtes. Le vrai garde-fou en cas de panne reste
 * le 429 d'Azure OpenAI lui-même, déjà relayé par la boucle agent.
 *
 * Une requête refusée a quand même incrémenté le compteur : un client qui
 * continue de marteler l'API reste bloqué jusqu'à la fin de sa fenêtre, ce qui
 * est précisément l'effet recherché face à une boucle.
 */
export async function consumeQuota(
  subject: string,
  policy: RateLimitPolicy,
  store: RateLimitCounterStore,
  opts: { now?: number; bucket?: string } = {},
): Promise<RateLimitDecision> {
  const now = opts.now ?? Date.now();
  const bucket = opts.bucket ?? "agent";
  let degraded = false;

  for (const window of policy) {
    const start = windowStart(now, window.windowMs);
    let count: number | undefined;
    try {
      count = await increment(store, subject, counterKey(bucket, window.name), start);
    } catch {
      count = undefined;
    }
    if (count === undefined) {
      degraded = true;
      continue;
    }
    if (count > window.limit) {
      return { allowed: false, window, retryAfterMs: start + window.windowMs - now, degraded };
    }
  }

  return { allowed: true, degraded };
}
