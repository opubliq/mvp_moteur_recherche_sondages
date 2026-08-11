import { describe, expect, it } from "vitest";
import {
  consumeQuota,
  counterKey,
  DAY_MS,
  DEFAULT_AGENT_PER_DAY,
  DEFAULT_AGENT_PER_MINUTE,
  MINUTE_MS,
  resolveAgentPolicy,
  resolveRateLimitSubject,
  windowStart,
  type RateLimitCounter,
  type RateLimitCounterStore,
} from "./ratelimit";

/** Store en mémoire reproduisant la sémantique etag du store Table. */
function memoryStore(): RateLimitCounterStore & { rows: Map<string, RateLimitCounter> } {
  const rows = new Map<string, RateLimitCounter>();
  const id = (subject: string, key: string) => `${subject}|${key}`;
  let version = 0;
  return {
    rows,
    async read(subject, key) {
      const row = rows.get(id(subject, key));
      return row ? { ...row } : undefined;
    },
    async create(subject, key, start, count) {
      if (rows.has(id(subject, key))) return false;
      rows.set(id(subject, key), { count, windowStart: start, etag: `e${++version}` });
      return true;
    },
    async update(subject, key, start, count, etag) {
      const row = rows.get(id(subject, key));
      if (!row || row.etag !== etag) return false;
      rows.set(id(subject, key), { count, windowStart: start, etag: `e${++version}` });
      return true;
    },
  };
}

const policy = [{ name: "minute", windowMs: MINUTE_MS, limit: 3 }];

describe("windowStart / counterKey", () => {
  it("aligne sur le début de la fenêtre fixe", () => {
    expect(windowStart(90_000, MINUTE_MS)).toBe(60_000);
    expect(windowStart(60_000, MINUTE_MS)).toBe(60_000);
  });

  it("sépare les compteurs par bucket et par fenêtre", () => {
    expect(counterKey("agent", "minute")).toBe("agent-minute");
    expect(counterKey("agent", "minute")).not.toBe(counterKey("scan", "minute"));
  });
});

describe("resolveAgentPolicy", () => {
  it("applique les seuils par défaut", () => {
    expect(resolveAgentPolicy({})).toEqual([
      { name: "minute", windowMs: MINUTE_MS, limit: DEFAULT_AGENT_PER_MINUTE },
      { name: "day", windowMs: DAY_MS, limit: DEFAULT_AGENT_PER_DAY },
    ]);
  });

  it("lit les surcharges d'App Settings", () => {
    const resolved = resolveAgentPolicy({ RATE_LIMIT_AGENT_PER_MINUTE: "5", RATE_LIMIT_AGENT_PER_DAY: "50" });
    expect(resolved.map((w) => w.limit)).toEqual([5, 50]);
  });

  it("ignore une valeur nulle ou illisible plutôt que de bloquer tout le monde", () => {
    const resolved = resolveAgentPolicy({ RATE_LIMIT_AGENT_PER_MINUTE: "0", RATE_LIMIT_AGENT_PER_DAY: "abc" });
    expect(resolved.map((w) => w.limit)).toEqual([DEFAULT_AGENT_PER_MINUTE, DEFAULT_AGENT_PER_DAY]);
  });

  it("désactive complètement le quota sur RATE_LIMIT_DISABLED", () => {
    expect(resolveAgentPolicy({ RATE_LIMIT_DISABLED: "true" })).toEqual([]);
  });
});

describe("resolveRateLimitSubject", () => {
  it("impute au tenant quand il y en a un (seau partagé par client)", () => {
    expect(resolveRateLimitSubject({ userId: "uuid-1", tenant: "opubliq" })).toBe("opubliq");
  });

  it("retombe sur l'utilisateur pour un compte sans tenant", () => {
    expect(resolveRateLimitSubject({ userId: "basic:Andrew" })).toBe("basic-andrew");
  });

  it("ne renvoie jamais de clé vide", () => {
    expect(resolveRateLimitSubject({})).toBe("unknown");
    expect(resolveRateLimitSubject({ userId: "!!!" })).toBe("unknown");
  });
});

describe("consumeQuota", () => {
  it("laisse passer jusqu'à la limite puis refuse", async () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) {
      expect((await consumeQuota("acme", policy, store, { now: 1_000 })).allowed).toBe(true);
    }
    const denied = await consumeQuota("acme", policy, store, { now: 1_000 });
    expect(denied.allowed).toBe(false);
    expect(denied.window?.name).toBe("minute");
  });

  it("renvoie le temps restant avant la fin de la fenêtre", async () => {
    const store = memoryStore();
    const now = 90_000; // fenêtre [60_000, 120_000)
    for (let i = 0; i < 3; i++) await consumeQuota("acme", policy, store, { now });
    const denied = await consumeQuota("acme", policy, store, { now });
    expect(denied.retryAfterMs).toBe(30_000);
  });

  it("repart à zéro à la fenêtre suivante", async () => {
    const store = memoryStore();
    for (let i = 0; i < 4; i++) await consumeQuota("acme", policy, store, { now: 1_000 });
    expect((await consumeQuota("acme", policy, store, { now: 1_000 })).allowed).toBe(false);
    expect((await consumeQuota("acme", policy, store, { now: 61_000 })).allowed).toBe(true);
  });

  it("cloisonne les clients entre eux", async () => {
    const store = memoryStore();
    for (let i = 0; i < 4; i++) await consumeQuota("acme", policy, store, { now: 1_000 });
    expect((await consumeQuota("acme", policy, store, { now: 1_000 })).allowed).toBe(false);
    expect((await consumeQuota("autre", policy, store, { now: 1_000 })).allowed).toBe(true);
  });

  it("cloisonne les buckets d'endpoints entre eux", async () => {
    const store = memoryStore();
    for (let i = 0; i < 4; i++) await consumeQuota("acme", policy, store, { now: 1_000, bucket: "agent" });
    expect((await consumeQuota("acme", policy, store, { now: 1_000, bucket: "agent" })).allowed).toBe(false);
    expect((await consumeQuota("acme", policy, store, { now: 1_000, bucket: "scan" })).allowed).toBe(true);
  });

  it("refuse dès que la fenêtre la plus courte déborde, même si la journalière tient", async () => {
    const store = memoryStore();
    const twoWindows = [
      { name: "minute", windowMs: MINUTE_MS, limit: 2 },
      { name: "day", windowMs: DAY_MS, limit: 100 },
    ];
    for (let i = 0; i < 2; i++) await consumeQuota("acme", twoWindows, store, { now: 1_000 });
    const denied = await consumeQuota("acme", twoWindows, store, { now: 1_000 });
    expect(denied.allowed).toBe(false);
    expect(denied.window?.name).toBe("minute");
  });

  it("rejoue l'incrément quand une écriture concurrente prend la main", async () => {
    const store = memoryStore();
    let conflicts = 2;
    const flaky: RateLimitCounterStore = {
      ...store,
      async create(subject, key, start, count) {
        if (conflicts-- > 0) {
          // Simule une requête concurrente ayant créé la ligne juste avant nous.
          await store.create(subject, key, start, count);
          return false;
        }
        return store.create(subject, key, start, count);
      },
    };
    const decision = await consumeQuota("acme", policy, flaky, { now: 1_000 });
    expect(decision.allowed).toBe(true);
    expect(decision.degraded).toBe(false);
    expect(store.rows.get("acme|agent-minute")?.count).toBe(2);
  });

  it("laisse passer en fail-open si le stockage est en panne", async () => {
    const broken: RateLimitCounterStore = {
      async read() {
        throw new Error("Table Storage indisponible");
      },
      async create() {
        return false;
      },
      async update() {
        return false;
      },
    };
    const decision = await consumeQuota("acme", policy, broken, { now: 1_000 });
    expect(decision.allowed).toBe(true);
    expect(decision.degraded).toBe(true);
  });

  it("laisse passer en fail-open si les conflits ne se résolvent jamais", async () => {
    const contended: RateLimitCounterStore = {
      async read() {
        return { count: 1, windowStart: 0, etag: "périmé" };
      },
      async create() {
        return false;
      },
      async update() {
        return false;
      },
    };
    const decision = await consumeQuota("acme", policy, contended, { now: 1_000 });
    expect(decision.allowed).toBe(true);
    expect(decision.degraded).toBe(true);
  });

  it("ne consomme rien quand la politique est vide", async () => {
    const store = memoryStore();
    expect((await consumeQuota("acme", [], store, { now: 1_000 })).allowed).toBe(true);
    expect(store.rows.size).toBe(0);
  });
});
