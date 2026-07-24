/**
 * Logging d'usage & coût marginal (epic 97r, bead 97r.1) — module partagé.
 *
 * Fondation d'instrumentation : chaque câblage coûteux (decompose, embed,
 * annotate, rerank, agent_turn) émet une ligne d'usage via `logUsage()`. La
 * sortie est du JSON Lines préfixé `[costlog] {...}` sur `console.log`, agrégeable
 * en aval (collecteur de logs Netlify → coût marginal par client).
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
  /** Search units Cohere ; absent pour les ops token-based. */
  units?: number;
  latency_ms: number;
  meta?: Record<string, unknown>;
}

/** Préfixe repérable en tête de chaque ligne de log d'usage. */
export const COSTLOG_PREFIX = "[costlog]";

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
