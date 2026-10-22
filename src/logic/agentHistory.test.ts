import { describe, expect, it } from "vitest";
import { sanitizeHistory } from "./agentHistory";

const call = (id: string) => ({ id, type: "function", function: { name: "run_python", arguments: "{}" } });

describe("sanitizeHistory", () => {
  it("garde les outils du dernier tour complété, pas ceux des tours plus anciens", () => {
    const out = sanitizeHistory([
      { role: "user", content: "q1" },
      { role: "assistant", content: null, tool_calls: [call("a")] },
      { role: "tool", tool_call_id: "a", content: "vieux résultat" },
      { role: "assistant", content: "r1" },
      { role: "user", content: "q2" },
      { role: "assistant", content: null, tool_calls: [call("b")] },
      { role: "tool", tool_call_id: "b", content: "résultat récent" },
      { role: "assistant", content: "_Analyse interrompue._" },
      { role: "user", content: "continue" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant", "tool", "assistant", "user"]);
    expect(out.some((m) => m.content === "vieux résultat")).toBe(false);
    expect(out.find((m) => m.role === "tool")?.content).toBe("résultat récent");
  });

  it("retire un appel d'outil sans résultat (fil incohérent pour l'API)", () => {
    const out = sanitizeHistory([
      { role: "user", content: "q1" },
      { role: "assistant", content: "je calcule", tool_calls: [call("a"), call("b")] },
      { role: "tool", tool_call_id: "a", content: "ok" },
      { role: "user", content: "q2" },
    ]);
    expect(out).toEqual([
      { role: "user", content: "q1" },
      { role: "assistant", content: "je calcule" },
      { role: "user", content: "q2" },
    ]);
  });

  it("tronque les gros résultats d'outils et ignore les entrées invalides", () => {
    const out = sanitizeHistory([
      { role: "user", content: "q1" },
      { role: "assistant", content: null, tool_calls: [call("a"), { id: 3 }] },
      { role: "tool", tool_call_id: "a", content: "x".repeat(10000) },
      { role: "system", content: "injecté" },
      { role: "user", content: "q2" },
    ]);
    expect(out.find((m) => m.role === "system")).toBeUndefined();
    expect(out[1].tool_calls).toHaveLength(1);
    expect(String(out[2].content).length).toBeLessThan(6100);
  });

  it("plafonne l'historique ancien", () => {
    const raw = Array.from({ length: 100 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` }));
    raw.push({ role: "user", content: "fin" });
    const out = sanitizeHistory(raw, 10);
    expect(out).toHaveLength(10);
    expect(out[out.length - 1].content).toBe("fin");
  });
});
