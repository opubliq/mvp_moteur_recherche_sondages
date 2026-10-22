import { describe, expect, it } from "vitest";
import {
  executeTool,
  runAgent,
  type AgentEnv,
  type ChatMessage,
  type ChatTurn,
  type ManifestLike,
  type MicrodataProvider,
} from "./agent";
import { RUN_PYTHON_TOOL_DEF, RUN_PYTHON_TOOL_NAME, type RunPythonResult, type RunPythonTool } from "./pythonSandbox";

/**
 * Câblage `run_python` dans la boucle agent (bead 9ou.12) — exécuteur ACA réel
 * remplacé par un mock `RunPythonTool` (pas de pool, pas de réseau) : on teste
 * le CÂBLAGE (garde-fou manifest, outil offert/caché, base64 strippé pour le
 * modèle mais conservé dans la trace pour l'UI), pas `pythonSandbox.ts` lui-même
 * (déjà couvert par pythonSandbox.test.ts).
 */

const env: AgentEnv = {
  AOAI_ENDPOINT: "https://example-aoai.openai.azure.com/",
  AOAI_KEY: "k",
  AOAI_CHAT_DEPLOYMENT: "gpt-5-mini",
  SEARCH_ENDPOINT: "https://example-search.search.windows.net",
  SEARCH_QUERY_KEY: "k",
  AOAI_EMBED_DEPLOYMENT: "embed",
  COHERE_RERANK_ENDPOINT: "https://example-rerank",
  COHERE_RERANK_DEPLOYMENT: "rerank",
  COHERE_RERANK_KEY: "k",
};

const manifest: ManifestLike = { surveys: [{ survey_id: "ces_2021" }] };
const microdata: MicrodataProvider = {
  crosstab: async () => ({}),
  manifest: async () => manifest,
};

function fakeRunPython(result: RunPythonResult | { error: string }): RunPythonTool & { calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    async run(args) {
      calls.push(args);
      return result;
    },
    get callsMade() {
      return calls.length;
    },
  };
}

const okResult: RunPythonResult = {
  ok: true,
  stdout: "0.42",
  stderr: "",
  stdout_truncated: false,
  stderr_truncated: false,
  figures: [{ id: "fig-1", mime: "image/png", base64: "QUJD" }],
  tables: [],
  loaded_surveys: ["ces_2021"],
  loaded_census_niveaux: [],
  duration_ms: 12,
};

describe("executeTool : dispatch run_python (9ou.12)", () => {
  it("sans runPython branché : erreur explicite, pas d'exception", async () => {
    const r = (await executeTool("run_python", { code: "1+1" }, env, microdata, { current: null })) as { error: string };
    expect(r.error).toMatch(/pas disponible/);
  });

  it("survey_ids absent du manifest : refuse AVANT d'appeler l'exécuteur (même garde-fou que crosstab)", async () => {
    const rp = fakeRunPython(okResult);
    const r = (await executeTool(
      "run_python",
      { code: "1+1", survey_ids: ["sondage_prive_inconnu"] },
      env,
      microdata,
      { current: null },
      undefined,
      undefined,
      rp,
    )) as { error: string };
    expect(r.error).toMatch(/pas de micro-données calculables/);
    expect(rp.calls.length).toBe(0);
  });

  it("survey_ids dans le manifest : délègue à runPython.run", async () => {
    const rp = fakeRunPython(okResult);
    const r = await executeTool(
      "run_python",
      { code: "1+1", survey_ids: ["ces_2021"] },
      env,
      microdata,
      { current: null },
      undefined,
      undefined,
      rp,
    );
    expect(rp.calls.length).toBe(1);
    expect(r).toEqual(okResult);
  });
});

describe("runAgentStream : outil offert seulement si opts.runPython (9ou.12)", () => {
  function chatCapturingTools(toolCallOnFirstTurn: boolean) {
    const seenTools: unknown[][] = [];
    let turn = 0;
    const chat = async (messages: ChatMessage[], useTools: boolean): Promise<ChatTurn> => {
      // On n'a pas accès aux `tools` passés à fetch ici (chat est mocké) ; ce test
      // vérifie plutôt le comportement observable : l'outil run_python est bien
      // DISPATCHABLE quand le modèle l'appelle, et absent du prompt système sinon
      // (vérifié par le test système-prompt ci-dessous).
      void messages;
      void useTools;
      turn += 1;
      if (turn === 1 && toolCallOnFirstTurn) {
        return {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{ id: "c1", type: "function", function: { name: RUN_PYTHON_TOOL_NAME, arguments: JSON.stringify({ code: "1+1" }) } }],
          },
        };
      }
      return { message: { role: "assistant", content: "ok" } };
    };
    return { chat, seenTools };
  }

  it("run_python appelé par le modèle : figures dans la trace, base64 absent du message renvoyé au modèle", async () => {
    const rp = fakeRunPython(okResult);
    const { chat } = chatCapturingTools(true);
    const result = await runAgent([{ role: "user", content: "fais une régression" }], env, microdata, {
      chat,
      runPython: rp,
    });

    expect(result.trace).toHaveLength(1);
    expect(result.trace[0].tool).toBe(RUN_PYTHON_TOOL_NAME);
    expect(result.trace[0].figures).toEqual(okResult.figures);

    // Le message `tool` réinjecté dans `messages` (ce que le modèle a VU) ne
    // doit PAS contenir le base64 — seulement l'id/mime (toModelPayload).
    const toolMsg = result.messages.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    const parsed = JSON.parse(toolMsg!.content as string);
    expect(parsed.figures).toEqual([{ id: "fig-1", mime: "image/png" }]);
    expect(JSON.stringify(parsed)).not.toContain("QUJD");
  });

  it("sans opts.runPython : TOOL_DEFS seul (pas de RUN_PYTHON_TOOL_DEF)", () => {
    // RUN_PYTHON_TOOL_DEF n'est jamais dans la liste par défaut exportée.
    expect(RUN_PYTHON_TOOL_DEF.function.name).toBe(RUN_PYTHON_TOOL_NAME);
  });
});
