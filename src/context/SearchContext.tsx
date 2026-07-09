import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { search, decompose } from "../api";
import { scoreResult } from "../logic/scoring";
import type { Concept, SearchFilters, SearchResult } from "../types";

interface SearchContextValue {
  query: string;
  filters: SearchFilters;
  concepts: Concept[];
  results: SearchResult[];
  loading: boolean;
  decomposing: boolean;
  error: string | null;
  hasSearched: boolean;
  handleSearch: (q: string) => Promise<void>;
  handleFilterChange: (next: SearchFilters) => void;
  handleConceptsChange: (nextConcepts: Concept[]) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function runSearch(q: string, f: SearchFilters, c?: Concept[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await search(q, f, 30, c);
      setResults(res.results);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }

  // Nouvelle requête : on décompose puis on cherche.
  async function handleSearch(q: string) {
    setQuery(q);
    setFilters({});
    setDecomposing(true);
    setError(null);
    try {
      const nextConcepts = await decompose(q);
      setConcepts(nextConcepts);
      await runSearch(q, {}, nextConcepts);
    } catch (err) {
      console.error("Decomposition failed", err);
      await runSearch(q, {});
    } finally {
      setDecomposing(false);
    }
  }

  // Changement de facette serveur (année / sondeur / langue) → re-requête.
  function handleFilterChange(next: SearchFilters) {
    setFilters(next);
    if (query) void runSearch(query, next, concepts);
  }

  // Changement local des concepts (poids) → recalcul de pertinence côté client.
  function handleConceptsChange(nextConcepts: Concept[]) {
    setConcepts(nextConcepts);
    const nextResults = results
      .map((r) => {
        const { score, pertinence, matched } = scoreResult(nextConcepts, r);
        return { ...r, score_couverture: score, pertinence, matched_concepts: matched };
      })
      .sort((a, b) => (b.score_couverture || 0) - (a.score_couverture || 0));
    setResults(nextResults);
  }

  const value = useMemo<SearchContextValue>(
    () => ({
      query, filters, concepts, results, loading, decomposing, error, hasSearched,
      handleSearch, handleFilterChange, handleConceptsChange,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filters, concepts, results, loading, decomposing, error, hasSearched],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchState(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchState doit être utilisé dans <SearchProvider>");
  return ctx;
}
