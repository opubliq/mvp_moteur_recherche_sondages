/**
 * Test du câblage costlog de la boucle agent (bead 97r.4). On injecte `chat` et
 * `execute` (aucun fetch réel) pour piloter une boucle de plusieurs tours, puis
 * on vérifie que chaque tour émet une ligne `[costlog] op=agent_turn` avec un
 * turn_index incrémental et le MÊME request_id — condition de la sommation par
 * requête (boucle + outils). Placé sous `netlify/functions/` (répertoire
 * découvert par vitest).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { COSTLOG_PREFIX } from "../../../src/logic/costlog";
import {
  runAgent,
  type ChatFn,
  type AgentEnv,
  type MicrodataProvider,
} from "../../../src/logic/agent";

/** Récupère les lignes costlog (préfixées) parsées parmi les appels console.log. */
function costlogLines(spy: ReturnType<typeof vi.spyOn>): any[] {
  return spy.mock.calls
    .map((c) => c[0] as string)
    .filter((l) => typeof l === "string" && l.startsWith(COSTLOG_PREFIX))
    .map((l) => JSON.parse(l.slice(l.indexOf(" ") + 1)));
}

// Env factice : la boucle n'appelle jamais le vrai AOAI (chat/execute injectés).
const FAKE_ENV = {} as unknown as AgentEnv;
const FAKE_MICRODATA = {} as unknown as MicrodataProvider;

describe("agent loop costlog (97r.4)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("émet une ligne agent_turn par tour, turn_index incrémental, request_id constant", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Scénario 2 tours : tour 0 → demande un outil ; tour 1 → réponse finale.
    let call = 0;
    const chat: ChatFn = async () => {
      call += 1;
      if (call === 1) {
        return {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "c1", type: "function", function: { name: "search_questions", arguments: '{"query":"climat"}' } },
            ],
          },
          usage: { prompt_tokens: 100, completion_tokens: 10 },
        };
      }
      return {
        message: { role: "assistant", content: "Voici la réponse.", tool_calls: undefined },
        usage: { prompt_tokens: 250, completion_tokens: 40 },
      };
    };

    const execute = async () => ({ count: 0, results: [] });

    const result = await runAgent([{ role: "user", content: "climat" }], FAKE_ENV, FAKE_MICRODATA, {
      chat,
      execute,
      usage: { clientId: "acme", requestId: "req-fixe-123" },
    });

    expect(result.iterations).toBe(2);

    const turns = costlogLines(logSpy).filter((r) => r.op === "agent_turn");
    expect(turns).toHaveLength(2);
    expect(turns.map((t) => t.meta.turn_index)).toEqual([0, 1]);
    // request_id constant sur tous les tours (fourni par l'endpoint).
    expect(new Set(turns.map((t) => t.request_id))).toEqual(new Set(["req-fixe-123"]));
    // tokens du tour propagés depuis usage.
    expect(turns[0].prompt_tokens).toBe(100);
    expect(turns[1].completion_tokens).toBe(40);
    expect(typeof turns[0].latency_ms).toBe("number");
    // client_id du tenant propagé par le handler sur chaque tour (ticket 97r.5).
    expect(new Set(turns.map((t) => t.client_id))).toEqual(new Set(["acme"]));
  });

  it("génère un request_id local si aucun n'est fourni (rétrocompatible)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const chat: ChatFn = async () => ({
      message: { role: "assistant", content: "fin", tool_calls: undefined },
      usage: { prompt_tokens: 5, completion_tokens: 1 },
    });

    await runAgent([{ role: "user", content: "x" }], FAKE_ENV, FAKE_MICRODATA, { chat });

    const [turn] = costlogLines(logSpy).filter((r) => r.op === "agent_turn");
    expect(turn.op).toBe("agent_turn");
    expect(typeof turn.request_id).toBe("string");
    expect(turn.request_id.length).toBeGreaterThan(0);
    expect(turn.client_id).toBe("unknown");
  });
});
