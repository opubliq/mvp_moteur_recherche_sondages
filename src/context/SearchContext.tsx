import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { search, decompose, fetchAllSurveys } from "../api";
import type { Concept, SearchFilters, SearchResult, SearchFacets, FacetEntry } from "../types";

interface SearchContextValue {
  query: string;
  filters: SearchFilters;
  concepts: Concept[];
  results: SearchResult[];
  facets: SearchFacets | null;
  globalFacets: SearchFacets | null;
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
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [globalFacets, setGlobalFacets] = useState<SearchFacets | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Chargement des facettes globales au démarrage (via la liste des sondages)
  useEffect(() => {
    async function loadGlobal() {
      try {
        const { surveys } = await fetchAllSurveys();
        const yearsSet = new Set<number>();
        const pollstersMap = new Map<string, number>();
        const langsMap = new Map<string, number>();

        for (const s of surveys) {
          if (s.survey_year) yearsSet.add(s.survey_year);
          if (s.pollster) {
            pollstersMap.set(s.pollster, (pollstersMap.get(s.pollster) || 0) + 1);
          }
          if (s.language) {
            langsMap.set(s.language, (langsMap.get(s.language) || 0) + 1);
          }
        }

        const years: FacetEntry[] = [...yearsSet]
          .sort((a, b) => b - a)
          .map((y) => ({ value: String(y), count: 0 })); // count non pertinent ici
        
        const pollsters: FacetEntry[] = [...pollstersMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([value, count]) => ({ value, count }));

        const languages: FacetEntry[] = [...langsMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([value, count]) => ({ value, count }));

        setGlobalFacets({ years, pollsters, languages });
      } catch (err) {
        console.error("Failed to load global facets", err);
      }
    }
    void loadGlobal();
  }, []);

  async function runSearch(q: string, f: SearchFilters, c?: Concept[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await search(q, f, 30, c);
      setResults(res.results);
      if (res.facets) setFacets(res.facets);
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

  // Changement des concepts (poids) → re-requête serveur.
  //
  // Avant la bead 9gf.12, ce handler recalculait la pertinence CÔTÉ CLIENT
  // (`scoreResult`) puis re-triait localement. C'est structurellement impossible
  // avec Cohere : le score de pertinence est produit par le reranker côté
  // serveur, à partir du pool de candidats Azure — il n'est pas recalculable
  // depuis les seuls résultats déjà affichés. Les concepts ne servent d'ailleurs
  // plus au scoring du tout : ils pilotent la requête Lucene de récupération
  // (`buildLuceneQuery`), donc en changer les poids change le POOL, pas juste
  // son ordre. La seule réponse honnête est de relancer la recherche.
  function handleConceptsChange(nextConcepts: Concept[]) {
    setConcepts(nextConcepts);
    if (query) void runSearch(query, filters, nextConcepts);
  }

  const value = useMemo<SearchContextValue>(
    () => ({
      query, filters, concepts, results, facets, globalFacets, loading, decomposing, error, hasSearched,
      handleSearch, handleFilterChange, handleConceptsChange,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filters, concepts, results, facets, globalFacets, loading, decomposing, error, hasSearched],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchState(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchState doit être utilisé dans <SearchProvider>");
  return ctx;
}
