/**
 * CŒUR PORTABLE — distributions, crosstabs & primitives statistiques CLOSES
 * pondérées sur Parquet Blob (DuckDB).
 *
 * Fonction pure `handleMicrodataQuery(params, config) -> JSON` : init DuckDB +
 * httpfs, whitelist des identifiants contre le schéma réel du Parquet,
 * construction/validation/exécution SQL, formatage. AUCUNE dépendance au runtime
 * Netlify/Lambda (pas de `Handler`/`event`/`context`, pas de `process.env` lu ici :
 * la config est INJECTÉE). Migration Azure = réécrire l'adaptateur, pas ce module.
 *
 * Contrat : docs/DECISION_microdata_parquet.md §6 & §8.
 *  - agrégation TOUJOURS pondérée : SUM("__weight") → weighted_n, COUNT(*) → raw_n
 *  - GROUP BY sur les CODES RAW ; renvoie les codes, jamais les labels
 *  - col_share = SUM(w)/SUM(SUM(w)) OVER (PARTITION BY dim_code)
 *  - NULL exclu (WHERE ... IS NOT NULL) ; codes de refus (99/9999) INCLUS
 *  - noms de colonne WHITELISTÉS avant interpolation ; valeurs de filtre LIÉES.
 *
 * Primitives inférentielles (§8) : `agg` = "corr" | "ols" | "ttest" | "anova",
 * plus la SE de proportion ajoutée au mode "count". Chaque stat est une FORME
 * FERMÉE (sommes pondérées assemblées par formule ; p-value par fonction
 * spéciale déterministe), jamais du code généré ni de l'algèbre matricielle.
 */

import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { signedBlobUrl, type StorageConfig } from "./sas.js";
import { studentTTwoSided, fSurvival } from "./stats.js";

export interface Filter {
  var: string;
  codes: (string | number)[];
}

/** Une réponse annotée : le répondant, et l'étiquette que le LLM lui a donnée. */
export interface AnnotationPair {
  rid: number;
  label: string;
}

/**
 * Nom réservé désignant l'annotation dans `target`/`dim`. Préfixé `__` comme les
 * autres colonnes techniques du Parquet, et impossible à confondre avec une
 * variable de sondage — le whitelist ne l'accepte que si une annotation
 * accompagne la requête.
 */
export const ANNOTATION_COLUMN = "__annotation";

/**
 * Plafond de lignes d'annotation par requête. La plus grosse question ouverte du
 * corpus en compte 2 730 (~70 KB de JSON) ; 20 000 laisse de la marge tout en
 * bornant la taille du POST et le coût de la jointure.
 */
const MAX_ANNOTATION_ROWS = 20000;

/** Modes d'agrégation supportés. */
export type Agg = "count" | "mean" | "corr" | "ols" | "ttest" | "anova";
const AGGS: readonly Agg[] = ["count", "mean", "corr", "ols", "ttest", "anova"];

export interface MicrodataParams {
  survey_id: string;
  target: string;
  dim?: string;
  filters?: Filter[];
  /**
   * Mode d'agrégation :
   *  - "count" (défaut) : distribution/crosstab pondérés + SE de proportion.
   *  - "mean"           : moyenne pondérée d'une cible numérique (par dim si `dim`).
   *  - "corr"           : corrélation de Pearson pondérée `target` × `target2`.
   *  - "ols"            : régression linéaire bivariée pondérée (target2 ~ target).
   *  - "ttest"          : différence de 2 moyennes/proportions pondérées (par `dim`).
   *  - "anova"          : F à k groupes (par `dim`) sur une cible numérique.
   */
  agg?: Agg;
  /** Codes de la cible à exclure (ex. refus/NSP 99/9999) — indispensable pour
   *  que la moyenne d'une échelle ait un sens. Valeurs LIÉES, jamais interpolées. */
  exclude?: (string | number)[];
  /** Seconde cible numérique (y), requise par "corr" et "ols" (target = x). */
  target2?: string;
  /** Codes à exclure de `target2` (refus/NSP propres à y). Défaut = `exclude`. */
  exclude2?: (string | number)[];
  /** "ttest" : les DEUX codes de `dim` à comparer. Facultatif si `dim` n'a
   *  exactement que 2 codes non-nuls. Valeurs LIÉES. */
  groups?: (string | number)[];
  /** "ttest" en mode PROPORTION : codes de `target` comptés comme « succès »
   *  (indicateur 0/1). Absent → t-test de moyennes sur `target` numérique. */
  success?: (string | number)[];
  /**
   * Annotation éphémère à joindre à la volée (bead jsu.7) : `respondent_id` →
   * étiquette. Fournie, elle rend `ANNOTATION_COLUMN` utilisable comme `target`
   * ou `dim` ; absente, la requête se comporte exactement comme avant.
   *
   * Rien n'est écrit nulle part : la map voyage dans la requête, vit le temps
   * de la jointure et disparaît. C'est ce qui permet de croiser une annotation
   * sans la persister — et donc sans toucher au contrat RAW-FIRST des Parquet.
   */
  annotation?: AnnotationPair[];
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
      // Sur AWS Lambda (runtime des Netlify Functions) seul /tmp est inscriptible.
      // DuckDB installe/charge ses extensions depuis $HOME/.duckdb par défaut ⇒
      // l'INSTALL échouerait en "read-only file system". On redirige tout vers /tmp.
      const inst = await DuckDBInstance.create(":memory:", {
        home_directory: "/tmp",
        extension_directory: "/tmp/.duckdb_extensions",
      });
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

/**
 * Erreur-type d'une moyenne PONDÉRÉE : sqrt(var_w / (n_eff − 1)).
 *  - var_w = Σw·x²/Σw − mean²  (variance pondérée, de population)
 *  - n_eff = (Σw)² / Σw²       (n effectif de Kish — corrige le design effect
 *    des poids ; sans ça la SE est sous-estimée sur un échantillon repondéré)
 * Diviser par n_eff−1 plutôt que n_eff EST la correction de Bessel :
 * var_pop/(n−1) ≡ var_échantillon/n. Sans elle la SE est trop optimiste sur
 * les petits groupes — précisément ceux qu'on veut signaler.
 * `greatest(…, 0)` couvre la variance légèrement négative que peut produire la
 * forme E[x²]−E[x]² par annulation ; les `nullif` renvoient NULL (→ pas d'IC)
 * plutôt que de faire échouer la requête sur un groupe dégénéré (n_eff ≤ 1,
 * Σw² = 0). Une division par zéro rend NULL en DuckDB, jamais une erreur.
 */
const SE_SQL = `sqrt(
         greatest(SUM(w * x * x) / SUM(w) - pow(SUM(w * x) / SUM(w), 2), 0)
         / nullif(pow(SUM(w), 2) / nullif(SUM(w * w), 0) - 1, 0)
       ) AS se`;

/** n effectif de Kish (Σw)²/Σw² — exposé à part pour le t-test (df de Welch). */
const N_EFF_SQL = `pow(SUM(w), 2) / nullif(SUM(w * w), 0) AS n_eff`;

// --- Handler principal (adaptateur → URL signée + connexion) ----------------
export async function handleMicrodataQuery(params: MicrodataParams, config: MicrodataConfig) {
  const parquetUrl = signedBlobUrl(config.storage, `${params.survey_id}.parquet`);
  const c = await getConnection();
  try {
    return await executeMicrodataQuery(c, parquetUrl, params);
  } finally {
    c.closeSync();
  }
}

/**
 * CŒUR EXÉCUTABLE — indépendant de l'origine du Parquet (Blob signé en prod,
 * fichier local en test). `parquetUrl` peut être une URL httpfs ou un chemin
 * local : `read_parquet` accepte les deux. Toute la whitelist + le binding +
 * la génération SQL vivent ici pour être testables hors ligne.
 */
export async function executeMicrodataQuery(
  c: DuckDBConnection,
  parquetUrl: string,
  params: MicrodataParams,
) {
  const {
    survey_id,
    target,
    dim,
    filters = [],
    agg = "count",
    exclude = [],
    target2,
    exclude2,
    groups,
    success,
    annotation,
  } = params;

  if (!survey_id || !IDENT_RE.test(survey_id)) {
    throw new MicrodataError(400, `Invalid survey_id: ${JSON.stringify(survey_id)}`);
  }
  if (!target) throw new MicrodataError(400, "target is required");
  if (!AGGS.includes(agg)) {
    throw new MicrodataError(400, `Invalid agg: ${JSON.stringify(agg)}`);
  }
  if ((agg === "corr" || agg === "ols") && !target2) {
    throw new MicrodataError(400, `agg "${agg}" requires target2`);
  }
  if ((agg === "ttest" || agg === "anova") && !dim) {
    throw new MicrodataError(400, `agg "${agg}" requires dim (grouping variable)`);
  }

  // --- Annotation jointe à la volée (jsu.7) ---------------------------------
  const hasAnnotation = Array.isArray(annotation) && annotation.length > 0;
  if (hasAnnotation) {
    if (annotation!.length > MAX_ANNOTATION_ROWS) {
      throw new MicrodataError(400, `annotation exceeds ${MAX_ANNOTATION_ROWS} rows`);
    }
    for (const a of annotation!) {
      if (!a || !Number.isFinite(a.rid) || typeof a.label !== "string") {
        throw new MicrodataError(400, "annotation must be [{rid:number,label:string}]");
      }
    }
  }
  const usesAnnotation =
    target === ANNOTATION_COLUMN || dim === ANNOTATION_COLUMN || target2 === ANNOTATION_COLUMN;
  if (usesAnnotation && !hasAnnotation) {
    throw new MicrodataError(400, `${ANNOTATION_COLUMN} requires a non-empty annotation`);
  }
  // Une étiquette est du texte : elle n'a ni moyenne ni corrélation. Refuser
  // franchement vaut mieux qu'un résultat vide via TRY_CAST.
  const numericModes: Agg[] = ["mean", "corr", "ols", "ttest", "anova"];
  if (
    numericModes.includes(agg) &&
    (target === ANNOTATION_COLUMN || target2 === ANNOTATION_COLUMN) &&
    !(agg === "ttest" && success)
  ) {
    throw new MicrodataError(400, `${ANNOTATION_COLUMN} cannot be treated as numeric`);
  }

  // 1) Whitelist contre le schéma RÉEL du Parquet (anti-injection identifiants)
  const cols = await fetchColumns(c, parquetUrl).catch(() => {
    throw new MicrodataError(404, `No microdata Parquet for survey_id '${survey_id}'`);
  });
  // L'annotation n'existe pas dans le Parquet : elle n'entre au whitelist que
  // si la requête en porte une, et jamais comme variable de filtre.
  if (hasAnnotation) cols.add(ANNOTATION_COLUMN);
  assertColumn(target, cols, "target");
  if (target2) assertColumn(target2, cols, "target2");
  if (dim) assertColumn(dim, cols, "dim");
  for (const f of filters) {
    if (f.var === ANNOTATION_COLUMN) {
      throw new MicrodataError(400, `${ANNOTATION_COLUMN} cannot be used as a filter`);
    }
    assertColumn(f.var, cols, "filter");
  }

  /**
   * Référence SQL d'une colonne : celles du Parquet sont préfixées par son
   * alias, l'annotation pointe sur la table jointe. Le préfixe est appliqué
   * même sans annotation pour n'avoir qu'un seul chemin de génération.
   */
  const col = (name: string) => (name === ANNOTATION_COLUMN ? "a.label" : `p.${quoteIdent(name)}`);

  // Jointure INTERNE : l'univers du croisement est l'ensemble des réponses
  // annotées. Un répondant qui n'a pas répondu à la question ouverte n'a pas
  // d'étiquette et n'a rien à faire dans les effectifs.
  const fromSql = hasAnnotation
    ? `read_parquet($url) p JOIN annot a ON p."__respondent_id" = a.rid`
    : `read_parquet($url) p`;
  const withSql = hasAnnotation
    ? `WITH annot AS (
  SELECT (u).rid AS rid, (u).label AS label
  FROM (SELECT unnest(from_json($annot, '["STRUCT(rid BIGINT, label VARCHAR)"]')) AS u)
),
`
    : "WITH ";

  // 2) Clauses WHERE : NULL exclu ; valeurs de filtre/exclude = paramètres LIÉS
  const bind: Record<string, string | number> = { url: parquetUrl };
  if (hasAnnotation) bind.annot = JSON.stringify(annotation);
  const where: string[] = [`${col(target)} IS NOT NULL`];
  if (target2) where.push(`${col(target2)} IS NOT NULL`);
  if (dim) where.push(`${col(dim)} IS NOT NULL`);
  filters.forEach((f, i) => {
    if (!f.codes?.length) return;
    const placeholders = f.codes.map((code, j) => {
      const p = `f${i}_${j}`;
      bind[p] = code;
      return `$${p}`;
    });
    where.push(`${col(f.var)} IN (${placeholders.join(", ")})`);
  });
  // Exclusion de codes de la cible (refus/NSP) — surtout utile en mode numérique.
  const bindExclude = (codes: (string | number)[], colRef: string, prefix: string) => {
    if (!codes.length) return;
    const placeholders = codes.map((code, j) => {
      const p = `${prefix}_${j}`;
      bind[p] = code;
      return `$${p}`;
    });
    where.push(`${colRef} NOT IN (${placeholders.join(", ")})`);
  };
  bindExclude(exclude, col(target), "x");
  if (target2) bindExclude(exclude2 ?? exclude, col(target2), "y");

  // "ttest" : restreindre aux deux groupes demandés (valeurs LIÉES).
  if (agg === "ttest" && groups) {
    if (groups.length !== 2) throw new MicrodataError(400, "ttest groups must be exactly 2 codes");
    const ph = groups.map((code, j) => {
      const p = `g_${j}`;
      bind[p] = code;
      return `$${p}`;
    });
    where.push(`${col(dim!)} IN (${ph.join(", ")})`);
  }
  const whereSql = where.join(" AND ");

  // Expression numérique de la cible : indicateur 0/1 (proportion) ou TRY_CAST.
  let xExpr: string;
  if (agg === "ttest" && success) {
    if (!success.length) throw new MicrodataError(400, "success must be a non-empty code list");
    const ph = success.map((code, j) => {
      const p = `s_${j}`;
      bind[p] = code;
      return `$${p}`;
    });
    xExpr = `CASE WHEN ${col(target)} IN (${ph.join(", ")}) THEN 1.0 ELSE 0.0 END`;
  } else {
    xExpr = `TRY_CAST(${col(target)} AS DOUBLE)`;
  }

  // 3) Dispatch par mode
  const meta = {
    survey_id,
    target,
    target2: target2 ?? null,
    dim: dim ?? null,
    filters,
  };

  if (agg === "corr" || agg === "ols") {
    return runCorrOls(c, agg, meta, bind, `${withSql}base AS (
  SELECT TRY_CAST(${col(target)} AS DOUBLE) AS x, TRY_CAST(${col(target2!)} AS DOUBLE) AS y, p."__weight" AS w
  FROM ${fromSql} WHERE ${whereSql}
)
SELECT SUM(w) AS sw, SUM(w * w) AS sww,
       SUM(w * x) AS swx, SUM(w * y) AS swy,
       SUM(w * x * x) AS swxx, SUM(w * y * y) AS swyy, SUM(w * x * y) AS swxy,
       COUNT(*) AS raw_n
FROM base WHERE x IS NOT NULL AND y IS NOT NULL`);
  }

  if (agg === "ttest") {
    return runTtest(c, meta, dim!, bind, `${withSql}base AS (
  SELECT ${col(dim!)} AS dim_code, ${xExpr} AS x, p."__weight" AS w
  FROM ${fromSql} WHERE ${whereSql}
)
SELECT dim_code, SUM(w * x) / SUM(w) AS mean,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n,
       ${N_EFF_SQL},
       ${SE_SQL}
FROM base WHERE x IS NOT NULL GROUP BY dim_code ORDER BY dim_code`);
  }

  if (agg === "anova") {
    return runAnova(c, meta, dim!, bind, `${withSql}base AS (
  SELECT ${col(dim!)} AS dim_code, TRY_CAST(${col(target)} AS DOUBLE) AS x, p."__weight" AS w
  FROM ${fromSql} WHERE ${whereSql}
)
SELECT dim_code,
       SUM(w * x) / SUM(w) AS mean,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n,
       SUM(w * x) AS swx, SUM(w * x * x) AS swxx
FROM base WHERE x IS NOT NULL GROUP BY dim_code ORDER BY dim_code`);
  }

  // --- count / mean (existant, + SE de proportion en mode count) ------------
  let sql: string;
  let mode: string;
  if (agg === "mean") {
    if (dim) {
      mode = "mean_by_group";
      sql = `${withSql}base AS (
  SELECT ${col(dim)} AS dim_code, TRY_CAST(${col(target)} AS DOUBLE) AS x, p."__weight" AS w
  FROM ${fromSql} WHERE ${whereSql}
)
SELECT dim_code, SUM(w * x) / SUM(w) AS mean,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n,
       ${SE_SQL}
FROM base WHERE x IS NOT NULL GROUP BY dim_code ORDER BY dim_code`;
    } else {
      mode = "mean";
      sql = `${withSql}base AS (
  SELECT TRY_CAST(${col(target)} AS DOUBLE) AS x, p."__weight" AS w
  FROM ${fromSql} WHERE ${whereSql}
)
SELECT SUM(w * x) / SUM(w) AS mean, MIN(x) AS min, MAX(x) AS max,
       SUM(w) AS weighted_n, COUNT(*) AS raw_n
FROM base WHERE x IS NOT NULL`;
    }
  } else if (dim) {
    mode = "crosstab";
    // SE de proportion PAR colonne : p = col_share, n_eff = (Σw)²/Σw² dans la
    // colonne, SE = sqrt(p(1−p)/(n_eff−1)). Les agrégats de colonne passent par
    // des fenêtres PARTITION BY dim_code (mêmes bornes que col_share).
    sql = `${withSql}base AS (
  SELECT ${col(target)} AS target_code, ${col(dim)} AS dim_code, p."__weight" AS w
  FROM ${fromSql} WHERE ${whereSql}
), cells AS (
  SELECT dim_code, target_code, SUM(w) AS cell_w, SUM(w * w) AS cell_ww, COUNT(*) AS raw_n
  FROM base GROUP BY dim_code, target_code
)
SELECT dim_code, target_code, raw_n,
       cell_w AS weighted_n,
       cell_w / SUM(cell_w) OVER (PARTITION BY dim_code) AS col_share,
       sqrt(
         greatest(cell_w / SUM(cell_w) OVER (PARTITION BY dim_code)
                  * (1 - cell_w / SUM(cell_w) OVER (PARTITION BY dim_code)), 0)
         / nullif(pow(SUM(cell_w) OVER (PARTITION BY dim_code), 2)
                  / nullif(SUM(cell_ww) OVER (PARTITION BY dim_code), 0) - 1, 0)
       ) AS col_share_se
FROM cells ORDER BY dim_code, target_code`;
  } else {
    mode = "distribution";
    // SE de proportion globale : mêmes bornes sur TOUT l'échantillon (OVER ()).
    sql = `${withSql}base AS (
  SELECT ${col(target)} AS target_code, p."__weight" AS w
  FROM ${fromSql} WHERE ${whereSql}
), cells AS (
  SELECT target_code, SUM(w) AS cell_w, SUM(w * w) AS cell_ww, COUNT(*) AS raw_n
  FROM base GROUP BY target_code
)
SELECT target_code, raw_n,
       cell_w AS weighted_n,
       cell_w / SUM(cell_w) OVER () AS share,
       sqrt(
         greatest(cell_w / SUM(cell_w) OVER () * (1 - cell_w / SUM(cell_w) OVER ()), 0)
         / nullif(pow(SUM(cell_w) OVER (), 2) / nullif(SUM(cell_ww) OVER (), 0) - 1, 0)
       ) AS share_se
FROM cells ORDER BY target_code`;
  }

  const res = await c.runAndReadAll(sql, bind);
  const rows = res.getRowObjects().map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = k.endsWith("_code") ? (typeof v === "bigint" ? Number(v) : v) : num(v);
    }
    return out;
  });

  return { ...meta, mode, row_count: rows.length, rows };
}

// --- Assemblage des primitives (formes fermées, en JS) ----------------------

/** Corrélation de Pearson pondérée + OLS bivariée (WLS analytique). */
async function runCorrOls(
  c: DuckDBConnection,
  agg: "corr" | "ols",
  meta: Record<string, unknown>,
  bind: Record<string, string | number>,
  sql: string,
) {
  const res = await c.runAndReadAll(sql, bind);
  const r0 = res.getRowObjects()[0] ?? {};
  const sw = num(r0.sw);
  const swx = num(r0.swx);
  const swy = num(r0.swy);
  const swxx = num(r0.swxx);
  const swyy = num(r0.swyy);
  const swxy = num(r0.swxy);
  const rawN = num(r0.raw_n);

  // Moments centrés pondérés (Sxy = Σw·xy − ΣwxΣwy/Σw, etc.).
  const sxx = swxx - (swx * swx) / sw;
  const syy = swyy - (swy * swy) / sw;
  const sxy = swxy - (swx * swy) / sw;
  const meanX = swx / sw;
  const meanY = swy / sw;

  // r de Pearson pondéré.
  const denom = Math.sqrt(sxx * syy);
  const r = denom > 0 ? sxy / denom : NaN;

  // p-value du r : t = r·sqrt((n−2)/(1−r²)), df = raw_n − 2 (échantillon réel).
  const dfR = rawN - 2;
  const tR = Number.isFinite(r) && Math.abs(r) < 1 ? r * Math.sqrt(dfR / (1 - r * r)) : Infinity;
  const pR = dfR > 0 ? studentTTwoSided(tR, dfR) : NaN;

  const summaryRow = {
    raw_n: rawN,
    weighted_n: sw,
    mean_x: meanX,
    mean_y: meanY,
    sd_x: sxx > 0 ? Math.sqrt(sxx / sw) : 0,
    sd_y: syy > 0 ? Math.sqrt(syy / sw) : 0,
  };

  if (agg === "corr") {
    return {
      ...meta,
      mode: "corr",
      row_count: 1,
      rows: [summaryRow],
      stat: { test: "pearson_weighted", r, t: tR, df: dfR, p_value: pR, raw_n: rawN, weighted_n: sw },
    };
  }

  // OLS/WLS bivariée : pente, ordonnée, SE de la pente (convention WLS analytique
  // façon statsmodels : σ̂² = SSR_pondérée/(N−2), N = n brut ; Var(pente)=σ̂²/Sxx).
  const slope = sxx > 0 ? sxy / sxx : NaN;
  const intercept = meanY - slope * meanX;
  const ssr = syy - (sxy * sxy) / sxx; // Σw·résidu² = Syy − Sxy²/Sxx
  const dfResid = rawN - 2;
  const sigma2 = dfResid > 0 ? ssr / dfResid : NaN;
  const seSlope = sxx > 0 && sigma2 >= 0 ? Math.sqrt(sigma2 / sxx) : NaN;
  const tSlope = Number.isFinite(seSlope) && seSlope > 0 ? slope / seSlope : Infinity;
  const pSlope = dfResid > 0 ? studentTTwoSided(tSlope, dfResid) : NaN;

  return {
    ...meta,
    mode: "ols",
    row_count: 1,
    rows: [summaryRow],
    stat: {
      test: "ols_bivariate_weighted",
      slope,
      intercept,
      se_slope: seSlope,
      t_slope: tSlope,
      df: dfResid,
      p_value: pSlope,
      r,
      r_squared: Number.isFinite(r) ? r * r : NaN,
      raw_n: rawN,
      weighted_n: sw,
    },
  };
}

/** t-test de Welch à 2 groupes (moyennes ou proportions pondérées). */
async function runTtest(
  c: DuckDBConnection,
  meta: Record<string, unknown>,
  dim: string,
  bind: Record<string, string | number>,
  sql: string,
) {
  const res = await c.runAndReadAll(sql, bind);
  const rows = res.getRowObjects().map((r) => ({
    dim_code: typeof r.dim_code === "bigint" ? Number(r.dim_code) : r.dim_code,
    mean: num(r.mean),
    se: r.se == null ? null : num(r.se),
    weighted_n: num(r.weighted_n),
    raw_n: num(r.raw_n),
    n_eff: r.n_eff == null ? null : num(r.n_eff),
  }));

  if (rows.length !== 2) {
    throw new MicrodataError(
      400,
      `ttest needs exactly 2 groups on '${dim}', found ${rows.length}. Pass groups:[codeA,codeB].`,
    );
  }
  const [g1, g2] = rows;
  const se1 = g1.se ?? NaN;
  const se2 = g2.se ?? NaN;
  const diff = g1.mean - g2.mean;
  const seDiff = Math.sqrt(se1 * se1 + se2 * se2);
  const t = seDiff > 0 ? diff / seDiff : Infinity;
  // df de Welch–Satterthwaite (n effectif de Kish − 1 par groupe).
  const v1 = (g1.n_eff ?? NaN) - 1;
  const v2 = (g2.n_eff ?? NaN) - 1;
  const df =
    Math.pow(se1 * se1 + se2 * se2, 2) /
    (Math.pow(se1, 4) / v1 + Math.pow(se2, 4) / v2);
  const p = df > 0 ? studentTTwoSided(t, df) : NaN;

  return {
    ...meta,
    mode: "ttest",
    row_count: 2,
    rows,
    stat: {
      test: "welch_t_weighted",
      group1: g1.dim_code,
      group2: g2.dim_code,
      diff,
      se_diff: seDiff,
      t,
      df,
      p_value: p,
    },
  };
}

/** ANOVA à k groupes (F pondérée, convention WLS : df_within = N_brut − k). */
async function runAnova(
  c: DuckDBConnection,
  meta: Record<string, unknown>,
  dim: string,
  bind: Record<string, string | number>,
  sql: string,
) {
  const res = await c.runAndReadAll(sql, bind);
  const groups = res.getRowObjects().map((r) => ({
    dim_code: typeof r.dim_code === "bigint" ? Number(r.dim_code) : r.dim_code,
    mean: num(r.mean),
    weighted_n: num(r.weighted_n),
    raw_n: num(r.raw_n),
    swx: num(r.swx),
    swxx: num(r.swxx),
  }));

  const k = groups.length;
  if (k < 2) {
    throw new MicrodataError(400, `anova needs at least 2 groups on '${dim}', found ${k}.`);
  }
  const totalW = groups.reduce((s, g) => s + g.weighted_n, 0);
  const totalSwx = groups.reduce((s, g) => s + g.swx, 0);
  const rawTotal = groups.reduce((s, g) => s + g.raw_n, 0);
  const grandMean = totalSwx / totalW;

  // SS pondérées (whitened) : cohérent avec le F d'une WLS y ~ C(dim).
  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of groups) {
    ssBetween += g.weighted_n * Math.pow(g.mean - grandMean, 2);
    ssWithin += g.swxx - (g.swx * g.swx) / g.weighted_n; // Σw(x−mean_g)²
  }
  const dfBetween = k - 1;
  const dfWithin = rawTotal - k; // n brut (nobs), convention WLS/statsmodels
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msWithin > 0 ? msBetween / msWithin : Infinity;
  const p = dfWithin > 0 ? fSurvival(f, dfBetween, dfWithin) : NaN;

  return {
    ...meta,
    mode: "anova",
    row_count: k,
    rows: groups.map((g) => ({
      dim_code: g.dim_code,
      mean: g.mean,
      weighted_n: g.weighted_n,
      raw_n: g.raw_n,
    })),
    stat: {
      test: "anova_f_weighted",
      f,
      df_between: dfBetween,
      df_within: dfWithin,
      p_value: p,
      ss_between: ssBetween,
      ss_within: ssWithin,
      grand_mean: grandMean,
      k,
    },
  };
}
