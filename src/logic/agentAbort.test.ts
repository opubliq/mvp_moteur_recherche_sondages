import { describe, expect, it } from "vitest";
import { runAgentStream } from "./agent";

const toolCallTurn = {
  message: {
    role: "assistant" as const,
    content: null,
    tool_calls: [{ id: "c1", type: "function" as const, function: { name: "crosstab", arguments: "{}" } }],
  },
};

describe("arrêt de la boucle agent (client parti)", () => {
  it("s'arrête après l'outil en cours, sans nouvel appel modèle ni event done", async () => {
    const abort = new AbortController();
    let chatCalls = 0;
    const chat = async () => {
      chatCalls += 1;
      return toolCallTurn;
    };
    const execute = async () => {
      abort.abort();
      return { rows: [] };
    };
    const types: string[] = [];
    for await (const ev of runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, {
      chat,
      execute,
      signal: abort.signal,
    })) {
      types.push(ev.type);
    }
    expect(chatCalls).toBe(1);
    expect(types).not.toContain("done");
  });

  it("un appel modèle annulé termine la boucle sans lever d'erreur", async () => {
    const abort = new AbortController();
    const chat = async () => {
      abort.abort();
      throw new DOMException("aborted", "AbortError");
    };
    const types: string[] = [];
    for await (const ev of runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, {
      chat,
      signal: abort.signal,
    })) {
      types.push(ev.type);
    }
    expect(types).toEqual([]);
  });

  it("déjà annulé avant le départ : aucun appel modèle", async () => {
    const abort = new AbortController();
    abort.abort();
    let chatCalls = 0;
    const chat = async () => {
      chatCalls += 1;
      return toolCallTurn;
    };
    for await (const _ of runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat, signal: abort.signal })) void _;
    expect(chatCalls).toBe(0);
  });
});
