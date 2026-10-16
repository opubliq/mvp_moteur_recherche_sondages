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
  computeConceptTable,
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
