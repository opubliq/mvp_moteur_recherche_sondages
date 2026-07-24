/**
 * Persistance des conversations de l'agent (bead agy).
 * `localStorage` est stubé : le module ne lit `window.localStorage` qu'à l'appel,
 * donc un faux Storage sur `globalThis.window` suffit — pas besoin de jsdom.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteConversation,
  deriveTitle,
  listConversations,
  loadConversation,
  renameConversation,
  saveConversation,
} from "./conversations.js";
import type { AgentMessage } from "../api";

/** Storage minimal, avec plafond d'octets optionnel pour tester l'éviction. */
function fakeStorage(limitBytes = Infinity): Storage {
  const map = new Map<string, string>();
  const used = () => [...map.entries()].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const prev = map.get(k);
      map.set(k, v);
      if (used() > limitBytes) {
        if (prev === undefined) map.delete(k);
        else map.set(k, prev);
        throw new Error("QuotaExceededError");
      }
    },
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage;
}

function install(limitBytes?: number) {
  (globalThis as { window?: unknown }).window = { localStorage: fakeStorage(limitBytes) };
}

const turn = (role: "user" | "assistant", content: string): AgentMessage => ({ role, content });

describe("conversations", () => {
  beforeEach(() => install());

  it("dérive le titre de la première question de l'utilisateur", () => {
    expect(deriveTitle([turn("user", "Qui appuie la réforme ?\nsuite ignorée")])).toBe("Qui appuie la réforme ?");
    expect(deriveTitle([turn("assistant", "bonjour")])).toBe("Nouvelle conversation");
    expect(deriveTitle([turn("user", "a".repeat(200))])).toHaveLength(64);
  });

  it("relit un fil sauvegardé à l'identique (messages + traces)", async () => {
    const messages = [turn("user", "Immigration chez les 18-34 ?"), turn("assistant", "## Constat\n42 %")];
    const traceByIndex = { 1: [{ tool: "crosstab", args: { survey_id: "s1" }, ok: true }] };
    await saveConversation("c1", { messages, traceByIndex });

    const conv = await loadConversation("c1");
    expect(conv?.messages).toEqual(messages);
    expect(conv?.traceByIndex).toEqual(traceByIndex);
    expect(conv?.title).toBe("Immigration chez les 18-34 ?");
    expect(conv?.turns).toBe(2);
  });

  it("liste les conversations de la plus récente à la plus ancienne", async () => {
    await saveConversation("vieille", { messages: [turn("user", "A")], traceByIndex: {} });
    await new Promise((r) => setTimeout(r, 2));
    await saveConversation("recente", { messages: [turn("user", "B")], traceByIndex: {} });

    expect((await listConversations()).map((m) => m.id)).toEqual(["recente", "vieille"]);
  });

  it("conserve un titre renommé malgré les sauvegardes suivantes", async () => {
    await saveConversation("c1", { messages: [turn("user", "Question initiale")], traceByIndex: {} });
    await renameConversation("c1", "Analyse BC 2010");
    await saveConversation("c1", {
      messages: [turn("user", "Question initiale"), turn("assistant", "Réponse")],
      traceByIndex: {},
    });

    expect((await loadConversation("c1"))?.title).toBe("Analyse BC 2010");
  });

  it("supprime le corps ET l'entrée d'index", async () => {
    await saveConversation("c1", { messages: [turn("user", "A")], traceByIndex: {} });
    await deleteConversation("c1");

    expect(await loadConversation("c1")).toBeNull();
    expect(await listConversations()).toEqual([]);
  });

  it("sacrifie les plus anciennes conversations quand le quota est atteint", async () => {
    install(1200); // assez pour ~une conversation volumineuse à la fois
    const big = (tag: string) => ({ messages: [turn("user", tag), turn("assistant", "x".repeat(400))], traceByIndex: {} });

    await saveConversation("c1", big("un"));
    await new Promise((r) => setTimeout(r, 2));
    await saveConversation("c2", big("deux"));

    const ids = (await listConversations()).map((m) => m.id);
    expect(ids).toContain("c2"); // celle en cours survit
    expect(await loadConversation("c2")).not.toBeNull();
    expect(ids).not.toContain("c1"); // la plus ancienne a été évincée
  });

  it("ne casse pas quand le stockage est indisponible (navigation privée)", async () => {
    (globalThis as { window?: unknown }).window = {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
    };
    await expect(saveConversation("c1", { messages: [turn("user", "A")], traceByIndex: {} })).resolves.toMatchObject({
      id: "c1",
    });
    expect(await listConversations()).toEqual([]);
  });
});
