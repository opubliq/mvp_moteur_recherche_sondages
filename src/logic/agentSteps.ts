/**
 * Réduction pure des events `tool_start`/`tool_end` (aat.4) en une liste
 * d'étapes affichables (bead UI « étapes en direct »), + le libellé FR/EN de
 * chaque étape et le regroupement des figures/tableaux `run_python` d'un tour.
 *
 * Module SANS React ni DOM à dessein : testable avec un simple `t` stub, et
 * partagé entre le fil (colonne gauche, compact) et le panneau Réponse
 * (colonne droite, figures/tableaux attachés à la réponse qui les a produits).
 */

import type { AgentEvent, ToolTrace } from "./agent";
import { RUN_PYTHON_TOOL_NAME, type SandboxFigure, type SandboxTable } from "./pythonSandbox";
import { GEO_PROFILE_TOOL_NAME, GEO_LOOKUP_TOOL_NAME } from "./geoTool";
import type { TranslationKey } from "../i18n/fr";

/** Seuls les events pertinents pour la liste d'étapes — `message`/`done` ignorés ici. */
export type AgentToolEvent = Extract<AgentEvent, { type: "tool_start" | "tool_end" }>;

export interface AgentStep {
  /** Index stable (ordre d'apparition des `tool_start`) — clé React. */
  key: number;
  tool: string;
  args: unknown;
  status: "running" | "done" | "error";
  error?: string;
  figures?: SandboxFigure[];
  tables?: SandboxTable[];
}

/**
 * Replie une séquence d'events en étapes. Un `tool_end` complète le DERNIER
 * step `running` du même nom d'outil (plusieurs appels du même outil dans un
 * tour sont possibles — ex. deux `get_survey` de suite). Un `tool_end` sans
 * `tool_start` correspondant (ne devrait pas arriver) est ignoré : pas d'étape
 * fantôme.
 */
export function foldAgentSteps(events: readonly AgentToolEvent[]): AgentStep[] {
  const steps: AgentStep[] = [];
  for (const ev of events) {
    if (ev.type === "tool_start") {
      steps.push({ key: steps.length, tool: ev.tool, args: ev.args, status: "running" });
      continue;
    }
    const trace: ToolTrace = ev.trace;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].status === "running" && steps[i].tool === trace.tool) {
        steps[i] = {
          ...steps[i],
          args: trace.args,
          status: trace.ok ? "done" : "error",
          error: trace.error,
          figures: trace.figures,
          tables: trace.tables,
        };
        break;
      }
    }
  }
  return steps;
}

/** Étapes (déjà toutes terminées) à partir d'une trace persistée — même forme
 *  que `foldAgentSteps`, pour réutiliser `StepRow`/`StepList` sur un tour relu. */
export function stepsFromTrace(trace: readonly ToolTrace[] | undefined): AgentStep[] {
  return (trace ?? []).map((t, i) => ({
    key: i,
    tool: t.tool,
    args: t.args,
    status: t.ok ? "done" : "error",
    error: t.error,
    figures: t.figures,
    tables: t.tables,
  }));
}

/** Figures + tableaux de toutes les étapes d'un tour, dans l'ordre d'exécution. */
export function collectStepResults(steps: readonly AgentStep[]): { figures: SandboxFigure[]; tables: SandboxTable[] } {
  const figures: SandboxFigure[] = [];
  const tables: SandboxTable[] = [];
  for (const s of steps) {
    if (s.figures) figures.push(...s.figures);
    if (s.tables) tables.push(...s.tables);
  }
  return { figures, tables };
}

/** Même chose directement depuis une trace persistée (tour déjà terminé). */
export function collectTraceResults(trace: readonly ToolTrace[] | undefined): { figures: SandboxFigure[]; tables: SandboxTable[] } {
  const figures: SandboxFigure[] = [];
  const tables: SandboxTable[] = [];
  for (const t of trace ?? []) {
    if (t.figures) figures.push(...t.figures);
    if (t.tables) tables.push(...t.tables);
  }
  return { figures, tables };
}

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function truncateArg(s: string, max = 40): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Libellé humain d'une étape — un repère concret ("Lecture du sondage
 * ces_2021") plutôt que le nom technique de l'outil. Tolère des arguments
 * absents/mal formés (le modèle peut appeler un outil sans tous ses args
 * avant que la validation serveur ne tranche) : repli sur un libellé générique.
 */
export function stepLabel(tool: string, args: unknown, t: Translate): string {
  const a = (args && typeof args === "object" ? (args as Record<string, unknown>) : {}) as Record<string, unknown>;
  const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  switch (tool) {
    case "search_questions": {
      const query = str(a.query);
      return query ? t("agent.step.searchQuery", { query: truncateArg(query) }) : t("agent.step.search");
    }
    case "list_surveys":
      return t("agent.step.listSurveys");
    case "list_themes":
      return t("agent.step.listThemes");
    case "get_survey": {
      const surveyId = str(a.survey_id);
      return surveyId ? t("agent.step.getSurvey", { survey_id: surveyId }) : t("agent.step.getSurveyGeneric");
    }
    case "crosstab": {
      const target = str(a.target);
      const dim = str(a.dim);
      if (target && dim) return t("agent.step.crosstabDim", { target, dim });
      if (target) return t("agent.step.crosstabTarget", { target });
      return t("agent.step.crosstab");
    }
    case RUN_PYTHON_TOOL_NAME:
      return t("agent.step.runPython");
    case GEO_PROFILE_TOOL_NAME:
      return t("agent.step.geoProfile");
    case GEO_LOOKUP_TOOL_NAME:
      return t("agent.step.geoLookup");
    default:
      return t("agent.step.generic", { tool });
  }
}
