/**
 * Validation des primitives statistiques closes (bead aat.2) contre des
 * références INDÉPENDANTES (numpy / statsmodels / scipy), via `executeMicrodataQuery`
 * exécuté sur la fixture Parquet locale `tests/fixtures/microdata_fixture.parquet`.
 *
 * La vérité-terrain vit dans `tests/fixtures/microdata_expected.json`, produite par
 * `tests/gen_microdata_fixture.py`. Ici on lit un fichier Parquet LOCAL (DuckDB
 * accepte un chemin comme `read_parquet` source, pas besoin d'httpfs), donc le
 * test est hors-ligne et déterministe. On teste le VRAI cœur d'exécution.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DuckDBInstance } from "@duckdb/node-api";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeMicrodataQuery, type MicrodataParams } from "./core.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, "../../../tests/fixtures");
const PARQUET = resolve(fixturesDir, "microdata_fixture.parquet");
const expected = JSON.parse(readFileSync(resolve(fixturesDir, "microdata_expected.json"), "utf8"));
const SURVEY = expected.survey_id;

let instance: DuckDBInstance;
async function run(params: Omit<MicrodataParams, "survey_id">) {
  const c = await instance.connect();
  try {
    return await executeMicrodataQuery(c, PARQUET, { survey_id: SURVEY, ...params });
  } finally {
    c.closeSync();
  }
}

beforeAll(async () => {
  instance = await DuckDBInstance.create(":memory:");
});
afterAll(() => {
  instance?.closeSync?.();
});

const near = (a: number, b: number, rel = 1e-9) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));

describe("SE de proportion (agg=count, distribution)", () => {
  it("share + share_se par code, cohérents avec la référence Kish", async () => {
    const res = (await run({ target: "GENDER" })) as any;
    expect(res.mode).toBe("distribution");
    const ref = expected.proportion_gender;
    expect(res.rows.length).toBe(ref.length);
    for (const r of ref) {
      const row = res.rows.find((x: any) => x.target_code === r.target_code);
      expect(row).toBeTruthy();
      expect(row.raw_n).toBe(r.raw_n);
      near(row.weighted_n, r.weighted_n);
      near(row.share, r.share);
      near(row.share_se, r.share_se);
    }
  });

  it("crosstab expose col_share_se (proportion par colonne)", async () => {
    const res = (await run({ target: "AGEGRP", dim: "GENDER" })) as any;
    expect(res.mode).toBe("crosstab");
    for (const row of res.rows) {
      expect(row).toHaveProperty("col_share");
      expect(row).toHaveProperty("col_share_se");
      expect(row.col_share_se).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("t-test 2 groupes (agg=ttest)", () => {
  it("différence de moyennes pondérées XSCALE par GENDER (Welch)", async () => {
    const res = (await run({ target: "XSCALE", dim: "GENDER", agg: "ttest", exclude: [expected.refus_x] })) as any;
    const ref = expected.ttest_mean_xscale_by_gender;
    near(res.stat.diff, ref.diff);
    near(res.stat.t, ref.t);
    near(res.stat.df, ref.df);
    near(res.stat.p_value, ref.p_value, 1e-7);
    const g1 = res.rows.find((r: any) => r.dim_code === 1);
    const g2 = res.rows.find((r: any) => r.dim_code === 2);
    near(g1.mean, ref.mean1);
    near(g2.mean, ref.mean2);
    near(g1.se, ref.se1);
    near(g2.se, ref.se2);
  });

  it("t-test de proportion via success (indicateur XSCALE>=6)", async () => {
    const res = (await run({
      target: "XSCALE",
      dim: "GENDER",
      agg: "ttest",
      exclude: [expected.refus_x],
      success: [6, 7, 8, 9, 10],
    })) as any;
    const ref = expected.ttest_prop_xge6_by_gender;
    near(res.stat.diff, ref.diff);
    near(res.stat.t, ref.t);
    near(res.stat.df, ref.df);
    near(res.stat.p_value, ref.p_value, 1e-7);
  });
});

describe("corrélation de Pearson pondérée (agg=corr)", () => {
  it("r + p-value XSCALE × YTHERM", async () => {
    const res = (await run({
      target: "XSCALE",
      target2: "YTHERM",
      agg: "corr",
      exclude: [expected.refus_x],
      exclude2: [expected.refus_y],
    })) as any;
    const ref = expected.corr_xscale_ytherm;
    near(res.stat.r, ref.r);
    near(res.stat.t, ref.t);
    expect(res.stat.df).toBe(ref.df);
    near(res.stat.p_value, ref.p_value, 1e-6);
    expect(res.rows[0].raw_n).toBe(ref.raw_n);
  });
});

describe("OLS bivariée pondérée (agg=ols)", () => {
  it("pente / ordonnée / SE de la pente YTHERM ~ XSCALE (WLS statsmodels)", async () => {
    const res = (await run({
      target: "XSCALE",
      target2: "YTHERM",
      agg: "ols",
      exclude: [expected.refus_x],
      exclude2: [expected.refus_y],
    })) as any;
    const ref = expected.ols_ytherm_on_xscale;
    near(res.stat.slope, ref.slope);
    near(res.stat.intercept, ref.intercept);
    near(res.stat.se_slope, ref.se_slope);
    near(res.stat.t_slope, ref.t_slope);
    expect(res.stat.df).toBe(ref.df);
    near(res.stat.p_value, ref.p_value, 1e-6);
    near(res.stat.r_squared, ref.r_squared);
  });
});

describe("ANOVA à k groupes (agg=anova)", () => {
  it("F + p-value XSCALE par AGEGRP (WLS statsmodels)", async () => {
    const res = (await run({ target: "XSCALE", dim: "AGEGRP", agg: "anova", exclude: [expected.refus_x] })) as any;
    const ref = expected.anova_xscale_by_agegrp;
    near(res.stat.f, ref.f);
    expect(res.stat.df_between).toBe(ref.df_between);
    expect(res.stat.df_within).toBe(ref.df_within);
    near(res.stat.p_value, ref.p_value, 1e-6);
    expect(res.stat.k).toBe(3);
  });
});

describe("garde-fous", () => {
  it("corr sans target2 → erreur", async () => {
    await expect(run({ target: "XSCALE", agg: "corr" })).rejects.toThrow(/target2/);
  });
  it("ttest sans dim → erreur", async () => {
    await expect(run({ target: "XSCALE", agg: "ttest" })).rejects.toThrow(/dim/);
  });
  it("colonne inconnue rejetée (whitelist)", async () => {
    await expect(run({ target: "DROP TABLE" as string })).rejects.toThrow(/Invalid target/);
  });
});
