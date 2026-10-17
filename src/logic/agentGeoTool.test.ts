import { describe, expect, it } from "vitest";
import {
  executeTool,
  runAgentStream,
  type AgentEnv,
  type ChatMessage,
  type ChatTurn,
  type ManifestLike,
  type MicrodataProvider,
} from "./agent";
import { GEO_LOOKUP_TOOL_NAME, GEO_PROFILE_TOOL_NAME, type GeoTool } from "./geoTool";

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
});
