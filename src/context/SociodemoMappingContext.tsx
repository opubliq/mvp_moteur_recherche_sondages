import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Catégorie de sortie harmonisée pour un type de socio-démo (ex: "18-34 ans"). */
export interface SociodemoCategory {
  id: string;
  label: string;
}

/**
 * Mapping des catégories natives d'UN type de socio-démo (âge, genre...) vers
 * des catégories de sortie communes. Contrairement au mapping de concept
 * (`ConceptContext`), c'est global à l'app plutôt que par concept : un même
 * type socio-démo (ex: âge) se croise de la même façon quel que soit le
 * concept analysé. `mapping[surveyId][nativeCode]` donne l'id de catégorie,
 * chaque sondage ayant ses propres tranches natives pour un même type.
 */
export interface DemoTypeMapping {
  categories: SociodemoCategory[];
  mapping: Record<string, Record<string, string>>;
}

export type SociodemoMappings = Record<string, DemoTypeMapping>;

const EMPTY_MAPPING: DemoTypeMapping = { categories: [], mapping: {} };

interface SociodemoMappingContextValue {
  mappings: SociodemoMappings;
  getMapping: (demoKey: string) => DemoTypeMapping;
  addCategory: (demoKey: string, label: string) => void;
  renameCategory: (demoKey: string, categoryId: string, label: string) => void;
  removeCategory: (demoKey: string, categoryId: string) => void;
  /** categoryId à null pour dé-mapper cette catégorie native. */
  setMapping: (demoKey: string, surveyId: string, nativeCode: string, categoryId: string | null) => void;
}

const SociodemoMappingContext = createContext<SociodemoMappingContextValue | null>(null);
const STORAGE_KEY = "opubliq.sociodemoMapping.v1";

function loadInitial(): SociodemoMappings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SociodemoMappings;
  } catch {
    return {};
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SociodemoMappingProvider({ children }: { children: ReactNode }) {
  const [mappings, setMappings] = useState<SociodemoMappings>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [mappings]);

  function updateDemoType(demoKey: string, fn: (dt: DemoTypeMapping) => DemoTypeMapping) {
    setMappings((prev) => ({ ...prev, [demoKey]: fn(prev[demoKey] ?? EMPTY_MAPPING) }));
  }

  const value = useMemo<SociodemoMappingContextValue>(
    () => ({
      mappings,
      getMapping: (demoKey) => mappings[demoKey] ?? EMPTY_MAPPING,
      addCategory: (demoKey, label) =>
        updateDemoType(demoKey, (dt) => ({ ...dt, categories: [...dt.categories, { id: makeId("demoCat"), label }] })),
      renameCategory: (demoKey, categoryId, label) =>
        updateDemoType(demoKey, (dt) => ({
          ...dt,
          categories: dt.categories.map((c) => (c.id === categoryId ? { ...c, label } : c)),
        })),
      removeCategory: (demoKey, categoryId) =>
        updateDemoType(demoKey, (dt) => ({
          ...dt,
          categories: dt.categories.filter((c) => c.id !== categoryId),
          mapping: Object.fromEntries(
            Object.entries(dt.mapping).map(([surveyId, codes]) => [
              surveyId,
              Object.fromEntries(Object.entries(codes).filter(([, catId]) => catId !== categoryId)),
            ]),
          ),
        })),
      setMapping: (demoKey, surveyId, nativeCode, categoryId) =>
        updateDemoType(demoKey, (dt) => {
          const codes = { ...(dt.mapping[surveyId] ?? {}) };
          if (categoryId) codes[nativeCode] = categoryId;
          else delete codes[nativeCode];
          return { ...dt, mapping: { ...dt.mapping, [surveyId]: codes } };
        }),
    }),
    [mappings],
  );

  return <SociodemoMappingContext.Provider value={value}>{children}</SociodemoMappingContext.Provider>;
}

export function useSociodemoMapping(): SociodemoMappingContextValue {
  const ctx = useContext(SociodemoMappingContext);
  if (!ctx) throw new Error("useSociodemoMapping doit être utilisé dans <SociodemoMappingProvider>");
  return ctx;
}
