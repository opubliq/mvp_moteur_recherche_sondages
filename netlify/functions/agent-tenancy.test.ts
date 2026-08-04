/**
 * Vérifie que la boucle agent respecte les index accessibles résolus par le
 * handler Netlify (f3i.11) : `executeTool` doit interroger CHAQUE index reçu,
 * pas seulement le public en dur. Sans ce câblage, un compte client verrait son
 * corpus privé dans /search mais pas dans l'agent — incohérence UX.
 *
 * Placé sous `netlify/functions/` (répertoire vitest).
 */
import { describe, expect, it, vi } from "vitest";
import { executeTool, type AgentEnv, type MicrodataProvider } from "../../src/logic/agent";

const FAKE_ENV = {
  SEARCH_ENDPOINT: "https://search.example.net",
  SEARCH_QUERY_KEY: "key",
} as unknown as AgentEnv;

const FAKE_MICRODATA = {
  manifest: async () => ({ surveys: [] }),
} as unknown as MicrodataProvider;

describe("executeTool — respecte les index accessibles (f3i.11)", () => {
  it("list_surveys interroge chaque index fourni", async () => {
    const calledIndexes: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input: any) => {
      const url = String(input);
      const match = url.match(/\/indexes\/([^/]+)\/docs\/search/);
      if (match) calledIndexes.push(match[1]);
      return Promise.resolve(
        new Response(JSON.stringify({ value: [], "@odata.count": 0 }), { status: 200 }),
      ) as any;
    });

    await executeTool(
      "list_surveys",
      {},
      FAKE_ENV,
      FAKE_MICRODATA,
      { current: null },
      undefined,
      ["survey-questions", "survey-questions-opubliq"],
    );

    expect(calledIndexes).toContain("survey-questions");
    expect(calledIndexes).toContain("survey-questions-opubliq");
  });

  it("sans indexes explicite, retombe sur le public seul (rétrocompatible)", async () => {
    const calledIndexes: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input: any) => {
      const url = String(input);
      const match = url.match(/\/indexes\/([^/]+)\/docs\/search/);
      if (match) calledIndexes.push(match[1]);
      return Promise.resolve(
        new Response(JSON.stringify({ value: [], "@odata.count": 0 }), { status: 200 }),
      ) as any;
    });

    await executeTool("list_surveys", {}, FAKE_ENV, FAKE_MICRODATA, { current: null });

    // list_surveys émet 2 appels par index (liste + comptage) : ici 1 seul index.
    expect(new Set(calledIndexes)).toEqual(new Set(["survey-questions"]));
  });
});
