/**
 * Persistance des conversations de l'agent (bead agy, bascule serveur f3i.19.6).
 * `fetch` est stubé par un faux backend en mémoire, qui reproduit le contrat
 * de `azure-functions/src/functions/conversations.ts` (routes, codes HTTP,
 * dérivation de titre) sans dépendre du réseau ni d'Azurite.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteConversation, deriveTitle, listConversations, loadConversation, renameConversation, saveConversation } from "./conversations.js";
import type { AgentMessage } from "../api";

const TITLE_MAX = 64;

function deriveTitleServer(messages: AgentMessage[]): string {
  const first = messages.find((m) => m.role === "user" && typeof m.content === "string" && (m.content as string).trim());
  const text = (first?.content as string | undefined)?.trim().split("\n")[0] ?? "";
  if (!text) return "Nouvelle conversation";
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}

/** Faux backend en mémoire : mêmes routes/codes que `/conversations[/{id}]`. */
function installFakeBackend() {
  interface Entry {
    title: string;
    createdAt: number;
    updatedAt: number;
    messages: AgentMessage[];
    traceByIndex: Record<number, unknown[]>;
  }
  const store = new Map<string, Entry>();

  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = new URL(String(url), "http://local");
    const method = init?.method ?? "GET";
    const idMatch = u.pathname.match(/^\/conversations\/(.+)$/);

    if (u.pathname === "/conversations" && method === "GET") {
      const metas = [...store.entries()]
        .map(([id, e]) => ({ id, title: e.title, createdAt: e.createdAt, updatedAt: e.updatedAt, turns: e.messages.length }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return new Response(JSON.stringify(metas), { status: 200 });
    }

    if (idMatch) {
      const id = decodeURIComponent(idMatch[1]);
      if (method === "GET") {
        const e = store.get(id);
        if (!e) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
        return new Response(JSON.stringify({ id, title: e.title, createdAt: e.createdAt, updatedAt: e.updatedAt, turns: e.messages.length, messages: e.messages, traceByIndex: e.traceByIndex }), { status: 200 });
      }
      if (method === "PUT") {
        const payload = JSON.parse(String(init?.body)) as { messages: AgentMessage[]; traceByIndex: Record<number, unknown[]>; title?: string };
        const existing = store.get(id);
        const now = Date.now();
        const entry: Entry = {
          title: payload.title ?? existing?.title ?? deriveTitleServer(payload.messages),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          messages: payload.messages,
          traceByIndex: payload.traceByIndex ?? {},
        };
        store.set(id, entry);
        return new Response(
          JSON.stringify({ id, title: entry.title, createdAt: entry.createdAt, updatedAt: entry.updatedAt, turns: entry.messages.length }),
          { status: 200 },
        );
      }
      if (method === "PATCH") {
        const payload = JSON.parse(String(init?.body)) as { title: string };
        const e = store.get(id);
        if (!e) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
        e.title = payload.title;
        return new Response(null, { status: 204 });
      }
      if (method === "DELETE") {
        store.delete(id);
        return new Response(null, { status: 204 });
      }
    }

    throw new Error(`route non stubée: ${method} ${u.pathname}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return store;
}

const turn = (role: "user" | "assistant", content: string): AgentMessage => ({ role, content });

describe("conversations", () => {
  beforeEach(() => {
    installFakeBackend();
  });

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

  it("supprime la conversation", async () => {
    await saveConversation("c1", { messages: [turn("user", "A")], traceByIndex: {} });
    await deleteConversation("c1");

    expect(await loadConversation("c1")).toBeNull();
    expect(await listConversations()).toEqual([]);
  });

  it("renvoie une liste vide si le backend est inaccessible (session expirée)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })),
    );
    expect(await listConversations()).toEqual([]);
  });
});
