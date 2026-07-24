/**
 * Test de la séquence d'events de `runAgentStream` (bead aat.4). On injecte
 * `chat` et `execute` (aucun fetch réel) pour piloter une boucle à 2 tours et on
 * vérifie que le générateur émet, DANS L'ORDRE : tool_start → tool_end → message
 * → done, et que l'event `done` porte le fil complet + la trace (source de vérité
 * réinjectée au tour suivant). Placé sous `netlify/functions/` (répertoire vitest).
 */
import { describe, expect, it, vi } from "vitest";
import {
  runAgentStream,
  type AgentEvent,
  type ChatFn,
  type AgentEnv,
  type MicrodataProvider,
} from "../../src/logic/agent";

const FAKE_ENV = {} as unknown as AgentEnv;
const FAKE_MICRODATA = {} as unknown as MicrodataProvider;

/** Draine un générateur d'events en tableau. */
async function collect(gen: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

describe("runAgentStream — séquence d'events (aat.4)", () => {
  it("émet tool_start → tool_end → message → done pour un tour d'outil puis final", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {}); // silence costlog

    // Tour 0 : demande search_questions. Tour 1 : réponse finale.
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
    const execute = async () => ({ count: 1, results: [{ variable: "Q1" }] });

    const events = await collect(
      runAgentStream([{ role: "user", content: "climat" }], FAKE_ENV, FAKE_MICRODATA, {
        chat,
        execute,
        requestId: "req-1",
      }),
    );

    expect(events.map((e) => e.type)).toEqual(["tool_start", "tool_end", "message", "done"]);

    const start = events[0] as Extract<AgentEvent, { type: "tool_start" }>;
    expect(start.tool).toBe("search_questions");
    expect(start.args).toEqual({ query: "climat" });

    const end = events[1] as Extract<AgentEvent, { type: "tool_end" }>;
    expect(end.trace).toEqual({ tool: "search_questions", args: { query: "climat" }, ok: true });

    const msg = events[2] as Extract<AgentEvent, { type: "message" }>;
    expect(msg.content).toBe("Voici la réponse.");

    const done = events[3] as Extract<AgentEvent, { type: "done" }>;
    expect(done.result.message).toBe("Voici la réponse.");
    expect(done.result.stopped_reason).toBe("final");
    expect(done.result.iterations).toBe(2);
    // Le fil réinjectable exclut le system et contient user + assistant(tool) + tool + assistant(final).
    expect(done.result.messages.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(done.result.trace).toHaveLength(1);
  });

  it("propage un tool_end en erreur sans interrompre le flux", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    let call = 0;
    const chat: ChatFn = async () => {
      call += 1;
      if (call === 1) {
        return {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "c1", type: "function", function: { name: "crosstab", arguments: '{"survey_id":"x","target":"Q"}' } },
            ],
          },
        };
      }
      return { message: { role: "assistant", content: "Désolé, pas de micro-données.", tool_calls: undefined } };
    };
    // L'outil renvoie { error } (erreur métier) : ok=false, mais la boucle continue.
    const execute = async () => ({ error: "sondage sans micro-données" });

    const events = await collect(
      runAgentStream([{ role: "user", content: "x" }], FAKE_ENV, FAKE_MICRODATA, { chat, execute }),
    );

    const end = events.find((e) => e.type === "tool_end") as Extract<AgentEvent, { type: "tool_end" }>;
    expect(end.trace.ok).toBe(false);
    expect(end.trace.error).toBe("sondage sans micro-données");
    expect(events.at(-1)!.type).toBe("done");
  });
});
