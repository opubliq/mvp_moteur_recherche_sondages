/**
 * Persistance des conversations de l'agent (bead agy, bascule serveur f3i.19.6).
 *
 * COUCHE D'ACCÈS ISOLÉE, à dessein : le UI ne connaît que les 6 fonctions
 * exportées ici, jamais l'API `/conversations` directement. Le stockage vit
 * côté serveur (Table + Blob, cf. `azure-functions/src/functions/conversations.ts`
 * et `.../logic/conversations-store.ts`), scopé à l'utilisateur authentifié
 * via `authHeader()` — un fil est donc invisible d'un autre compte.
 *
 * Chaque fonction I/O est un simple appel réseau ; `AgentPage.tsx` les
 * consommait déjà en `await`, le passage du localStorage au backend est donc
 * transparent côté appelant.
 */

import { apiUrl, authHeader, type AgentMessage, type AgentToolTrace } from "../api";

const TITLE_MAX = 64;

/** Entrée de la liste des conversations — assez pour l'afficher, sans le fil. */
export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** Nombre de tours affichables — indicatif dans la liste. */
  turns: number;
}

/** Contenu réinjectable d'une conversation : exactement ce que `/agent` attend. */
export interface ConversationBody {
  messages: AgentMessage[];
  /** Traces d'outils, indexées par position dans `messages` (cf. AgentPage). */
  traceByIndex: Record<number, AgentToolTrace[]>;
}

export type Conversation = ConversationMeta & ConversationBody;

export function newConversationId(): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Math.random()}`;
  return rnd.slice(0, 8) + Date.now().toString(36);
}

/** Titre auto dérivé du premier message utilisateur (première ligne, tronquée). */
export function deriveTitle(messages: AgentMessage[]): string {
  const first = messages.find((m) => m.role === "user" && typeof m.content === "string" && m.content.trim());
  const text = (first?.content as string | undefined)?.trim().split("\n")[0] ?? "";
  if (!text) return "Nouvelle conversation";
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}

export async function listConversations(): Promise<ConversationMeta[]> {
  const res = await fetch(apiUrl("/conversations"), { headers: authHeader() });
  if (!res.ok) return []; // pas connecté / session expirée : liste vide plutôt que casser la page
  return (await res.json()) as ConversationMeta[];
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const res = await fetch(apiUrl(`/conversations/${encodeURIComponent(id)}`), { headers: authHeader() });
  if (!res.ok) return null;
  return (await res.json()) as Conversation;
}

/**
 * Écrit (ou met à jour) une conversation. Le titre n'est dérivé du fil qu'à la
 * PREMIÈRE écriture — géré côté serveur, qui reconduit celui déjà en base sinon,
 * ce qui fait tenir un renommage manuel sans avoir à distinguer les deux cas ici.
 */
export async function saveConversation(
  id: string,
  body: ConversationBody,
  opts: { title?: string } = {},
): Promise<ConversationMeta> {
  const res = await fetch(apiUrl(`/conversations/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ messages: body.messages, traceByIndex: body.traceByIndex, title: opts.title }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sauvegarde de la conversation échouée (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as ConversationMeta;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const clean = title.trim().slice(0, TITLE_MAX) || "Sans titre";
  const res = await fetch(apiUrl(`/conversations/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ title: clean }),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Renommage de la conversation échoué (${res.status}): ${text || res.statusText}`);
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/conversations/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Suppression de la conversation échouée (${res.status}): ${text || res.statusText}`);
  }
}
