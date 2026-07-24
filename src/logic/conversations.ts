/**
 * Persistance des conversations de l'agent (bead agy).
 *
 * COUCHE D'ACCÈS ISOLÉE, à dessein : le UI ne connaît que les 6 fonctions
 * exportées ici, jamais `localStorage`. Le stockage local suffit au prototype
 * (mono-poste, pas d'identité client) ; le jour où les conversations vivent
 * côté serveur (cf. propagation de `client_id`, bead 97r.5), on réécrit CE
 * fichier en async — le UI, lui, appelle déjà tout en `await`.
 *
 * Schéma de stockage :
 *  - `INDEX_KEY`         → `ConversationMeta[]`, trié par `updatedAt` décroissant ;
 *  - `BODY_PREFIX + id`  → `ConversationBody` (fil complet + traces).
 * L'index est séparé des corps pour que lister N conversations ne coûte pas la
 * désérialisation de N fils entiers (une trace de crosstab est volumineuse).
 */

import type { AgentMessage, AgentToolTrace } from "../api";

const INDEX_KEY = "opubliq.agent.v1.index";
const BODY_PREFIX = "opubliq.agent.v1.conv.";
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

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // navigation privée / stockage bloqué : on dégrade en éphémère
  }
}

function readIndex(): ConversationMeta[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ConversationMeta[]).filter((m) => m && typeof m.id === "string");
  } catch {
    return []; // index corrompu : on repart à vide plutôt que de casser la page
  }
}

function writeIndex(metas: ConversationMeta[]): void {
  const s = storage();
  if (!s) return;
  s.setItem(INDEX_KEY, JSON.stringify(metas));
}

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
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  const s = storage();
  const meta = readIndex().find((m) => m.id === id);
  if (!s || !meta) return null;
  try {
    const raw = s.getItem(BODY_PREFIX + id);
    if (!raw) return null;
    const body = JSON.parse(raw) as ConversationBody;
    return { ...meta, messages: body.messages ?? [], traceByIndex: body.traceByIndex ?? {} };
  } catch {
    return null;
  }
}

/**
 * Écrit (ou met à jour) une conversation. Le titre n'est dérivé du fil qu'à la
 * PREMIÈRE écriture : ensuite on reconduit celui de l'index, ce qui fait tenir
 * un renommage manuel sans avoir à distinguer les deux cas.
 */
export async function saveConversation(
  id: string,
  body: ConversationBody,
  opts: { title?: string } = {},
): Promise<ConversationMeta> {
  const s = storage();
  const metas = readIndex();
  const existing = metas.find((m) => m.id === id);
  const now = Date.now();
  const meta: ConversationMeta = {
    id,
    title: opts.title ?? existing?.title ?? deriveTitle(body.messages),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    turns: body.messages.filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0,
    ).length,
  };
  const next = [meta, ...metas.filter((m) => m.id !== id)];
  if (!s) return meta;

  // Quota dépassé : on sacrifie les conversations les plus anciennes plutôt que
  // de perdre celle en cours (les traces d'outils pèsent lourd).
  let candidates = next;
  for (;;) {
    try {
      s.setItem(BODY_PREFIX + id, JSON.stringify(body));
      writeIndex(candidates);
      return meta;
    } catch {
      const victim = [...candidates].sort((a, b) => a.updatedAt - b.updatedAt).find((m) => m.id !== id);
      if (!victim) {
        writeIndex(candidates); // plus rien à libérer : au moins garder l'index cohérent
        return meta;
      }
      s.removeItem(BODY_PREFIX + victim.id);
      candidates = candidates.filter((m) => m.id !== victim.id);
    }
  }
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const clean = title.trim().slice(0, TITLE_MAX) || "Sans titre";
  writeIndex(readIndex().map((m) => (m.id === id ? { ...m, title: clean } : m)));
}

export async function deleteConversation(id: string): Promise<void> {
  const s = storage();
  s?.removeItem(BODY_PREFIX + id);
  writeIndex(readIndex().filter((m) => m.id !== id));
}
