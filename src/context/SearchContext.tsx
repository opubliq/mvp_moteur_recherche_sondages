import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { search, decompose, fetchAllSurveys } from "../api";
import type { Concept, SearchFilters, SearchResult, SearchFacets, FacetEntry } from "../types";

/**
 * Phase courante de la recherche, telle qu'on peut HONNÊTEMENT l'observer depuis
 * le client. Il n'y en a que deux : `/decompose` et `/search` sont deux fetchs
 * distincts, mais la récupération Azure et le rerank Cohere vivent tous les deux
 * à l'intérieur de `/search` — impossible de les séparer sans streamer la
 * fonction. On ne prétend donc pas les distinguer.
 */
export type SearchPhase = "idle" | "decompose" | "retrieve";

interface SearchContextValue {
  query: string;
  filters: SearchFilters;
  concepts: Concept[];
  results: SearchResult[];
  facets: SearchFacets | null;
  globalFacets: SearchFacets | null;
  loading: boolean;
  decomposing: boolean;
  phase: SearchPhase;
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
  // Reformulation produite par /decompose pour le reranker (voir src/logic/decompose.ts).
  // Conservée pour être renvoyée telle quelle lors des re-requêtes d'affinage.
  const [rerankQuery, setRerankQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [phase, setPhase] = useState<SearchPhase>("idle");
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

  async function runSearch(q: string, f: SearchFilters, c?: Concept[], rq?: string) {
    setLoading(true);
    setPhase("retrieve");
    setError(null);
    try {
      const res = await search(q, f, 30, c, false, rq);
      setResults(res.results);
      if (res.facets) setFacets(res.facets);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }

  // Nouvelle requête : on décompose puis on cherche.
  async function handleSearch(q: string) {
    setQuery(q);
    setFilters({});
    // Purge de l'état de la recherche précédente. Sans ça, les résultats et les
    // concepts de l'ancienne requête restent affichés pendant ~2,6 s (décompo +
    // rerank Cohere), ce qui donne une page figée qui saute d'un coup — et pire,
    // laisse lire des résultats qui ne correspondent plus à ce qui est tapé.
    // On ne purge QUE dans handleSearch : un changement de facette ou de poids
    // (runSearch direct) affine la recherche courante, garder l'affichage
    // pendant la re-requête y est le bon comportement.
    setResults([]);
    setConcepts([]);
    setRerankQuery("");
    setFacets(null);
    setDecomposing(true);
    setPhase("decompose");
    setError(null);
    try {
      const { concepts: nextConcepts, rerankQuery: nextRerankQuery } = await decompose(q);
      setConcepts(nextConcepts);
      setRerankQuery(nextRerankQuery);
      await runSearch(q, {}, nextConcepts, nextRerankQuery);
    } catch (err) {
      // Décomposition échouée → recherche sans concepts NI reformulation : le
      // serveur retombera sur la requête brute pour le rerank.
      console.error("Decomposition failed", err);
      await runSearch(q, {});
    } finally {
      setDecomposing(false);
    }
  }

  // Changement de facette serveur (année / sondeur / langue) → re-requête.
  // On repasse la reformulation : affiner des facettes ne change pas ce que
  // l'utilisateur cherche, le rerank doit rester identique.
  function handleFilterChange(next: SearchFilters) {
    setFilters(next);
    if (query) void runSearch(query, next, concepts, rerankQuery);
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
    if (query) void runSearch(query, filters, nextConcepts, rerankQuery);
  }

  const value = useMemo<SearchContextValue>(
    () => ({
      query, filters, concepts, results, facets, globalFacets, loading, decomposing, phase, error, hasSearched,
      handleSearch, handleFilterChange, handleConceptsChange,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filters, concepts, results, facets, globalFacets, loading, decomposing, phase, error, hasSearched],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchState(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchState doit être utilisé dans <SearchProvider>");
  return ctx;
}
