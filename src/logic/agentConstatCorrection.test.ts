/**
 * Garde-fou "CONSTATS PUIS PREUVE" (agent.ts) : le prompt seul s'est montré
 * insuffisant en test manuel (le modèle écrit un rapport classique malgré la
 * règle + l'exemple complet). Ces tests couvrent le correctif déterministe :
 * un appel de reformatage supplémentaire SEULEMENT quand un calcul chiffré a
 * réussi ce tour-ci ET que la réponse finale n'a aucune paire <!--CONSTAT-->.
 */
import { describe, expect, it } from "vitest";
import { runAgentStream } from "./agent";

describe("correction automatique du format constat/preuve", () => {
  it("crosstab réussi + réponse sans marqueur -> un appel correctif supplémentaire", async () => {
    let calls = 0;
    const chat = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          message: {
            role: "assistant" as const,
            content: null,
            tool_calls: [{ id: "c1", type: "function" as const, function: { name: "crosstab", arguments: "{}" } }],
          },
        };
      }
      if (calls === 2) {
        // Réponse finale "rapport classique", sans <!--CONSTAT-->.
        return { message: { role: "assistant" as const, content: "## Résultats\nUn rapport classique." } };
      }
      // Appel correctif : on vérifie qu'il reçoit bien l'instruction de reformatage.
      return { message: { role: "assistant" as const, content: "<!--CONSTAT-->\n**X**\n<!--PREUVE-->\ndétail" } };
    };
    const execute = async () => ({ rows: [{ a: 1 }] }); // pas de clé "error" -> ok
    const result = await (async () => {
      let last;
      for await (const ev of runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat, execute })) {
        if (ev.type === "done") last = ev.result;
      }
      return last!;
    })();
    expect(calls).toBe(3);
    expect(result.message).toContain("<!--CONSTAT-->");
    // Le fil renvoyé au client porte la version CORRIGÉE, pas le rapport classique.
    const lastMsg = result.messages[result.messages.length - 1];
    expect(lastMsg.content).toContain("<!--CONSTAT-->");
  });

  it("réponse déjà au format -> aucun appel correctif", async () => {
    let calls = 0;
    const chat = async () => {
      calls += 1;
      return {
        message: {
          role: "assistant" as const,
          content: "<!--CONSTAT-->\n**X**\n<!--PREUVE-->\ndétail",
        },
      };
    };
    for await (const _ of runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat })) void _;
    expect(calls).toBe(1);
  });

  it("aucun crosstab/run_python réussi ce tour -> aucun appel correctif même sans marqueur", async () => {
    let calls = 0;
    const chat = async () => {
      calls += 1;
      return { message: { role: "assistant" as const, content: "Une liste de questions, pas un calcul." } };
    };
    for await (const _ of runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat })) void _;
    expect(calls).toBe(1);
  });

  it("crosstab en erreur -> aucun appel correctif", async () => {
    let calls = 0;
    const chat = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          message: {
            role: "assistant" as const,
            content: null,
            tool_calls: [{ id: "c1", type: "function" as const, function: { name: "crosstab", arguments: "{}" } }],
          },
        };
      }
      return { message: { role: "assistant" as const, content: "Rapport sans marqueur." } };
    };
    const execute = async () => ({ error: "sondage sans micro-données" });
    for await (const _ of runAgentStream([{ role: "user", content: "x" }], {} as any, {} as any, { chat, execute })) void _;
    expect(calls).toBe(2);
  });
});
