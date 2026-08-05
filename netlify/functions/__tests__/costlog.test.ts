/**
 * Test unitaire du wrapper de logging d'usage (bead 97r.1).
 *
 * Placé sous `netlify/functions/` car la config vitest ne découvre que
 * `netlify/functions/**\/*.test.ts`. Importe le module canonique
 * `src/logic/costlog` avec la convention extensionless du repo (identique à
 * l'import de `src/logic/agent` par les fonctions Netlify).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COSTLOG_PREFIX,
  logUsage,
  newRequestId,
  type UsageRecord,
} from "../../../src/logic/costlog";

/** Parse la dernière ligne émise sur console.log : { prefix, json }. */
function parseLine(spy: ReturnType<typeof vi.spyOn>): { prefix: string; json: any } {
  expect(spy).toHaveBeenCalledTimes(1);
  const line = spy.mock.calls[0][0] as string;
  const sep = line.indexOf(" ");
  const prefix = line.slice(0, sep);
  const json = JSON.parse(line.slice(sep + 1));
  return { prefix, json };
}

describe("costlog", () => {
  afterEach(() => vi.restoreAllMocks());

  it("émet une ligne préfixée + JSON valide contenant tous les champs", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const record: UsageRecord = {
      client_id: "acme",
      request_id: "req-123",
      op: "agent_turn",
      prompt_tokens: 100,
      completion_tokens: 42,
      latency_ms: 1234,
      meta: { model: "gpt-x", step: 2 },
    };
    logUsage(record);

    const { prefix, json } = parseLine(spy);
    expect(prefix).toBe(COSTLOG_PREFIX);
    expect(json.client_id).toBe("acme");
    expect(json.request_id).toBe("req-123");
    expect(json.op).toBe("agent_turn");
    expect(json.prompt_tokens).toBe(100);
    expect(json.completion_tokens).toBe(42);
    expect(json.latency_ms).toBe(1234);
    expect(json.meta).toEqual({ model: "gpt-x", step: 2 });
    expect(typeof json.ts).toBe("string");
  });

  it("supporte l'op rerank avec units et sans tokens", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logUsage({ client_id: "unknown", request_id: "r", op: "rerank", units: 3, latency_ms: 50 });
    const { json } = parseLine(spy);
    expect(json.op).toBe("rerank");
    expect(json.units).toBe(3);
    expect(json.prompt_tokens).toBeUndefined();
  });

  it("ne throw jamais, même avec un input dégénéré (valeurs non sérialisables / circulaires)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const circular: any = { self: null };
    circular.self = circular;
    const bigint: any = 10n;

    expect(() =>
      logUsage({
        client_id: undefined as any,
        request_id: undefined as any,
        op: "embed",
        latency_ms: NaN,
        meta: { circular, bigint },
      } as UsageRecord),
    ).not.toThrow();

    // Même quand console.log lui-même lève, logUsage absorbe.
    spy.mockImplementation(() => {
      throw new Error("console down");
    });
    expect(() =>
      logUsage({ client_id: "c", request_id: "r", op: "decompose", latency_ms: 1 }),
    ).not.toThrow();
  });

  it("newRequestId génère un identifiant non vide et unique", () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});
