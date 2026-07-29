/**
 * Logging d'usage & coût marginal (epic 97r, bead 97r.1) — module partagé.
 *
 * Fondation d'instrumentation : chaque câblage coûteux (decompose, embed,
 * annotate, rerank, agent_turn) émet une ligne d'usage via `logUsage()`. La
 * sortie est du JSON Lines préfixé `[costlog] {...}` sur `console.log`, agrégeable
 * en aval (collecteur de logs Netlify → coût marginal par client).
 *
 * IDENTITÉ (ticket 97r.5). Les handlers résolvent le tenant à l'entrée avec
 * `resolveClientId(headers)` et propagent un {@link UsageContext} jusqu'aux
 * appels coûteux. D'où vient cette identité au stade actuel : voir le JSDoc de
 * `resolveClientId` (header `x-client-id`, puis user du Basic Auth global).
 *
 * CONTRAINTES.
 *   - Best-effort : `logUsage()` ne throw JAMAIS et ne bloque JAMAIS la requête
 *     (try/catch interne). Un échec de logging est absorbé silencieusement.
 *   - Zéro dépendance externe (contrainte runtime edge/Netlify). `crypto` est un
 *     global standard (Node ≥ 18, Deno, edge) — pas d'import de package.
 *
 * Importable des deux côtés en suivant la convention du repo : depuis
 * `src/logic/` en `./costlog`, depuis `netlify/functions/` en
 * `../../src/logic/costlog` (extensionless, comme l'import de `src/logic/agent`).
 */

/** Opérations instrumentées. Token-based sauf `rerank` (search units Cohere). */
export type CostOp = "decompose" | "embed" | "annotate" | "rerank" | "agent_turn";

export interface UsageRecord {
  /** Tenant ; "unknown" si non résolu à l'entrée du handler. */
  client_id: string;
  /** Corrèle tous les appels d'une même requête. */
  request_id: string;
  op: CostOp;
  /** Absent pour `rerank` (pas de tokens). */
  prompt_tokens?: number;
  completion_tokens?: number;
  /**
   * Part de `prompt_tokens` servie depuis le cache de prompt Azure, quand
   * l'API la rapporte (`usage.prompt_tokens_details.cached_tokens`).
   *
   * POURQUOI ÇA COMPTE (bead 97r.6). Le tarif *cached input* est à **1/10** de
   * l'input normal. Or la boucle agent repaie son system prompt + les schémas
   * d'outils à CHAQUE tour : si Azure les sert depuis le cache, le poste
   * dominant du coût marginal change d'ordre de grandeur. Sous-ensemble de
   * `prompt_tokens`, pas un supplément — le non-caché vaut
   * `prompt_tokens - cached_tokens`.
   *
   * Absent si l'API ne le rapporte pas : on ne suppose alors aucun cache
   * (hypothèse conservatrice retenue par la price card).
   */
  cached_tokens?: number;
  /** Search units Cohere ; absent pour les ops token-based. */
  units?: number;
  latency_ms: number;
  meta?: Record<string, unknown>;
}

/** Préfixe repérable en tête de chaque ligne de log d'usage. */
export const COSTLOG_PREFIX = "[costlog]";

/** Valeur de `client_id` quand l'identité n'est pas résolue. Jamais d'exception. */
export const UNKNOWN_CLIENT_ID = "unknown";

/** Header portant le tenant explicitement (voir {@link resolveClientId}). */
export const CLIENT_ID_HEADER = "x-client-id";

/**
 * Identité d'usage propagée par un handler jusqu'aux appels coûteux (ticket 97r.5).
 *
 * Un seul objet plutôt que deux paramètres : les deux champs voyagent toujours
 * ensemble, de l'entrée du handler jusqu'au `logUsage()` le plus profond.
 */
export interface UsageContext {
  /** Tenant résolu à l'entrée du handler ; {@link UNKNOWN_CLIENT_ID} à défaut. */
  clientId?: string;
  /** Corrèle toutes les ops d'une même requête ; généré si absent. */
  requestId?: string;
}

/**
 * Sources d'en-têtes acceptées : `Headers` (fonctions Netlify v2 / edge) ou le
 * dictionnaire en minuscules des fonctions v1 (`event.headers`).
 */
export type HeaderSource =
  | Headers
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function readHeader(source: HeaderSource, name: string): string | undefined {
  if (!source) return undefined;
  try {
    if (typeof (source as Headers).get === "function") {
      return (source as Headers).get(name) ?? undefined;
    }
    const dict = source as Record<string, string | string[] | undefined>;
    // Netlify v1 minuscule les clés, mais un appel direct (tests, curl via proxy)
    // peut fournir une casse quelconque : on cherche les deux.
    const raw =
      dict[name] ??
      dict[name.toLowerCase()] ??
      Object.entries(dict).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
    return Array.isArray(raw) ? raw[0] : raw ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normalise un identifiant de tenant : minuscules, charset sûr pour du JSON
 * Lines (pas de guillemet ni de saut de ligne à injecter dans les logs), borné.
 * Renvoie `undefined` si rien d'exploitable ne reste.
 */
function sanitizeClientId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || undefined;
}

/** Extrait le nom d'utilisateur d'un header `Authorization: Basic base64(user:pass)`. */
function basicAuthUser(authorization: string | undefined): string | undefined {
  if (!authorization) return undefined;
  const [scheme, encoded] = authorization.split(" ");
  if (scheme !== "Basic" || !encoded) return undefined;
  try {
    const decoded = atob(encoded);
    const sep = decoded.indexOf(":");
    return sep === -1 ? decoded : decoded.slice(0, sep);
  } catch {
    return undefined;
  }
}

/**
 * Résout le tenant à l'entrée d'un handler (ticket 97r.5).
 *
 * D'OÙ VIENT L'IDENTITÉ AU STADE ACTUEL. Il n'y a pas encore de login par
 * client : l'accès est gardé par un Basic Auth *global* (edge function
 * `netlify/edge-functions/auth.ts`), identique pour tout le monde. Deux sources
 * sont donc acceptées, dans cet ordre :
 *
 *   1. `x-client-id` — header explicite, injecté par l'appelant (front, script
 *      de run instrumenté du bead 97r.8). C'est le mécanisme de mesure : il
 *      permet d'attribuer un run à un profil client donné.
 *   2. Le nom d'utilisateur du Basic Auth — utilisable dès qu'on provisionne un
 *      couple user/mot de passe par client, sans autre changement de code.
 *
 * Ce n'est PAS un contrôle d'accès : le header est déclaratif et falsifiable.
 * Il n'est acceptable que parce qu'il ne sert qu'à la comptabilité de coût, et
 * que la porte d'entrée reste le Basic Auth. Au vrai multi-tenant, seule cette
 * fonction change (source = session/JWT), pas les call-sites.
 *
 * Ne throw jamais : retombe sur {@link UNKNOWN_CLIENT_ID}.
 */
export function resolveClientId(headers: HeaderSource): string {
  try {
    const explicit = sanitizeClientId(readHeader(headers, CLIENT_ID_HEADER));
    if (explicit) return explicit;
    const user = sanitizeClientId(basicAuthUser(readHeader(headers, "authorization")));
    if (user) return user;
  } catch {
    /* absorbé — l'identité ne doit jamais casser une requête */
  }
  return UNKNOWN_CLIENT_ID;
}

/**
 * Résout un {@link UsageContext} partiel en couple `(client_id, request_id)`
 * prêt pour `logUsage()`. Point unique des valeurs par défaut : `"unknown"`
 * pour le tenant, un id fraîchement généré pour la requête.
 */
export function usageIdentity(ctx: UsageContext | undefined): {
  client_id: string;
  request_id: string;
} {
  return {
    client_id: ctx?.clientId || UNKNOWN_CLIENT_ID,
    request_id: ctx?.requestId || newRequestId(),
  };
}

/**
 * Génère un identifiant de requête (UUID v4). À appeler par les handlers à
 * l'entrée si aucun `request_id` n'est fourni. Best-effort : retombe sur un
 * identifiant dérivé du temps si `crypto.randomUUID` est indisponible.
 */
export function newRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* absorbé — fallback ci-dessous */
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Émet une ligne d'usage structurée (JSON Lines préfixé) sur `console.log`.
 *
 * Best-effort absolu : toute erreur (sérialisation, console indisponible) est
 * absorbée. N'interrompt jamais l'appelant.
 */
export function logUsage(record: UsageRecord): void {
  try {
    const payload = {
      ts: new Date().toISOString(),
      ...record,
    };
    console.log(`${COSTLOG_PREFIX} ${JSON.stringify(payload)}`);
  } catch {
    /* logging best-effort : ne jamais propager */
  }
}
