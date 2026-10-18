import { describe, expect, it } from "vitest";
import {
  collectStepResults,
  collectTraceResults,
  foldAgentSteps,
  stepLabel,
  stepsFromTrace,
  type AgentToolEvent,
} from "./agentSteps";
import type { ToolTrace } from "./agent";

/** Stub `t` : rend visibles clé + vars, sans dépendre de i18n/fr.ts. */
function stubT(key: string, vars?: Record<string, string | number>): string {
  return vars ? `${key}:${JSON.stringify(vars)}` : key;
}

describe("foldAgentSteps", () => {
  it("un tool_start seul reste 'running'", () => {
    const events: AgentToolEvent[] = [{ type: "tool_start", tool: "search_questions", args: { query: "x" } }];
    const steps = foldAgentSteps(events);
    expect(steps).toEqual([{ key: 0, tool: "search_questions", args: { query: "x" }, status: "running" }]);
  });

  it("tool_end réussi complète le step running correspondant", () => {
    const trace: ToolTrace = { tool: "crosstab", args: { survey_id: "ces_2021" }, ok: true };
    const events: AgentToolEvent[] = [
      { type: "tool_start", tool: "crosstab", args: { survey_id: "ces_2021" } },
      { type: "tool_end", trace },
    ];
    const steps = foldAgentSteps(events);
    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe("done");
    expect(steps[0].error).toBeUndefined();
  });

  it("tool_end en erreur passe le step à 'error' avec le message", () => {
    const trace: ToolTrace = { tool: "get_survey", args: {}, ok: false, error: "introuvable" };
    const events: AgentToolEvent[] = [
      { type: "tool_start", tool: "get_survey", args: {} },
      { type: "tool_end", trace },
    ];
    const steps = foldAgentSteps(events);
    expect(steps[0].status).toBe("error");
    expect(steps[0].error).toBe("introuvable");
  });

  it("deux appels du même outil dans le même tour : chaque tool_end complète le bon running (le dernier d'abord)", () => {
    const events: AgentToolEvent[] = [
      { type: "tool_start", tool: "get_survey", args: { survey_id: "a" } },
      { type: "tool_end", trace: { tool: "get_survey", args: { survey_id: "a" }, ok: true } },
      { type: "tool_start", tool: "get_survey", args: { survey_id: "b" } },
      { type: "tool_end", trace: { tool: "get_survey", args: { survey_id: "b" }, ok: true } },
    ];
    const steps = foldAgentSteps(events);
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.status)).toEqual(["done", "done"]);
    expect((steps[0].args as { survey_id: string }).survey_id).toBe("a");
    expect((steps[1].args as { survey_id: string }).survey_id).toBe("b");
  });

  it("un tool_end sans tool_start correspondant ne crée pas d'étape fantôme", () => {
    const events: AgentToolEvent[] = [{ type: "tool_end", trace: { tool: "crosstab", args: {}, ok: true } }];
    expect(foldAgentSteps(events)).toEqual([]);
  });

  it("préserve l'ordre et les figures/tables sur le step complété", () => {
    const fig = { id: "fig-1", mime: "image/png" as const, base64: "AAA" };
    const tbl = { title: null, columns: ["x"], rows: [[1]], truncated: false };
    const events: AgentToolEvent[] = [
      { type: "tool_start", tool: "run_python", args: { code: "..." } },
      { type: "tool_end", trace: { tool: "run_python", args: {}, ok: true, figures: [fig], tables: [tbl] } },
    ];
    const steps = foldAgentSteps(events);
    expect(steps[0].figures).toEqual([fig]);
    expect(steps[0].tables).toEqual([tbl]);
  });
});

describe("collectStepResults / collectTraceResults", () => {
  it("regroupe les figures/tables de plusieurs étapes dans l'ordre", () => {
    const fig1 = { id: "fig-1", mime: "image/png" as const, base64: "AAA" };
    const fig2 = { id: "fig-2", mime: "image/png" as const, base64: "BBB" };
    const steps = foldAgentSteps([
      { type: "tool_start", tool: "run_python", args: {} },
      { type: "tool_end", trace: { tool: "run_python", args: {}, ok: true, figures: [fig1] } },
      { type: "tool_start", tool: "run_python", args: {} },
      { type: "tool_end", trace: { tool: "run_python", args: {}, ok: true, figures: [fig2] } },
    ]);
    expect(collectStepResults(steps).figures).toEqual([fig1, fig2]);
  });

  it("collectTraceResults lit une trace persistée (tour déjà terminé)", () => {
    const trace: ToolTrace[] = [
      { tool: "run_python", args: {}, ok: true, figures: [{ id: "fig-1", mime: "image/png", base64: "AAA" }] },
    ];
    expect(collectTraceResults(trace).figures).toHaveLength(1);
    expect(collectTraceResults(undefined)).toEqual({ figures: [], tables: [] });
  });
});

describe("stepsFromTrace", () => {
  it("convertit une trace persistée en étapes toutes terminées", () => {
    const trace: ToolTrace[] = [
      { tool: "search_questions", args: { query: "x" }, ok: true },
      { tool: "crosstab", args: {}, ok: false, error: "boom" },
    ];
    const steps = stepsFromTrace(trace);
    expect(steps.map((s) => s.status)).toEqual(["done", "error"]);
    expect(steps[1].error).toBe("boom");
  });

  it("trace absente → aucune étape", () => {
    expect(stepsFromTrace(undefined)).toEqual([]);
  });
});

describe("stepLabel", () => {
  it("search_questions avec query inclut le sujet", () => {
    expect(stepLabel("search_questions", { query: "immigration" }, stubT)).toBe(
      'agent.step.searchQuery:{"query":"immigration"}',
    );
  });

  it("search_questions sans query retombe sur le libellé générique", () => {
    expect(stepLabel("search_questions", {}, stubT)).toBe("agent.step.search");
  });

  it("get_survey avec survey_id nomme le sondage", () => {
    expect(stepLabel("get_survey", { survey_id: "ces_2021" }, stubT)).toBe(
      'agent.step.getSurvey:{"survey_id":"ces_2021"}',
    );
  });

  it("crosstab avec target+dim nomme le croisement", () => {
    expect(stepLabel("crosstab", { target: "vote", dim: "age" }, stubT)).toBe(
      'agent.step.crosstabDim:{"target":"vote","dim":"age"}',
    );
  });

  it("crosstab avec seulement target", () => {
    expect(stepLabel("crosstab", { target: "vote" }, stubT)).toBe('agent.step.crosstabTarget:{"target":"vote"}');
  });

  it("outil inconnu retombe sur le libellé générique avec le nom de l'outil", () => {
    expect(stepLabel("some_future_tool", {}, stubT)).toBe('agent.step.generic:{"tool":"some_future_tool"}');
  });

  it("args absents/mal formés ne font pas planter le libellé", () => {
    expect(stepLabel("crosstab", null, stubT)).toBe("agent.step.crosstab");
    expect(stepLabel("get_survey", "not-an-object", stubT)).toBe("agent.step.getSurveyGeneric");
  });
});
