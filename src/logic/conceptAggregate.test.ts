import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "../context/CartContext";
import type { ConceptGroup } from "../context/ConceptContext";

// Seul `/microdata` (agrégation serveur) doit être appelé — jamais `/microdata-raw`
// (plafonné, cause de la troncature silencieuse 9ou.6).
const fetchMicrodata = vi.fn();
const fetchMicrodataRaw = vi.fn();
vi.mock("../api", () => ({
  fetchMicrodata: (...args: unknown[]) => fetchMicrodata(...args),
  fetchMicrodataRaw: (...args: unknown[]) => fetchMicrodataRaw(...args),
  fetchSurvey: vi.fn(),
  NoMicrodataError: class NoMicrodataError extends Error {},
}));

const {
  buildConceptTable,
  buildConceptTotals,
  columnRawN,
  computeConceptTable,
  SMALL_CELL_RAW_N,
  computeConceptTotals,
  weightNormalizationFactor,
  YEAR_CROSSING_KEY,
} = await import("./conceptAggregate");

function item(survey_id: string, variable: string, year: number): CartItem {
  return {
    survey_id,
    survey_name: survey_id,
    survey_year: year,
    pollster: null,
    variable,
    question_text: `Q ${variable}`,
    response_options: [],
  };
}

// Deux sondages de la même année, échelles de poids différentes :
//  - A : poids moyen 1 — 30 Oui / 70 Non (30 %)
//  - B : poids moyen 6 — 60 Oui / 40 Non (60 %), même n=100
// Pooling correct (poids ramenés à moyenne 1) : (30 + 60) / 200 = 45 %.
// Pooling naïf (poids natifs) : (30 + 360) / (100 + 600) ≈ 55,7 %.
const A = item("survey_a", "Q1", 2010);
const B = item("survey_b", "Q9", 2010);
const group: ConceptGroup = {
  id: "g",
  label: "Souveraineté",
  itemKeys: ["survey_a::Q1", "survey_b::Q9"],
  categories: [
    { id: "oui", label: "Oui" },
    { id: "non", label: "Non" },
  ],
  mapping: {
    "survey_a::Q1": { "1": "oui", "2": "non" },
    "survey_b::Q9": { "1": "oui", "2": "non", "-99": "non" },
  },
};
const cellsA = [
  { target_code: 1, weighted_n: 30, raw_n: 30 },
  { target_code: 2, weighted_n: 70, raw_n: 70 },
  { target_code: 8, weighted_n: 5, raw_n: 5 }, // non mappé → exclu, hors normalisation
];
const cellsB = [
  { target_code: 1, weighted_n: 360, raw_n: 60 },
  { target_code: 2, weighted_n: 200, raw_n: 30 },
  { target_code: -99, weighted_n: 40, raw_n: 10 }, // sentinelle mappée par l'utilisateur → comptée
];

describe("weightNormalizationFactor (9ou.7)", () => {
  it("ramène Σ poids à n brut (moyenne 1)", () => {
    expect(weightNormalizationFactor([{ weightedN: 600, rawN: 100 }])).toBeCloseTo(1 / 6);
    expect(weightNormalizationFactor([])).toBe(1);
  });
});

describe("buildConceptTable — fusion par année avec échelles de poids différentes", () => {
  it("normalise les poids par sondage avant de cumuler", () => {
    const res = buildConceptTable(
      group,
      [
        { item: A, cells: cellsA },
        { item: B, cells: cellsB },
      ],
      { crossingKey: YEAR_CROSSING_KEY },
    );
    expect(res.columns).toHaveLength(1);
    const col = res.columns[0];
    expect(col.surveyIds.sort()).toEqual(["survey_a", "survey_b"]);
    const oui = res.rows.find((r) => r.categoryId === "oui")!.cells[col.key];
    const non = res.rows.find((r) => r.categoryId === "non")!.cells[col.key];
    expect(oui.share).toBeCloseTo(0.45, 10);
    expect(non.share).toBeCloseTo(0.55, 10);
    // Σ poids normalisés = n brut valide des deux sondages.
    expect(oui.weightedN + non.weightedN).toBeCloseTo(200, 10);
    expect(oui.rawN + non.rawN).toBe(200);
    expect(res.warnings.some((w) => w.startsWith("5 réponses exclues"))).toBe(true);
  });

  it("ne change pas la répartition interne d'un sondage seul (colonne par sondage)", () => {
    const res = buildConceptTable(group, [{ item: B, cells: cellsB }], { crossingKey: null });
    const col = res.columns[0];
    expect(res.rows.find((r) => r.categoryId === "oui")!.cells[col.key].share).toBeCloseTo(0.6, 10);
  });

  it("croisement socio-démo harmonisé : colonnes sondage × catégorie, cellules sans dim mappée exclues", () => {
    const demoVar = { variable: "AGE", response_options: [] } as never;
    const res = buildConceptTable(
      group,
      [
        {
          item: A,
          dimVariable: "AGE",
          cells: [
            { target_code: 1, dim_code: 1, weighted_n: 10, raw_n: 10 },
            { target_code: 2, dim_code: 1, weighted_n: 30, raw_n: 30 },
            { target_code: 1, dim_code: 9, weighted_n: 4, raw_n: 4 },
          ],
        },
      ],
      {
        crossingKey: "age",
        demoVarBySurvey: new Map([["survey_a", demoVar]]),
        sociodemoMappings: {
          age: { categories: [{ id: "jeunes", label: "18-34" }], mapping: { survey_a: { "1": "jeunes" } } },
        },
      },
    );
    expect(res.columns.map((c) => c.label)).toEqual(["survey_a (2010) · 18-34"]);
    expect(res.rows.find((r) => r.categoryId === "oui")!.cells[res.columns[0].key].share).toBeCloseTo(0.25, 10);
    expect(res.warnings.some((w) => w.startsWith("4 réponses exclues"))).toBe(true);
  });

  it("signale un item sans micro-données", () => {
    const res = buildConceptTable(group, [{ item: A, cells: null }], { crossingKey: null });
    expect(res.columns).toHaveLength(0);
    expect(res.warnings[0]).toMatch(/Micro-données indisponibles/);
  });
});

describe("buildConceptTable — âge × année combiné + N brut (9ou.8)", () => {
  // A (2010, poids moyen 1) et B (2010, poids moyen 6) + C (2012) ; âge harmonisé
  // vers « 18-34 » (codes natifs différents par sondage) et « 35+ ».
  const C = item("survey_c", "Q3", 2012);
  const groupC: ConceptGroup = {
    ...group,
    itemKeys: [...group.itemKeys, "survey_c::Q3"],
    mapping: { ...group.mapping, "survey_c::Q3": { "1": "oui", "2": "non" } },
  };
  const demoVar = { variable: "AGE", response_options: [] } as never;
  const opts = {
    crossingKey: "age",
    mergeByYear: true,
    demoVarBySurvey: new Map([
      ["survey_a", demoVar],
      ["survey_b", demoVar],
      ["survey_c", demoVar],
    ]),
    sociodemoMappings: {
      age: {
        categories: [
          { id: "jeunes", label: "18-34" },
          { id: "vieux", label: "35+" },
        ],
        mapping: {
          survey_a: { "1": "jeunes", "2": "vieux" },
          survey_b: { "3": "jeunes", "4": "vieux" },
          survey_c: { "1": "jeunes", "2": "vieux" },
        },
      },
    },
  };
  // A : 18-34 → 20 Oui / 20 Non (n=40) ; 35+ → 10 Oui / 50 Non (n=60). Poids moyen 1.
  const aggA = {
    item: A,
    dimVariable: "AGE",
    cells: [
      { target_code: 1, dim_code: 1, weighted_n: 20, raw_n: 20 },
      { target_code: 2, dim_code: 1, weighted_n: 20, raw_n: 20 },
      { target_code: 1, dim_code: 2, weighted_n: 10, raw_n: 10 },
      { target_code: 2, dim_code: 2, weighted_n: 50, raw_n: 50 },
    ],
  };
  // B : poids ×6. 18-34 → 48 Oui / 12 Non (n=60, 80 %) ; 35+ → 20 Oui / 20 Non (n=40).
  const aggB = {
    item: B,
    dimVariable: "AGE",
    cells: [
      { target_code: 1, dim_code: 3, weighted_n: 288, raw_n: 48 },
      { target_code: 2, dim_code: 3, weighted_n: 72, raw_n: 12 },
      { target_code: 1, dim_code: 4, weighted_n: 120, raw_n: 20 },
      { target_code: 2, dim_code: 4, weighted_n: 120, raw_n: 20 },
    ],
  };
  const aggC = {
    item: C,
    dimVariable: "AGE",
    cells: [
      { target_code: 1, dim_code: 1, weighted_n: 300, raw_n: 300 },
      { target_code: 2, dim_code: 1, weighted_n: 100, raw_n: 100 },
      { target_code: 1, dim_code: 2, weighted_n: 30, raw_n: 30 },
      { target_code: 2, dim_code: 2, weighted_n: 30, raw_n: 30 },
    ],
  };

  it("colonnes = année × catégorie harmonisée, sondages d'une même année fusionnés (poids normalisés)", () => {
    const res = buildConceptTable(groupC, [aggA, aggB, aggC], opts);
    expect(res.columns.map((c) => c.label)).toEqual(["2010 · 18-34", "2010 · 35+", "2012 · 18-34", "2012 · 35+"]);
    const young2010 = res.columns[0];
    expect(young2010.surveyIds.sort()).toEqual(["survey_a", "survey_b"]);
    const oui = res.rows.find((r) => r.categoryId === "oui")!.cells[young2010.key];
    // Correct : (20 + 48) / (40 + 60) = 68 %. Naïf (poids natifs) : (20 + 288) / (40 + 360) = 77 %.
    expect(oui.share).toBeCloseTo(0.68, 10);
    expect(oui.rawN).toBe(68);
    expect(columnRawN(res, young2010.key)).toBe(100);
    expect(columnRawN(res, res.columns[2].key)).toBe(400);
  });

  it("sans mergeByYear : reste sondage × catégorie", () => {
    const res = buildConceptTable(groupC, [aggA, aggB], { ...opts, mergeByYear: false });
    expect(res.columns.map((c) => c.label)).toEqual([
      "survey_a (2010) · 18-34",
      "survey_a (2010) · 35+",
      "survey_b (2010) · 18-34",
      "survey_b (2010) · 35+",
    ]);
  });

  it("mergeByYear ignoré sans mapping harmonisé (pas de fusion de codes natifs entre sondages)", () => {
    const res = buildConceptTable(groupC, [aggA, aggB], { ...opts, sociodemoMappings: {} });
    expect(res.columns.every((c) => c.surveyIds.length === 1)).toBe(true);
  });

  it("N brut par colonne et seuil de petite cellule", () => {
    const res = buildConceptTable(groupC, [aggA, aggB, aggC], opts);
    const raw = res.columns.map((c) => columnRawN(res, c.key));
    expect(raw).toEqual([100, 100, 400, 60]);
    expect(SMALL_CELL_RAW_N).toBe(100);
    expect(raw.map((n) => n < SMALL_CELL_RAW_N)).toEqual([false, false, false, true]);
  });
});

describe("buildConceptTotals", () => {
  it("total multi-sondages avec poids normalisés", () => {
    const res = buildConceptTotals(group, [
      { item: A, cells: cellsA },
      { item: B, cells: cellsB },
    ]);
    expect(res.rows.find((r) => r.target_code === "oui")!.share).toBeCloseTo(0.45, 10);
    expect(res.rows.reduce((s, r) => s + r.weighted_n, 0)).toBeCloseTo(200, 10);
  });
});

describe("computeConceptTable / computeConceptTotals — pas de troncature (9ou.6)", () => {
  beforeEach(() => {
    fetchMicrodata.mockReset();
    fetchMicrodataRaw.mockReset();
    // Sondage de 37 822 répondants (> ancien plafond de 20 000 lignes) : l'agrégat
    // serveur couvre tout le monde, quel que soit le nombre de lignes.
    fetchMicrodata.mockImplementation(async (q: { surveyId: string }) => ({
      rows:
        q.surveyId === "survey_a"
          ? [
              { target_code: 1, weighted_n: 20000, raw_n: 20000 },
              { target_code: 2, weighted_n: 17822, raw_n: 17822 },
            ]
          : cellsB,
    }));
  });

  it("agrège côté serveur (agg=count, sentinelles conservées) sur tous les répondants", async () => {
    const res = await computeConceptTable(group, [A, B], YEAR_CROSSING_KEY);
    expect(fetchMicrodataRaw).not.toHaveBeenCalled();
    expect(fetchMicrodata).toHaveBeenCalledTimes(2);
    for (const [q] of fetchMicrodata.mock.calls) {
      expect(q).toMatchObject({ agg: "count", includeSentinels: true });
      expect(q.dim).toBeUndefined();
    }
    const col = res.columns[0];
    const totalRaw = res.rows.reduce((s, r) => s + r.cells[col.key].rawN, 0);
    expect(totalRaw).toBe(37822 + 100);
    const oui = res.rows.find((r) => r.categoryId === "oui")!.cells[col.key];
    expect(oui.share).toBeCloseTo((20000 + 60) / (37822 + 100), 10);
  });

  it("computeConceptTotals passe aussi par l'agrégat serveur", async () => {
    const res = await computeConceptTotals(group, [A, B]);
    expect(fetchMicrodataRaw).not.toHaveBeenCalled();
    expect(res.rows.reduce((s, r) => s + r.raw_n, 0)).toBe(37822 + 100);
  });
});
