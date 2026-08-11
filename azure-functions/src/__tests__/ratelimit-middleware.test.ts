import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimitCounter, RateLimitCounterStore } from "../../../src/logic/ratelimit";

const rows = new Map<string, RateLimitCounter>();
let version = 0;
let storeFactoryCalls = 0;

// Le middleware instancie le store Table lui-même : on substitue un compteur en
// mémoire pour tester la décision HTTP sans Azurite.
vi.mock("../logic/ratelimit-store", () => ({
  createTableCounterStore: (): RateLimitCounterStore => {
    storeFactoryCalls++;
    const id = (subject: string, key: string) => `${subject}|${key}`;
    return {
      async read(subject, key) {
        const row = rows.get(id(subject, key));
        return row ? { ...row } : undefined;
      },
      async create(subject, key, windowStart, count) {
        if (rows.has(id(subject, key))) return false;
        rows.set(id(subject, key), { count, windowStart, etag: `e${++version}` });
        return true;
      },
      async update(subject, key, windowStart, count, etag) {
        const row = rows.get(id(subject, key));
        if (!row || row.etag !== etag) return false;
        rows.set(id(subject, key), { count, windowStart, etag: `e${++version}` });
        return true;
      },
    };
  },
}));

const { checkRateLimit } = await import("../middleware/ratelimit");

const context = { warn: vi.fn(), error: vi.fn(), log: vi.fn() } as unknown as Parameters<typeof checkRateLimit>[1];
const auth = { userId: "user-1" };

beforeEach(() => {
  rows.clear();
  storeFactoryCalls = 0;
  process.env.AZURE_STORAGE_ACCOUNT = "fake";
  process.env.AZURE_STORAGE_KEY = "fake";
  process.env.RATE_LIMIT_AGENT_PER_MINUTE = "2";
  delete process.env.RATE_LIMIT_DISABLED;
});

afterEach(() => {
  delete process.env.RATE_LIMIT_AGENT_PER_MINUTE;
  delete process.env.AZURE_STORAGE_ACCOUNT;
  delete process.env.AZURE_STORAGE_KEY;
});

describe("checkRateLimit", () => {
  it("laisse passer sous la limite", async () => {
    expect(await checkRateLimit(auth, context)).toBeUndefined();
    expect(await checkRateLimit(auth, context)).toBeUndefined();
  });

  it("renvoie un 429 exploitable par le client une fois la limite franchie", async () => {
    await checkRateLimit(auth, context);
    await checkRateLimit(auth, context);
    const response = await checkRateLimit(auth, context, { headers: { "Access-Control-Allow-Origin": "*" } });

    expect(response?.status).toBe(429);
    const body = response?.jsonBody as { error: string; retry_after_ms: number; window: string; limit: number };
    expect(body.retry_after_ms).toBeGreaterThan(0);
    expect(body.window).toBe("minute");
    expect(body.limit).toBe(2);
    // `src/api.ts` lit `retry_after_ms` pour son compte à rebours ; le CORS doit
    // survivre au 429 sinon le front voit une erreur réseau opaque (cf. 3c4620a).
    expect(response?.headers).toMatchObject({ "Access-Control-Allow-Origin": "*", "Retry-After": expect.any(String) });
  });

  it("compte séparément deux clients", async () => {
    await checkRateLimit(auth, context);
    await checkRateLimit(auth, context);
    expect(await checkRateLimit({ userId: "user-2" }, context)).toBeUndefined();
  });

  it("impute au tenant, partagé par tous ses comptes", async () => {
    await checkRateLimit({ userId: "a", tenant: "opubliq" }, context);
    await checkRateLimit({ userId: "b", tenant: "opubliq" }, context);
    expect(await checkRateLimit({ userId: "c", tenant: "opubliq" }, context)).toBeDefined();
  });

  it("ne touche pas au stockage quand RATE_LIMIT_DISABLED=true", async () => {
    process.env.RATE_LIMIT_DISABLED = "true";
    expect(await checkRateLimit(auth, context)).toBeUndefined();
    expect(storeFactoryCalls).toBe(0);
  });

  it("laisse passer si le compte de stockage n'est pas configuré", async () => {
    delete process.env.AZURE_STORAGE_ACCOUNT;
    expect(await checkRateLimit(auth, context)).toBeUndefined();
  });
});
