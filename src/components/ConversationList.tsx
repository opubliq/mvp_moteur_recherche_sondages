/**
 * Liste des conversations de l'agent (bead agy) : sélection, renommage, suppression.
 * Purement présentationnel — la persistance vit dans `logic/conversations.ts`.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { ConversationMeta } from "../logic/conversations";

/** Ancienneté lisible sans dépendance de formatage de dates. */
function relativeDate(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(ts).toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

interface Props {
  items: ConversationMeta[];
  activeId: string;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export default function ConversationList({ items, activeId, onOpen, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  if (items.length === 0) {
    return <p className="px-1 py-2 text-xs text-base-content/50">Aucune conversation enregistrée pour l'instant.</p>;
  }

  function commit(id: string) {
    if (draft.trim()) onRename(id, draft.trim());
    setEditingId(null);
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((c) => {
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            {editingId === c.id ? (
              <div className="flex items-center gap-1 px-1 py-1">
                <input
                  ref={inputRef}
                  className="input input-xs input-bordered flex-1"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(c.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => commit(c.id)} title="Enregistrer">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)} title="Annuler">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${
                  active ? "bg-primary/10 text-primary" : "hover:bg-base-content/5"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onOpen(c.id)}
                  title={c.title}
                >
                  <span className={`block truncate text-sm ${active ? "font-semibold" : ""}`}>{c.title}</span>
                  <span className="block text-[0.68rem] text-base-content/45">
                    {relativeDate(c.updatedAt)} · {c.turns} message{c.turns > 1 ? "s" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    setEditingId(c.id);
                    setDraft(c.title);
                  }}
                  title="Renommer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 hover:text-error"
                  onClick={() => onDelete(c.id)}
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
