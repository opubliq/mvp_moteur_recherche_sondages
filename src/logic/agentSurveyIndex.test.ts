import { describe, expect, it } from "vitest";
import {
  buildSurveyIndex,
  detailSurveyQuestion,
  elideIndexResult,
  filterIndex,
  indexLine,
  INDEX_FULL_MAX,
  INDEX_QUERY_MAX,
} from "./agent";

const q = (variable: string, display_label: string, extra: Record<string, unknown> = {}) => ({
  variable,
  display_label,
  question_text: `Long question text for ${variable}`,
  var_type: "single",
  ...extra,
});

describe("index compact get_survey (9ou.10)", () => {
  it("indexLine : variable | type | libellé court, flag sociodémo", () => {
    expect(indexLine(q("cps25_demsat", "Satisfaction with Canadian democracy"))).toBe(
      "cps25_demsat | single | Satisfaction with Canadian democracy",
    );
    expect(indexLine(q("yob", "Year of birth", { is_sociodemo: true, sociodemo_type: "age" }))).toBe(
      "yob | single | Year of birth [socio:age]",
    );
    const long = indexLine(q("v", "x".repeat(300)));
    expect(long.length).toBeLessThan(110);
    expect(long.endsWith("…")).toBe(true);
  });

  it("petit sondage : toutes les lignes", () => {
    const qs = [q("a", "Alpha"), q("b", "Beta")];
    const r = buildSurveyIndex(qs) as any;
    expect(r.questions).toEqual(["a | single | Alpha", "b | single | Beta"]);
  });

  it("gros sondage sans query : noms seulement + sociodémo + consigne", () => {
    const qs = Array.from({ length: INDEX_FULL_MAX + 50 }, (_, i) => q(`v${i}`, `Label ${i}`));
    qs.push(q("age", "Age", { is_sociodemo: true, sociodemo_type: "age" }));
    const r = buildSurveyIndex(qs) as any;
    expect(r.questions).toBeUndefined();
    expect(r.variable_names).toHaveLength(qs.length);
    expect(r.sociodemo).toEqual(["age | single | Age [socio:age]"]);
    expect(r.hint).toMatch(/query/);
    // Beaucoup plus petit que l'ancien index objet (variable+question_text+type par variable).
    const legacy = JSON.stringify(qs.map((x) => ({ variable: x.variable, question_text: x.question_text, var_type: x.var_type })));
    expect(JSON.stringify(r).length).toBeLessThan(legacy.length / 2);
  });

  it("query : filtre lexical sans accents, préfixe 6 lettres, classé, plafonné", () => {
    const qs = [
      q("demsat", "Satisfaction with Canadian democracy"),
      q("fedsat", "Satisfaction with federal government"),
      q("tax", "Carbon tax"),
    ];
    expect(filterIndex(qs, "satisfaction démocratie").map((x) => x.variable)).toEqual(["demsat", "fedsat"]);
    expect(filterIndex(qs, "xx")).toEqual([]);
    const many = Array.from({ length: INDEX_QUERY_MAX + 10 }, (_, i) => q(`t${i}`, "trust in media"));
    const r = buildSurveyIndex(many, "trust") as any;
    expect(r.matched).toBe(INDEX_QUERY_MAX + 10);
    expect(r.questions).toHaveLength(INDEX_QUERY_MAX);
    expect(r.truncated).toBe(true);
  });

  it("détail : options compactes code=label, préfixe redondant retiré", () => {
    const d = detailSurveyQuestion({
      variable: "yob",
      var_type: "single",
      question_text: "In what year were you born?",
      response_options: [
        { code: "1", label: "1. 1920" },
        { code: "15", label: "15" },
        { code: "-99", label: "Don't know" },
      ],
    });
    expect(d.response_options).toEqual(["1=1920", "15", "-99=Don't know"]);
  });

  it("elideIndexResult : remplace un index déjà lu, laisse le reste intact", () => {
    const idx = JSON.stringify({ survey_id: "s", has_microdata: true, mode: "index", questions: ["a | single | A"], sociodemo: ["age | single | Age"] });
    const e = JSON.parse(elideIndexResult(idx));
    expect(e.mode).toBe("index_elided");
    expect(e.questions).toBeUndefined();
    expect(e.sociodemo).toEqual(["age | single | Age"]);
    const detail = JSON.stringify({ mode: "detail", questions: [] });
    expect(elideIndexResult(detail)).toBe(detail);
    expect(elideIndexResult("not json")).toBe("not json");
  });
});

describe("boucle : l'index n'est montré qu'une fois (9ou.10)", () => {
  it("le tour suivant voit l'index, celui d'après un stub", async () => {
    const { runAgentStream } = await import("./agent");
    const seen: string[][] = [];
    const calls = [
      { id: "c1", type: "function" as const, function: { name: "get_survey", arguments: '{"survey_id":"s"}' } },
      { id: "c2", type: "function" as const, function: { name: "crosstab", arguments: '{"survey_id":"s","target":"a"}' } },
    ];
    let turn = 0;
    const chat = async (messages: any[]) => {
      seen.push(messages.filter((m) => m.role === "tool").map((m) => m.content));
      const tc = calls[turn++];
      return { message: { role: "assistant" as const, content: tc ? null : "fin", ...(tc ? { tool_calls: [tc] } : {}) } };
    };
    const execute = async (name: string) =>
      name === "get_survey"
        ? { survey_id: "s", mode: "index", questions: ["a | single | A"], sociodemo: [] }
        : { rows: [] };
    const env = {} as any;
    for await (const _ of runAgentStream([{ role: "user", content: "x" }], env, {} as any, { chat, execute })) void _;
    // 4e appel : garde-fou de correction du format constat/preuve (le crosstab a
    // réussi mais "fin" ne contient pas <!--CONSTAT-->) — même outils déjà vus,
    // donc le filtrage des messages `tool` renvoie le même contenu qu'au 3e appel.
    expect(seen).toHaveLength(4);
    expect(JSON.parse(seen[1][0]).mode).toBe("index");
    expect(JSON.parse(seen[2][0]).mode).toBe("index_elided");
    expect(JSON.parse(seen[2][1])).toEqual({ rows: [] });
  });
});

describe("compactCrosstabResult (9ou.10)", () => {
  it("rows objets → columns + tableaux arrondis, nulls de méta retirés", async () => {
    const { compactCrosstabResult } = await import("./agent");
    const r = compactCrosstabResult({
      survey_id: "s",
      target2: null,
      mode: "crosstab",
      row_count: 1,
      rows: [{ dim_code: 18, target_code: 1, raw_n: 57, weighted_n: 88.77671, col_share: 0.476518138, col_share_se: 0.0495725 }],
    }) as any;
    expect(r.target2).toBeUndefined();
    expect(r.columns).toEqual(["dim_code", "target_code", "raw_n", "weighted_n", "col_share", "col_share_se"]);
    expect(r.rows).toEqual([[18, 1, 57, 88.8, 0.4765, 0.0496]]);
  });
  it("plafonne une dimension trop fine, laisse passer les autres formes", async () => {
    const { compactCrosstabResult, CROSSTAB_ROWS_MAX } = await import("./agent");
    const rows = Array.from({ length: CROSSTAB_ROWS_MAX + 5 }, (_, i) => ({ dim_code: i, raw_n: 1 }));
    const r = compactCrosstabResult({ rows }) as any;
    expect(r.rows).toHaveLength(CROSSTAB_ROWS_MAX);
    expect(r.rows_omitted).toBe(5);
    expect(compactCrosstabResult({ error: "x" })).toEqual({ error: "x" });
  });
});

describe("search / list_surveys compacts (9ou.10)", () => {
  it("compactSearchResults : lignes + table des noms de sondages une fois", async () => {
    const { compactSearchResults } = await import("./agent");
    const r = compactSearchResults([
      { survey_id: "ces_2021", survey_name: "CES 2021", survey_year: 2021, variable: "cps21_demsat", question_text: "How satisfied?", var_type: "single", themes: ["démocratie"], score_pertinence: 96 },
      { survey_id: "ces_2021", survey_name: "CES 2021", survey_year: 2021, variable: "age", question_text: "Age", var_type: "single", is_sociodemo: true, sociodemo_type: "age", themes: [], score_pertinence: 40 },
    ]);
    expect(r.surveys).toEqual({ ces_2021: "CES 2021 (2021)" });
    expect(r.results).toEqual([
      "ces_2021 | cps21_demsat | single | 96 | How satisfied? {démocratie}",
      "ces_2021 | age | single | 40 | Age [socio:age]",
    ]);
  });
  it("compactSurveyList : flag micro-données par ligne", async () => {
    const { compactSurveyList } = await import("./agent");
    const r = compactSurveyList(
      [{ survey_id: "a", survey_year: 2025, survey_name: "A", pollster: "P", n_respondents: 10, survey_description: "d" }, { survey_id: "b" }],
      new Set(["a"]),
    );
    expect(r.surveys[0]).toBe("a | 2025 | A | P | N=10 | has_microdata | d");
    expect(r.surveys[1]).toContain("no_microdata");
  });
});
