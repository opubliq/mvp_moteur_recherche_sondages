/**
 * CŒUR PORTABLE — distributions & crosstabs pondérés sur Parquet Blob (DuckDB).
 *
 * Fonction pure `handleMicrodataQuery(params, config) -> JSON` : init DuckDB +
 * httpfs, whitelist des identifiants contre le schéma réel du Parquet,
 * construction/validation/exécution SQL, formatage. AUCUNE dépendance au runtime
 * Netlify/Lambda (pas de `Handler`/`event`/`context`, pas de `process.env` lu ici :
 * la config est INJECTÉE). Migration Azure = réécrire l'adaptateur, pas ce module.
 *
 * Contrat : docs/DECISION_microdata_parquet.md §6.
 *  - agrégation TOUJOURS pondérée : SUM("__weight") → weighted_n, COUNT(*) → raw_n
 *  - GROUP BY sur les CODES RAW ; renvoie les codes, jamais les labels
 *  - col_share = SUM(w)/SUM(SUM(w)) OVER (PARTITION BY dim_code)
 *  - NULL exclu (WHERE ... IS NOT NULL) ; codes de refus (99/9999) INCLUS
 *  - noms de colonne WHITELISTÉS avant interpolation ; valeurs de filtre LIÉES.
 */

import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { signedBlobUrl, type StorageConfig } from "./sas.js";

export interface Filter {
  var: string;
  codes: (string | number)[];
}

export interface MicrodataParams {
  survey_id: string;
  target: string;
  dim?: string;
  filters?: Filter[];
  /** "count" (défaut) = distribution/crosstab pondérés ; "mean" = moyenne
   *  pondérée d'une cible numérique (globale, ou par dim_code si `dim`). */
  agg?: "count" | "mean";
  /** Codes de la cible à exclure (ex. refus/NSP 99/9999) — indispensable pour
   *  que la moyenne d'une échelle ait un sens. Valeurs LIÉES, jamais interpolées. */
  exclude?: (string | number)[];
}

export interface MicrodataConfig {
  storage: StorageConfig;
}

// --- Erreur métier typée (l'adaptateur mappe → code HTTP) -------------------
export class MicrodataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// --- Singleton DuckDB : httpfs chargé UNE fois (amortit le cold start) -------
let instancePromise: Promise<DuckDBInstance> | null = null;
async function getConnection(): Promise<DuckDBConnection> {
  if (!instancePromise) {
    instancePromise = (async () => {
      const inst = await DuckDBInstance.create(":memory:");
      const c = await inst.connect();
      // httpfs : lecture Blob via HTTP RANGE (métadonnées Parquet + column chunks
      // cités seulement, pas de download complet). INSTALL une seule fois par
      // process ; sur cold start l'extension est résolue depuis le cache/bundle.
      await c.run("INSTALL httpfs; LOAD httpfs;");
      c.closeSync();
      return inst;
    })();
  }
  const inst = await instancePromise;
  return inst.connect();
}

// --- Validation identifiants ------------------------------------------------
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Double-quote un identifiant DÉJÀ whitelisté (défense en profondeur). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Schéma réel du Parquet — source de vérité du whitelist (metadata only). */
async function fetchColumns(c: DuckDBConnection, parquetUrl: string): Promise<Set<string>> {
  const r = await c.runAndReadAll(
    `SELECT column_name FROM (DESCRIBE SELECT * FROM read_parquet($url))`,
    { url: parquetUrl },
  );
  return new Set(r.getRows().map((row) => String(row[0])));
}

function assertColumn(name: string, cols: Set<string>, role: string): void {
  if (!IDENT_RE.test(name) || !cols.has(name)) {
    throw new MicrodataError(400, `Invalid ${role} column: ${JSON.stringify(name)}`);
  }
}

// BigInt-safe : DuckDB renvoie int64/COUNT en BigInt.
function num(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : (v as number);
}

// --- Handler principal ------------------------------------------------------
export async function handleMicrodataQuery(params: MicrodataParams, config: MicrodataConfig) {
  const { survey_id, target, dim, filters = [], agg = "count", exclude = [] } = params;

  if (!survey_id || !IDENT_RE.test(survey_id)) {
    throw new MicrodataError(400, `Invalid survey_id: ${JSON.stringify(survey_id)}`);
  }
  if (!target) throw new MicrodataError(400, "target is required");
  if (agg !== "count" && agg !== "mean") {
    throw new MicrodataError(400, `Invalid agg: ${JSON.stringify(agg)}`);
  }

  const parquetUrl = signedBlobUrl(config.storage, `${survey_id}.parquet`);
  const c = await getConnection();
  try {
    // 1) Whitelist contre le schéma RÉEL du Parquet (anti-injection identifiants)
    const cols = await fetchColumns(c, parquetUrl).catch(() => {
      throw new MicrodataError(404, `No microdata Parquet for survey_id '${survey_id}'`);
    });
    assertColumn(target, cols, "target");
    if (dim) assertColumn(dim, cols, "dim");
    for (const f of filters) assertColumn(f.var, cols, "filter");

    // 2) Clauses WHERE : NULL exclu ; valeurs de filtre/exclude = paramètres LIÉS
    const bind: Record<string, string | number> = { url: parquetUrl };
    const where: string[] = [`${quoteIdent(target)} IS NOT NULL`];
    if (dim) where.push(`${quoteIdent(dim)} IS NOT NULL`);
    filters.forEach((f, i) => {
      if (!f.codes?.length) return;
      const placeholders = f.codes.map((code, j) => {
        const p = `f${i}_${j}`;
        bind[p] = code;
        return `$${p}`;
      });
      where.push(`${quoteIdent(f.var)} IN (${placeholders.join(", ")})`);
    });
    // Exclusion de codes de la cible (refus/NSP) — surtout utile en mode mean.
    if (exclude.length) {
      const placeholders = exclude.map((code, j) => {
        const p = `x_${j}`;
        bind[p] = code;
        return `$${p}`;
      });
      where.push(`${quoteIdent(target)} NOT IN (${placeholders.join(", ")})`);
    }
    const whereSql = where.join(" AND ");

    // 3) SQL selon agg (count = distribution/crosstab ; mean = moyenne pondérée)
    let sql: string;
    let mode: string;
    if (agg === "mean") {
      // Moyenne pondérée d'une cible numérique : SUM(w·x)/SUM(w). TRY_CAST écarte
      // les cibles non numériques (renvoie NULL, exclu par WHERE x IS NOT NULL).
      if (dim) {
        mode = "mean_by_group";
        sql = `WITH base AS (
  SELECT ${quoteIdent(dim)} AS dim_code, TRY_CAST(${quoteIdent(target)} AS DOUBLE) AS x, "__weight" AS w
  FROM read_parquet($url) WHERE ${whereSql}
)
SELECT dim_code, SUM(w * x) / SUM(w) AS mean,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n
FROM base WHERE x IS NOT NULL GROUP BY dim_code ORDER BY dim_code`;
      } else {
        mode = "mean";
        sql = `WITH base AS (
  SELECT TRY_CAST(${quoteIdent(target)} AS DOUBLE) AS x, "__weight" AS w
  FROM read_parquet($url) WHERE ${whereSql}
)
SELECT SUM(w * x) / SUM(w) AS mean, MIN(x) AS min, MAX(x) AS max,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n
FROM base WHERE x IS NOT NULL`;
      }
    } else if (dim) {
      mode = "crosstab";
      sql = `WITH base AS (
  SELECT ${quoteIdent(target)} AS target_code, ${quoteIdent(dim)} AS dim_code, "__weight" AS w
  FROM read_parquet($url) WHERE ${whereSql}
)
SELECT dim_code, target_code,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n,
       SUM(w) / SUM(SUM(w)) OVER (PARTITION BY dim_code) AS col_share
FROM base GROUP BY dim_code, target_code ORDER BY dim_code, target_code`;
    } else {
      mode = "distribution";
      sql = `WITH base AS (
  SELECT ${quoteIdent(target)} AS target_code, "__weight" AS w
  FROM read_parquet($url) WHERE ${whereSql}
)
SELECT target_code,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n,
       SUM(w) / SUM(SUM(w)) OVER () AS share
FROM base GROUP BY target_code ORDER BY target_code`;
    }

    const res = await c.runAndReadAll(sql, bind);
    const rows = res.getRowObjects().map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = k.endsWith("_code") ? (typeof v === "bigint" ? Number(v) : v) : num(v);
      }
      return out;
    });

    return {
      survey_id,
      target,
      dim: dim ?? null,
      mode,
      filters,
      row_count: rows.length,
      rows,
    };
  } finally {
    c.closeSync();
  }
}
