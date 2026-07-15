import { useMemo } from "react";
import { useSearchState } from "../context/SearchContext";
import SearchBar from "../components/SearchBar";
import ConceptChips from "../components/ConceptChips";
import Facets from "../components/Facets";
import SurveyGroup, { type SurveyGroupData } from "../components/SurveyGroup";
import RelevanceTimeline from "../components/RelevanceTimeline";
import type { SearchResult } from "../types";
import { scoreColorVars } from "../lib/scoreColor";

/**
 * Regroupe les résultats par sondage, en conservant l'ordre de pertinence.
 *
 * `results` arrive déjà trié par score Cohere décroissant (le serveur trie sur
 * `relevance_score`), donc les questions d'un groupe gardent cet ordre. Les
 * groupes eux-mêmes sont ordonnés par leur meilleure question — c'est-à-dire par
 * ordre de première apparition, puisque la liste est déjà triée.
 */
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

  // Le filtre par palier (badges Exact/Partiel/Faible) est SUPPRIMÉ : les
  // paliers n'existent plus (bead 9gf.12, gradient continu). Un filtre par seuil
  // de score serait une décision de design — laissée à la bead 9gf.15/.16.
  const visibleResults = results;

  const themes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      for (const t of r.themes) set.add(t);
    }
    return [...set].sort();
  }, [results]);

  const groups = useMemo(() => groupBySurvey(visibleResults), [visibleResults]);

  // Sans paliers, le résumé du header est l'étendue des scores (0-100).
  const scoreRange = useMemo(() => {
    const scores = results
      .map((r) => r.score_pertinence)
      .filter((s): s is number => s !== undefined);
    if (scores.length === 0) return null;
    return { max: Math.max(...scores), min: Math.min(...scores) };
  }, [results]);

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
              {scoreRange && (
                <p className="flex items-center gap-1.5 text-sm tabular-nums text-base-content/60">
                  Score de pertinence&nbsp;:
                  <span className="op-score-dot" style={scoreColorVars(scoreRange.max)} />
                  {scoreRange.max} → {scoreRange.min}
                  <span className="op-score-dot" style={scoreColorVars(scoreRange.min)} />
                </p>
              )}
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
