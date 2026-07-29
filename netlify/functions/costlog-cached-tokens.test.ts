/**
 * Capture de `cached_tokens` aux call-sites token-based (bead 97r.8).
 *
 * POURQUOI CE TEST. Le tarif *cached input* est à 1/10 de l'input normal
 * (price card 97r.6), et la boucle agent repaie son system prompt + les schémas
 * d'outils à chaque tour — soit exactement les tokens qu'Azure peut servir
 * depuis son cache. Si `prompt_tokens_details.cached_tokens` n'est pas capté au
 * moment des runs instrumentés, il faut TOUT relancer pour le savoir. D'où ce
 * garde-fou.
 *
 * On vérifie les deux sens : le champ remonte quand l'API le fournit, et il
 * reste absent (pas 0, qui affirmerait « aucun cache ») quand elle se tait.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { COSTLOG_PREFIX } from "../../src/logic/costlog";
import { decomposeQuery } from "../../src/logic/decompose";
import { annotateBatch } from "../../src/logic/annotate";
import {
  runAgent,
  type AgentEnv,
  type ChatFn,
  type MicrodataProvider,
} from "../../src/logic/agent";

function costlogLines(spy: ReturnType<typeof vi.spyOn>): any[] {
  return spy.mock.calls
    .map((c) => c[0] as string)
    .filter((l) => typeof l === "string" && l.startsWith(COSTLOG_PREFIX))
    .map((l) => JSON.parse(l.slice(l.indexOf(" ") + 1)));
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: { get: () => null },
  } as unknown as Response;
}

const DECOMPOSE_ENV = {
  FOUNDRY_CHAT_ENDPOINT: "https://x",
  FOUNDRY_CHAT_KEY: "k",
  FOUNDRY_CHAT_DEPLOYMENT: "d",
};

const ANNOTATE_ENV = {
  AOAI_ENDPOINT: "https://x",
  AOAI_KEY: "k",
  AOAI_CHAT_DEPLOYMENT: "d",
};

describe("cached_tokens (97r.8)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("decompose remonte cached_tokens quand l'API le fournit", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({ concepts: [{ orig: "climat", syns: [] }], rerank_query: "q" }),
            },
          },
        ],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 40,
          prompt_tokens_details: { cached_tokens: 1024 },
        },
      }),
    );

    await decomposeQuery("climat", DECOMPOSE_ENV);

    const [rec] = costlogLines(logSpy);
    expect(rec.op).toBe("decompose");
    expect(rec.prompt_tokens).toBe(1200);
    expect(rec.cached_tokens).toBe(1024);
  });

  it("laisse cached_tokens absent quand l'API ne le rapporte pas", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({ concepts: [{ orig: "climat", syns: [] }], rerank_query: "q" }),
            },
          },
        ],
        usage: { prompt_tokens: 1200, completion_tokens: 40 },
      }),
    );

    await decomposeQuery("climat", DECOMPOSE_ENV);

    const [rec] = costlogLines(logSpy);
    // Absent, pas 0 : un 0 affirmerait « mesuré, aucun cache », alors qu'on ne
    // sait rien. L'agrégation doit pouvoir distinguer les deux.
    expect(rec.cached_tokens).toBeUndefined();
  });

  it("annotate remonte cached_tokens", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: JSON.stringify({ annotations: [] }) }, finish_reason: "stop" }],
        usage: {
          prompt_tokens: 900,
          completion_tokens: 30,
          prompt_tokens_details: { cached_tokens: 768 },
        },
      }),
    );

    await annotateBatch(
      [
        { id: "a", text: "réponse un" },
        { id: "b", text: "réponse deux" },
      ],
      { property: "p", options: ["oui", "non"], questionText: "q" },
      ANNOTATE_ENV,
    );

    const [rec] = costlogLines(logSpy);
    expect(rec.op).toBe("annotate");
    expect(rec.cached_tokens).toBe(768);
  });

  it("agent_turn remonte cached_tokens par tour — le cas qui compte", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Deux tours : le 2e rejoue le system prompt + les schémas d'outils, donc
    // sa part cachée doit être plus grosse. C'est précisément l'effet à mesurer.
    let call = 0;
    const chat: ChatFn = async () => {
      call += 1;
      if (call === 1) {
        return {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "c1",
                type: "function",
                function: { name: "search_questions", arguments: '{"query":"climat"}' },
              },
            ],
          },
          usage: {
            prompt_tokens: 4000,
            completion_tokens: 50,
            prompt_tokens_details: { cached_tokens: 0 },
          },
        };
      }
      return {
        message: { role: "assistant", content: "Voici la réponse.", tool_calls: undefined },
        usage: {
          prompt_tokens: 4300,
          completion_tokens: 120,
          prompt_tokens_details: { cached_tokens: 3968 },
        },
      };
    };

    await runAgent(
      [{ role: "user", content: "combien de sondages ?" }],
      {} as unknown as AgentEnv,
      {} as unknown as MicrodataProvider,
      { chat, execute: async () => ({ count: 0, results: [] }) },
    );

    const agentTurns = costlogLines(logSpy).filter((r) => r.op === "agent_turn");
    expect(agentTurns.length).toBeGreaterThanOrEqual(2);
    expect(agentTurns[0].cached_tokens).toBe(0);
    expect(agentTurns[1].cached_tokens).toBe(3968);
  });
});
