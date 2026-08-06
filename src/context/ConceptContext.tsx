import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Un concept analytique : plusieurs questions équivalentes (souvent formulées
 * différemment d'un sondage à l'autre) taguées ensemble pour être comparées.
 * `itemKeys` référence des `cartKey` du panier (src/context/CartContext.tsx) —
 * le concept ne stocke pas les questions elles-mêmes, seulement leurs clés.
 */
export interface ConceptGroup {
  id: string;
  label: string;
  itemKeys: string[];
}

interface ConceptContextValue {
  groups: ConceptGroup[];
  /** Clé d'item -> groupe qui la contient, s'il y en a un. */
  groupByItemKey: Map<string, ConceptGroup>;
  createGroup: (label: string, itemKeys: string[]) => void;
  renameGroup: (id: string, label: string) => void;
  addToGroup: (id: string, itemKey: string) => void;
  removeFromGroup: (id: string, itemKey: string) => void;
  deleteGroup: (id: string) => void;
  /** Retire une clé d'item de tous les groupes (ex: item retiré du panier). */
  pruneItemKey: (itemKey: string) => void;
}

const ConceptContext = createContext<ConceptContextValue | null>(null);
const STORAGE_KEY = "opubliq.concepts.v1";

function loadInitial(): ConceptGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ConceptGroup[];
  } catch {
    return [];
  }
}

function makeId(): string {
  return `concept-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ConceptProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<ConceptGroup[]>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [groups]);

  const value = useMemo<ConceptContextValue>(() => {
    const groupByItemKey = new Map<string, ConceptGroup>();
    for (const g of groups) for (const k of g.itemKeys) groupByItemKey.set(k, g);

    return {
      groups,
      groupByItemKey,
      createGroup: (label, itemKeys) =>
        setGroups((prev) => [...prev, { id: makeId(), label, itemKeys: [...itemKeys] }]),
      renameGroup: (id, label) => setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g))),
      addToGroup: (id, itemKey) =>
        setGroups((prev) =>
          prev.map((g) => (g.id === id && !g.itemKeys.includes(itemKey) ? { ...g, itemKeys: [...g.itemKeys, itemKey] } : g)),
        ),
      removeFromGroup: (id, itemKey) =>
        setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, itemKeys: g.itemKeys.filter((k) => k !== itemKey) } : g))),
      deleteGroup: (id) => setGroups((prev) => prev.filter((g) => g.id !== id)),
      pruneItemKey: (itemKey) =>
        setGroups((prev) => prev.map((g) => ({ ...g, itemKeys: g.itemKeys.filter((k) => k !== itemKey) }))),
    };
  }, [groups]);

  return <ConceptContext.Provider value={value}>{children}</ConceptContext.Provider>;
}

export function useConcepts(): ConceptContextValue {
  const ctx = useContext(ConceptContext);
  if (!ctx) throw new Error("useConcepts doit être utilisé dans <ConceptProvider>");
  return ctx;
}
