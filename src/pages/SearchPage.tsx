import { useEffect, useMemo, useState } from "react";
import { useSearchState } from "../context/SearchContext";
import SearchBar from "../components/SearchBar";
import ConceptChips from "../components/ConceptChips";
import Facets from "../components/Facets";
import SurveyGroup, { type SurveyGroupData } from "../components/SurveyGroup";
import RelevanceTimeline from "../components/RelevanceTimeline";
import type { SearchResult, Pertinence } from "../types";

const PERT_LEVELS: Pertinence[] = ["Exact", "Partiel", "Faible"];
const PERT_BADGE: Record<string, string> = {
  Exact: "op-badge-exact",
  Partiel: "op-badge-partiel",
  Faible: "op-badge-faible",
};

/** Regroupe les résultats par sondage, en conservant l'ordre de pertinence. */
function groupBySurvey(results: SearchResult[]): SurveyGroupData[] {
  const groups = new Map<string, SurveyGroupData>();
  for (const r of results) {
    let g = groups.get(r.survey_id);
    if (!g) {
      g = {
        survey_id: r.survey_id,
        survey_name: r.survey_name,
        survey_year: r.survey_year,
        pollster: r.pollster,
        questions: [],
      };
      groups.set(r.survey_id, g);
    }
    g.questions.push(r);
  }
  return [...groups.values()];
}

export default function SearchPage() {
  const {
    query, filters, concepts, results, facets, globalFacets, loading, decomposing, error, hasSearched,
    handleSearch, handleFilterChange, handleConceptsChange,
  } = useSearchState();

  // Filtre de pertinence piloté par les badges du header (vide = tout afficher).
  const [activePertinences, setActivePertinences] = useState<Set<Pertinence>>(new Set());

  // Nouvelle recherche → on réinitialise le filtre.
  useEffect(() => setActivePertinences(new Set()), [results]);

  const togglePertinence = (p: Pertinence) =>
    setActivePertinences((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const visibleResults = useMemo(
    () =>
      activePertinences.size === 0
        ? results
        : results.filter((r) => r.pertinence && activePertinences.has(r.pertinence)),
    [results, activePertinences],
  );

  const themes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      for (const t of r.themes) set.add(t);
    }
    return [...set].sort();
  }, [results]);

  const groups = useMemo(() => groupBySurvey(visibleResults), [visibleResults]);

  const relevanceStats = useMemo(
    () =>
      results.reduce(
        (acc, r) => {
          if (r.pertinence) acc[r.pertinence] = (acc[r.pertinence] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [results],
  );

  return (
    <>
      <div className="mb-3">
        <SearchBar onSearch={handleSearch} loading={loading || decomposing} />
      </div>

      {concepts.length > 0 && (
        <div className="mb-5">
          <ConceptChips concepts={concepts} onChange={handleConceptsChange} />
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="py-20 text-center text-base-content/50">
          <p className="text-lg">Recherchez un concept pour explorer les questions de sondage.</p>
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && !error && (
        <div className="py-20 text-center text-base-content/50">
          <p className="text-lg">Aucun résultat pour « {query} ».</p>
          <p className="mt-1 text-sm">L'index est peut-être encore vide, ou essayez d'autres termes.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid-facets">
          <Facets
            facets={facets}
            globalFacets={globalFacets}
            themes={themes}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-base-content/60">
                {visibleResults.length} question{visibleResults.length > 1 ? "s" : ""} · {groups.length} sondage
                {groups.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                {PERT_LEVELS.map((p) => {
                  const count = relevanceStats[p] || 0;
                  if (count === 0) return null;
                  const active = activePertinences.size === 0 || activePertinences.has(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePertinence(p)}
                      className={`op-badge ${PERT_BADGE[p]} cursor-pointer transition ${
                        active ? "" : "opacity-35 grayscale"
                      }`}
                      title={active ? `Filtrer : masquer ${p}` : `Filtrer : afficher ${p}`}
                    >
                      {count} {p}
                    </button>
                  );
                })}
              </div>
            </div>
            {groups.map((g) => (
              <SurveyGroup key={g.survey_id} group={g} />
            ))}

            <RelevanceTimeline results={visibleResults} />
          </div>
        </div>
      )}
    </>
  );
}
