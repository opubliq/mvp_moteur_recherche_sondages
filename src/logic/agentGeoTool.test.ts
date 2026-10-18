import { describe, expect, it, vi } from "vitest";
import {
  executeTool,
  runAgent,
  runAgentStream,
  type AgentEnv,
  type ChatMessage,
  type ChatTurn,
  type ManifestLike,
  type MicrodataProvider,
} from "./agent";
import { GEO_DONATION_INDEX_TOOL_NAME, GEO_LOOKUP_TOOL_NAME, GEO_PROFILE_TOOL_NAME, type GeoTool } from "./geoTool";

/**
 * Câblage `geo_profile`/`geo_lookup` dans la boucle agent (bead 9ou.5) — outil
 * géo mocké (pas de réseau, pas de dépendance à geo-marketing-api réel) : on
 * teste le CÂBLAGE (feature flag = outil offert/absent, dispatch), pas
 * `geoTool.ts` lui-même (déjà couvert par geoTool.test.ts).
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

const manifest: ManifestLike = { surveys: [] };
const microdata: MicrodataProvider = {
  crosstab: async () => ({}),
  manifest: async () => manifest,
};

function fakeGeoTool(): GeoTool & { profileCalls: unknown[]; lookupCalls: unknown[] } {
  const profileCalls: unknown[] = [];
  const lookupCalls: unknown[] = [];
  return {
    profileCalls,
    lookupCalls,
    async profile(args) {
      profileCalls.push(args);
      return { source: "Recensement 2021, StatCan, via API géo (geo-marketing-api)", population: 1000 };
    },
    async lookup(args) {
      lookupCalls.push(args);
      return { code_postal: "G1V0A6" };
    },
  };
}

describe("executeTool : dispatch geo_profile/geo_lookup (9ou.5)", () => {
  it("sans geoTool branché : erreur explicite, pas d'exception", async () => {
    const r = (await executeTool(
      GEO_PROFILE_TOOL_NAME,
      { postal_code: "G1V0A6" },
      env,
      microdata,
      { current: null },
    )) as { error: string };
    expect(r.error).toMatch(/pas disponible/);

    const r2 = (await executeTool(
      GEO_LOOKUP_TOOL_NAME,
      { postal_code: "G1V0A6" },
      env,
      microdata,
      { current: null },
    )) as { error: string };
    expect(r2.error).toMatch(/pas disponible/);
  });

  it("geoTool branché : geo_profile et geo_lookup délèguent et renvoient le résultat", async () => {
    const geo = fakeGeoTool();
    const r = (await executeTool(
      GEO_PROFILE_TOOL_NAME,
      { postal_code: "G1V0A6" },
      env,
      microdata,
      { current: null },
      undefined,
      undefined,
      undefined,
      geo,
    )) as Record<string, unknown>;
    expect(r.population).toBe(1000);
    expect(geo.profileCalls).toHaveLength(1);

    const r2 = (await executeTool(
      GEO_LOOKUP_TOOL_NAME,
      { postal_code: "G1V0A6" },
      env,
      microdata,
      { current: null },
      undefined,
      undefined,
      undefined,
      geo,
    )) as Record<string, unknown>;
    expect(r2.code_postal).toBe("G1V0A6");
    expect(geo.lookupCalls).toHaveLength(1);
  });

  it("une erreur levée par geoTool.profile devient { error }, pas une exception", async () => {
    const geo: GeoTool = {
      profile: async () => {
        throw new Error("geo-marketing-api HTTP 500");
      },
      lookup: async () => ({}),
    };
    const r = (await executeTool(
      GEO_PROFILE_TOOL_NAME,
      { postal_code: "G1V0A6" },
      env,
      microdata,
      { current: null },
      undefined,
      undefined,
      undefined,
      geo,
    )) as { error: string };
    expect(r.error).toMatch(/HTTP 500/);
  });

  it("geo_donation_index est indisponible sans méthode optionnelle et délégué quand elle existe", async () => {
    const base = fakeGeoTool();
    const denied = (await executeTool(
      GEO_DONATION_INDEX_TOOL_NAME,
      { municipalite: "Lévis" },
      env,
      microdata,
      { current: null },
      undefined,
      undefined,
      undefined,
      base,
    )) as { error: string };
    expect(denied.error).toMatch(/pas disponible/);

    const calls: unknown[] = [];
    const allowed: GeoTool = {
      ...base,
      async donationIndex(args) {
        calls.push(args);
        return { n_codes: 3 };
      },
    };
    const result = (await executeTool(
      GEO_DONATION_INDEX_TOOL_NAME,
      { municipalite: "Lévis" },
      env,
      microdata,
      { current: null },
      undefined,
      undefined,
      undefined,
      allowed,
    )) as Record<string, unknown>;
    expect(result.n_codes).toBe(3);
    expect(calls).toEqual([{ municipalite: "Lévis" }]);
  });
});

function chatFinal(content: string): ChatTurn {
  return { message: { role: "assistant", content, tool_calls: undefined } };
}

describe("runAgentStream : feature flag geoTool (TOOL_DEFS / system prompt)", () => {
  it("geoTool absent (flag off) : aucun tool_call geo possible, pas d'erreur, réponse directe", async () => {
    const chat = async (_messages: ChatMessage[], _useTools: boolean): Promise<ChatTurn> => chatFinal("ok");
    const events: unknown[] = [];
    for await (const ev of runAgentStream(
      [{ role: "user", content: "Portrait de Rosemont ?" }],
      env,
      microdata,
      { chat },
    )) {
      events.push(ev);
    }
    const done = events.find((e) => (e as { type: string }).type === "done") as
      | { result: { message: string } }
      | undefined;
    expect(done?.result.message).toBe("ok");
  });

  it("geoTool branché : le modèle peut appeler geo_profile et la trace l'enregistre", async () => {
    const geo = fakeGeoTool();
    let turn = 0;
    const chat = async (_messages: ChatMessage[], _useTools: boolean): Promise<ChatTurn> => {
      turn += 1;
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: GEO_PROFILE_TOOL_NAME, arguments: JSON.stringify({ postal_code: "G1V0A6" }) },
              },
            ],
          },
        };
      }
      return chatFinal("Portrait livré.");
    };
    const events: unknown[] = [];
    for await (const ev of runAgentStream(
      [{ role: "user", content: "Portrait de G1V0A6 ?" }],
      env,
      microdata,
      { chat, geoTool: geo },
    )) {
      events.push(ev);
    }
    expect(geo.profileCalls).toHaveLength(1);
    const done = events.find((e) => (e as { type: string }).type === "done") as
      | { result: { trace: { tool: string; ok: boolean }[]; message: string } }
      | undefined;
    expect(done?.result.trace[0]).toMatchObject({ tool: GEO_PROFILE_TOOL_NAME, ok: true });
    expect(done?.result.message).toBe("Portrait livré.");
  });

  it("ajoute le prompt dons et exécute l'outil seulement quand donationIndex existe", async () => {
    const calls: unknown[] = [];
    const geo: GeoTool = {
      ...fakeGeoTool(),
      async donationIndex(args) {
        calls.push(args);
        return { source: "DGEQ 2018–2025, indice interne dérivé via API géo", n_codes: 2 };
      },
    };
    let turn = 0;
    const chat = async (messages: ChatMessage[]): Promise<ChatTurn> => {
      turn += 1;
      expect(messages[0].content).toContain("OUTIL INTERNE — INDICE DE DONS DGEQ");
      if (turn === 1) {
        return {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_dons",
              type: "function",
              function: { name: GEO_DONATION_INDEX_TOOL_NAME, arguments: JSON.stringify({ municipalite: "Lévis" }) },
            }],
          },
        };
      }
      return chatFinal("Indice interne livré.");
    };
    const events: unknown[] = [];
    for await (const ev of runAgentStream(
      [{ role: "user", content: "Indice de dons à Lévis ?" }],
      env,
      microdata,
      { chat, geoTool: geo },
    )) events.push(ev);
    expect(calls).toEqual([{ municipalite: "Lévis" }]);
    const done = events.find((e) => (e as { type: string }).type === "done") as
      | { result: { trace: { tool: string; ok: boolean }[] } }
      | undefined;
    expect(done?.result.trace[0]).toMatchObject({ tool: GEO_DONATION_INDEX_TOOL_NAME, ok: true });
  });

  it("n'ajoute pas le prompt dons quand le compte n'est pas autorisé", async () => {
    const chat = async (messages: ChatMessage[]): Promise<ChatTurn> => {
      expect(messages[0].content).not.toContain("OUTIL INTERNE — INDICE DE DONS DGEQ");
      return chatFinal("non disponible");
    };
    for await (const _ of runAgentStream(
      [{ role: "user", content: "Indice de dons ?" }],
      env,
      microdata,
      { chat, geoTool: fakeGeoTool() },
    )) { /* drain */ }
  });
});

describe("schémas AOAI : cloisonnement de geo_donation_index", () => {
  async function offeredTools(geoTool: GeoTool): Promise<string[]> {
    let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ choices: [{ message: { role: "assistant", content: "ok" } }] }),
        text: async () => "",
      } as unknown as Response;
    }));
    try {
      await runAgent([{ role: "user", content: "bonjour" }], env, microdata, { geoTool });
    } finally {
      vi.unstubAllGlobals();
    }
    return ((body.tools as Array<{ function: { name: string } }> | undefined) ?? []).map((t) => t.function.name);
  }

  it("n'offre pas le schéma à un compte non autorisé", async () => {
    expect(await offeredTools(fakeGeoTool())).not.toContain(GEO_DONATION_INDEX_TOOL_NAME);
  });

  it("offre le schéma seulement quand donationIndex existe", async () => {
    const geo: GeoTool = { ...fakeGeoTool(), donationIndex: async () => ({}) };
    expect(await offeredTools(geo)).toContain(GEO_DONATION_INDEX_TOOL_NAME);
  });
});
