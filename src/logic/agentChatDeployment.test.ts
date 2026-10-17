import { describe, expect, it, vi, afterEach } from "vitest";
import { runAgent, type AgentEnv, type MicrodataProvider } from "./agent";

/**
 * Bead 9ou.13 : AGENT_CHAT_DEPLOYMENT (gpt-5.5) prioritaire sur AOAI_CHAT_DEPLOYMENT
 * (partagé avec scan/annotate/judge, resté gpt-5-mini) pour l'appel chat de l'agent.
 * On ne mocke pas `chat` (opts.chat) ici : justement, on veut vérifier l'URL que
 * construit `makeAoaiChat` (non exporté) à partir de l'env, donc on mocke `fetch`.
 */

const baseEnv: Omit<AgentEnv, "AGENT_CHAT_DEPLOYMENT"> = {
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

const microdata: MicrodataProvider = {
  crosstab: async () => ({}),
  manifest: async () => ({ surveys: [] }),
};

function mockFetchOnce(capture: { url?: string }) {
  return vi.fn(async (url: unknown) => {
    capture.url = String(url);
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        choices: [{ message: { role: "assistant", content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
      text: async () => "",
    } as unknown as Response;
  });
}

describe("makeAoaiChat : déploiement du chat (9ou.13)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("utilise AGENT_CHAT_DEPLOYMENT quand il est fourni", async () => {
    const capture: { url?: string } = {};
    vi.stubGlobal("fetch", mockFetchOnce(capture));

    const env: AgentEnv = { ...baseEnv, AGENT_CHAT_DEPLOYMENT: "gpt-5.5" };
    await runAgent([{ role: "user", content: "bonjour" }], env, microdata);

    expect(capture.url).toContain("/openai/deployments/gpt-5.5/chat/completions");
    expect(capture.url).not.toContain("gpt-5-mini");
  });

  it("retombe sur AOAI_CHAT_DEPLOYMENT quand AGENT_CHAT_DEPLOYMENT est absent", async () => {
    const capture: { url?: string } = {};
    vi.stubGlobal("fetch", mockFetchOnce(capture));

    const env: AgentEnv = { ...baseEnv };
    await runAgent([{ role: "user", content: "bonjour" }], env, microdata);

    expect(capture.url).toContain("/openai/deployments/gpt-5-mini/chat/completions");
  });
});
