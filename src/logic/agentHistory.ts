import type { ChatMessage } from "./agent";

export const MAX_HISTORY = 40;
export const MAX_TOOL_CONTENT_CHARS = 6000;

type ToolCall = NonNullable<ChatMessage["tool_calls"]>[number];

function validToolCall(c: unknown): c is ToolCall {
  const tc = c as ToolCall;
  return (
    !!tc &&
    typeof tc.id === "string" &&
    tc.type === "function" &&
    !!tc.function &&
    typeof tc.function.name === "string" &&
    typeof tc.function.arguments === "string"
  );
}

function truncate(s: string): string {
  return s.length > MAX_TOOL_CONTENT_CHARS ? `${s.slice(0, MAX_TOOL_CONTENT_CHARS)}… [tronqué]` : s;
}

/**
 * Historique renvoyé par le client → fil envoyé au modèle.
 *
 * Les appels d'outils et leurs résultats sont gardés pour le DERNIER tour
 * complété seulement (entre l'avant-dernier et le dernier message user) : c'est
 * ce qui permet « continue » après un arrêt et les questions de suivi sur un
 * calcul. Les tours plus anciens ne gardent que leur texte (coût en tokens).
 * Un appel d'outil sans son résultat (ou l'inverse) est retiré : l'API refuse
 * un fil incohérent.
 */
export function sanitizeHistory(raw: unknown, maxHistory = MAX_HISTORY): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const msgs: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as any).role;
    const content = (m as any).content;
    if (role === "user" && typeof content === "string") {
      msgs.push({ role, content });
    } else if (role === "assistant") {
      const calls = Array.isArray((m as any).tool_calls) ? (m as any).tool_calls.filter(validToolCall) : [];
      const text = typeof content === "string" ? content : null;
      if (calls.length > 0) msgs.push({ role, content: text, tool_calls: calls });
      else if (text) msgs.push({ role, content: text });
    } else if (role === "tool" && typeof (m as any).tool_call_id === "string" && typeof content === "string") {
      msgs.push({ role, content: truncate(content), tool_call_id: (m as any).tool_call_id });
    }
  }

  const userIdx = msgs.flatMap((m, i) => (m.role === "user" ? [i] : []));
  const last = userIdx[userIdx.length - 1] ?? -1;
  const prev = userIdx[userIdx.length - 2] ?? -1;

  const older: ChatMessage[] = [];
  for (let i = 0; i <= prev; i++) {
    const m = msgs[i];
    if (m.role === "user") older.push(m);
    else if (m.role === "assistant" && m.content) older.push({ role: "assistant", content: m.content });
  }

  // Dernier tour complété : outils gardés si chaque appel a son résultat.
  const block = prev >= 0 && last > prev ? msgs.slice(prev + 1, last) : [];
  const results = new Set(block.filter((m) => m.role === "tool").map((m) => m.tool_call_id));
  const keptCalls = new Set<string>();
  const kept: ChatMessage[] = [];
  for (const m of block) {
    if (m.role === "assistant" && m.tool_calls) {
      if (m.tool_calls.every((c) => results.has(c.id))) {
        m.tool_calls.forEach((c) => keptCalls.add(c.id));
        kept.push(m);
      } else if (m.content) {
        kept.push({ role: "assistant", content: m.content });
      }
    } else if (m.role === "tool") {
      if (keptCalls.has(m.tool_call_id!)) kept.push(m);
    } else {
      kept.push(m);
    }
  }

  const tail = last >= 0 ? [msgs[last]] : [];
  const head = older.slice(-Math.max(0, maxHistory - kept.length - tail.length));
  return [...head, ...kept, ...tail];
}
