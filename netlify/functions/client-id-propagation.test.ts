/**
 * Critère d'acceptance du ticket 97r.5, joué de bout en bout sur le handler
 * `/search` réel : deux requêtes émises avec deux identités différentes doivent
 * produire des lignes `[costlog]` avec des `client_id` distincts — sur TOUTES
 * les ops de la requête (embed + rerank), sous un request_id commun.
 *
 * `fetch` est mocké (AOAI embeddings, Azure AI Search, Cohere rerank) : le test
 * ne touche aucun service.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COSTLOG_PREFIX } from "../../src/logic/costlog";
import { handler as searchHandler } from "./search";

const ENV_VARS = {
  SEARCH_ENDPOINT: "https://search.example",
  SEARCH_QUERY_KEY: "k",
  AOAI_ENDPOINT: "https://aoai.example",
  AOAI_KEY: "k",
  AOAI_EMBED_DEPLOYMENT: "emb",
  COHERE_RERANK_ENDPOINT: "https://cohere.example",
  COHERE_RERANK_DEPLOYMENT: "Cohere-rerank-v4.0-pro",
  COHERE_RERANK_KEY: "k",
};

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

/** Un candidat suffit : il fait passer la requête par l'embed ET par le rerank. */
function mockAzureAndCohere() {
  vi.spyOn(globalThis, "fetch").mockImplementation((input: any) => {
    const url = String(input);
    if (url.includes("/embeddings")) {
      return Promise.resolve(
        jsonResponse({ data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }], usage: { prompt_tokens: 9 } }),
      );
    }
    if (url.includes("/rerank")) {
      return Promise.resolve(jsonResponse({ results: [{ index: 0, relevance_score: 0.8 }] }));
    }
    return Promise.resolve(
      jsonResponse({ value: [{ question_text: "q", response_options: [], "@search.score": 1 }] }),
    );
  });
}

/** Joue une requête /search avec les en-têtes donnés, renvoie ses lignes costlog. */
async function searchWithHeaders(headers: Record<string, string>): Promise<any[]> {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const res = await searchHandler(
    { httpMethod: "POST", headers, body: JSON.stringify({ query: "climat" }) } as any,
    {} as any,
    undefined as any,
  );
  expect((res as any).statusCode).toBe(200);
  const lines = costlogLines(logSpy);
  logSpy.mockRestore();
  return lines;
}

describe("propagation client_id de bout en bout (97r.5)", () => {
  beforeEach(() => {
    Object.assign(process.env, ENV_VARS);
    mockAzureAndCohere();
  });
  afterEach(() => vi.restoreAllMocks());

  it("deux identités différentes → deux client_id distincts sur toutes les ops", async () => {
    const acme = await searchWithHeaders({ "x-client-id": "acme" });
    const globex = await searchWithHeaders({ authorization: `Basic ${btoa("globex:pw")}` });

    // Chaque requête a bien traversé embed + rerank.
    expect(acme.map((r) => r.op).sort()).toEqual(["embed", "rerank"]);
    expect(globex.map((r) => r.op).sort()).toEqual(["embed", "rerank"]);

    expect(new Set(acme.map((r) => r.client_id))).toEqual(new Set(["acme"]));
    expect(new Set(globex.map((r) => r.client_id))).toEqual(new Set(["globex"]));

    // Un seul request_id par requête, et deux requêtes = deux request_id.
    expect(new Set(acme.map((r) => r.request_id)).size).toBe(1);
    expect(acme[0].request_id).not.toBe(globex[0].request_id);
  });

  it("sans identité → client_id unknown, et la requête aboutit quand même", async () => {
    const anon = await searchWithHeaders({});
    expect(anon.length).toBeGreaterThan(0);
    expect(new Set(anon.map((r) => r.client_id))).toEqual(new Set(["unknown"]));
  });
});
