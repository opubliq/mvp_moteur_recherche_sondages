/**
 * Test unitaire du câblage costlog aux 3 call-sites token-based (bead 97r.2) :
 * decompose, embed (retrieve), annotate. On mocke `fetch` et on vérifie qu'une
 * ligne `[costlog]` est émise avec le bon `op` et les tokens extraits de
 * `usage`. Placé sous `netlify/functions/` (seul répertoire découvert par vitest).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { COSTLOG_PREFIX } from "../../../src/logic/costlog";
import { decomposeQuery } from "../../../src/logic/decompose";
import { retrieve } from "../../../src/logic/retrieve";
import { annotateBatch } from "../../../src/logic/annotate";
import { rerankCandidates, type RerankEnv } from "../../../src/logic/rerank";

/** Récupère la ligne costlog (préfixée) parmi tous les appels console.log. */
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

describe("costlog call-sites (97r.2)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("decompose émet op=decompose avec les tokens de usage", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: JSON.stringify({ concepts: [{ orig: "climat", syns: [] }], rerank_query: "q" }) } }],
        usage: { prompt_tokens: 120, completion_tokens: 40 },
      }),
    );

    await decomposeQuery("climat", {
      FOUNDRY_CHAT_ENDPOINT: "https://x",
      FOUNDRY_CHAT_KEY: "k",
      FOUNDRY_CHAT_DEPLOYMENT: "d",
    });

    const [rec] = costlogLines(logSpy);
    expect(rec.op).toBe("decompose");
    expect(rec.prompt_tokens).toBe(120);
    expect(rec.completion_tokens).toBe(40);
    expect(typeof rec.request_id).toBe("string");
    expect(rec.client_id).toBe("unknown");
  });

  it("embed émet op=embed avec prompt_tokens seulement", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation((input: any) => {
      const url = String(input);
      if (url.includes("/embeddings")) {
        return Promise.resolve(
          jsonResponse({ data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }], usage: { prompt_tokens: 7 } }),
        );
      }
      return Promise.resolve(jsonResponse({ value: [] }));
    });

    await retrieve("climat", undefined, {
      SEARCH_ENDPOINT: "https://s",
      SEARCH_QUERY_KEY: "k",
      AOAI_ENDPOINT: "https://a",
      AOAI_KEY: "k",
      AOAI_EMBED_DEPLOYMENT: "emb",
    });

    const [rec] = costlogLines(logSpy);
    expect(rec.op).toBe("embed");
    expect(rec.prompt_tokens).toBe(7);
    expect(rec.completion_tokens).toBeUndefined();
  });

  it("annotate émet op=annotate avec meta.batch_size", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: JSON.stringify({ "1": "oui", "2": "non" }) }, finish_reason: "stop" }],
        usage: { prompt_tokens: 200, completion_tokens: 10 },
      }),
    );

    await annotateBatch(
      [
        { id: "a", text: "réponse un" },
        { id: "b", text: "réponse deux" },
      ],
      { property: "p", options: ["oui", "non"], questionText: "q" },
      { AOAI_ENDPOINT: "https://a", AOAI_KEY: "k", AOAI_CHAT_DEPLOYMENT: "chat" },
    );

    const [rec] = costlogLines(logSpy);
    expect(rec.op).toBe("annotate");
    expect(rec.prompt_tokens).toBe(200);
    expect(rec.completion_tokens).toBe(10);
    expect(rec.meta).toEqual({ batch_size: 2 });
  });

  it("rerank émet op=rerank avec units=ceil(nb_docs/100), nb_docs et request_id constant", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    // 150 candidats bruts → 150 docs envoyés à Cohere → 2 search units.
    const candidates = Array.from({ length: 150 }, (_, i) => ({
      question_text: `q${i}`,
      response_options: [],
      display_label: null,
      "@search.score": 150 - i,
    })) as any;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ results: candidates.map((_: unknown, i: number) => ({ index: i, relevance_score: 0.5 })) }),
    );

    const env: RerankEnv = {
      COHERE_RERANK_ENDPOINT: "https://c",
      COHERE_RERANK_DEPLOYMENT: "Cohere-rerank-v4.0-pro",
      COHERE_RERANK_KEY: "k",
    };
    await rerankCandidates("climat", candidates, env, { clientId: "acme", requestId: "req-fixed-123" });

    const [rec] = costlogLines(logSpy);
    expect(rec.op).toBe("rerank");
    expect(rec.units).toBe(2); // ceil(150 / 100)
    expect(rec.meta).toEqual({ nb_docs: 150 });
    expect(rec.request_id).toBe("req-fixed-123");
    expect(rec.client_id).toBe("acme");
    expect(rec.prompt_tokens).toBeUndefined();
    expect(typeof rec.latency_ms).toBe("number");
  });
});
