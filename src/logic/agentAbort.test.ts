import { describe, expect, it } from "vitest";
import { CANCELLED_NOTE, runAgentStream, type AgentEvent } from "./agent";

const twoToolCallsTurn = {
  message: {
    role: "assistant" as const,
    content: null,
    tool_calls: [
      { id: "c1", type: "function" as const, function: { name: "crosstab", arguments: "{}" } },
      { id: "c2", type: "function" as const, function: { name: "crosstab", arguments: "{}" } },
    ],
  },
};

async function drain(gen: AsyncGenerator<AgentEvent>) {
  const events: AgentEvent[] = [];
  for await (const ev of gen) events.push(ev);
  const done = events.find((e) => e.type === "done");
  return { events, result: done && done.type === "done" ? done.result : undefined };
}

describe("arrêt doux de la boucle agent", () => {
  it("rend le travail fait, complète les outils non exécutés, sans nouvel appel modèle", async () => {
    const abort = new AbortController();
    let chatCalls = 0;
    const chat = async () => {
      chatCalls += 1;
      return twoToolCallsTurn;
    };
    const execute = async () => {
      abort.abort();
      return { rows: [{ a: 1 }] };
    };
    const { result } = await drain(
      runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat, execute, signal: abort.signal }),
    );
    expect(chatCalls).toBe(1);
    expect(result?.stopped_reason).toBe("cancelled");
    expect(result?.trace).toHaveLength(1);
    const msgs = result!.messages;
    // Chaque tool_call a un résultat : c1 réel, c2 marqué interrompu ; puis la note.
    const tools = msgs.filter((m) => m.role === "tool");
    expect(tools.map((m) => m.tool_call_id)).toEqual(["c1", "c2"]);
    expect(String(tools[1].content)).toContain("interrompu");
    expect(msgs[msgs.length - 1]).toEqual({ role: "assistant", content: CANCELLED_NOTE });
  });

  it("un appel modèle annulé termine proprement avec stopped_reason cancelled", async () => {
    const abort = new AbortController();
    const chat = async () => {
      abort.abort();
      throw new DOMException("aborted", "AbortError");
    };
    const { result } = await drain(
      runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat, signal: abort.signal }),
    );
    expect(result?.stopped_reason).toBe("cancelled");
    expect(result?.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("déjà annulé avant le départ : aucun appel modèle", async () => {
    const abort = new AbortController();
    abort.abort();
    let chatCalls = 0;
    const chat = async () => {
      chatCalls += 1;
      return twoToolCallsTurn;
    };
    const { result } = await drain(
      runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat, signal: abort.signal }),
    );
    expect(chatCalls).toBe(0);
    expect(result?.stopped_reason).toBe("cancelled");
  });
});
