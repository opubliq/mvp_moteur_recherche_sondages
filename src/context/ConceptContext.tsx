import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Catégorie de sortie commune à un concept (ex: "Favorable", "Ne sait pas"). */
export interface OutputCategory {
  id: string;
  label: string;
}

/**
 * Un concept analytique : plusieurs questions équivalentes (souvent formulées
 * différemment d'un sondage à l'autre) taguées ensemble pour être comparées.
 * `itemKeys` référence des `cartKey` du panier (src/context/CartContext.tsx) —
 * le concept ne stocke pas les questions elles-mêmes, seulement leurs clés.
 *
 * `mapping[itemKey][responseCode]` donne l'id de `OutputCategory` sur laquelle
 * cette catégorie de réponse native de CETTE question replie — chaque question
 * du concept a ses propres catégories natives (binaire, Likert...), d'où un
 * mapping par item plutôt qu'un mapping global.
 */
export interface ConceptGroup {
  id: string;
  label: string;
  itemKeys: string[];
  categories: OutputCategory[];
  mapping: Record<string, Record<string, string>>;
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
  addCategory: (groupId: string, label: string) => void;
  renameCategory: (groupId: string, categoryId: string, label: string) => void;
  removeCategory: (groupId: string, categoryId: string) => void;
  /** categoryId à null pour dé-mapper cette catégorie de réponse. */
  setMapping: (groupId: string, itemKey: string, responseCode: string, categoryId: string | null) => void;
}

const ConceptContext = createContext<ConceptContextValue | null>(null);
const STORAGE_KEY = "opubliq.concepts.v1";

/** Normalise un groupe chargé d'une version antérieure sans categories/mapping. */
function normalizeGroup(g: Partial<ConceptGroup> & { id: string; label: string; itemKeys: string[] }): ConceptGroup {
  return { categories: [], mapping: {}, ...g };
}

function loadInitial(): ConceptGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ConceptGroup[];
    return arr.map(normalizeGroup);
  } catch {
    return [];
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

  function updateGroup(id: string, fn: (g: ConceptGroup) => ConceptGroup) {
    setGroups((prev) => prev.map((g) => (g.id === id ? fn(g) : g)));
  }

  const value = useMemo<ConceptContextValue>(() => {
    const groupByItemKey = new Map<string, ConceptGroup>();
    for (const g of groups) for (const k of g.itemKeys) groupByItemKey.set(k, g);

    return {
      groups,
      groupByItemKey,
      createGroup: (label, itemKeys) =>
        setGroups((prev) => [...prev, { id: makeId("concept"), label, itemKeys: [...itemKeys], categories: [], mapping: {} }]),
      renameGroup: (id, label) => updateGroup(id, (g) => ({ ...g, label })),
      addToGroup: (id, itemKey) =>
        updateGroup(id, (g) => (g.itemKeys.includes(itemKey) ? g : { ...g, itemKeys: [...g.itemKeys, itemKey] })),
      removeFromGroup: (id, itemKey) =>
        updateGroup(id, (g) => {
          const { [itemKey]: _dropped, ...restMapping } = g.mapping;
          return { ...g, itemKeys: g.itemKeys.filter((k) => k !== itemKey), mapping: restMapping };
        }),
      deleteGroup: (id) => setGroups((prev) => prev.filter((g) => g.id !== id)),
      pruneItemKey: (itemKey) =>
        setGroups((prev) =>
          prev.map((g) => {
            const { [itemKey]: _dropped, ...restMapping } = g.mapping;
            return { ...g, itemKeys: g.itemKeys.filter((k) => k !== itemKey), mapping: restMapping };
          }),
        ),
      addCategory: (groupId, label) =>
        updateGroup(groupId, (g) => ({ ...g, categories: [...g.categories, { id: makeId("cat"), label }] })),
      renameCategory: (groupId, categoryId, label) =>
        updateGroup(groupId, (g) => ({
          ...g,
          categories: g.categories.map((c) => (c.id === categoryId ? { ...c, label } : c)),
        })),
      removeCategory: (groupId, categoryId) =>
        updateGroup(groupId, (g) => ({
          ...g,
          categories: g.categories.filter((c) => c.id !== categoryId),
          mapping: Object.fromEntries(
            Object.entries(g.mapping).map(([itemKey, codes]) => [
              itemKey,
              Object.fromEntries(Object.entries(codes).filter(([, catId]) => catId !== categoryId)),
            ]),
          ),
        })),
      setMapping: (groupId, itemKey, responseCode, categoryId) =>
        updateGroup(groupId, (g) => {
          const codes = { ...(g.mapping[itemKey] ?? {}) };
          if (categoryId) codes[responseCode] = categoryId;
          else delete codes[responseCode];
          return { ...g, mapping: { ...g.mapping, [itemKey]: codes } };
        }),
    };
  }, [groups]);

  return <ConceptContext.Provider value={value}>{children}</ConceptContext.Provider>;
}

export function useConcepts(): ConceptContextValue {
  const ctx = useContext(ConceptContext);
  if (!ctx) throw new Error("useConcepts doit être utilisé dans <ConceptProvider>");
  return ctx;
}
