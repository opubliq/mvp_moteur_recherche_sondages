import { useMemo } from "react";
import { useSearchState } from "../context/SearchContext";
import SearchBar from "../components/SearchBar";
import ConceptChips from "../components/ConceptChips";
import Facets, { type FacetOptions } from "../components/Facets";
import SurveyGroup, { type SurveyGroupData } from "../components/SurveyGroup";
import type { SearchResult } from "../types";

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

function buildFacetOptions(results: SearchResult[]): FacetOptions {
  const years = new Set<number>();
  const pollsters = new Set<string>();
  const languages = new Set<string>();
  const themes = new Set<string>();
  for (const r of results) {
    if (r.survey_year != null) years.add(r.survey_year);
    if (r.pollster) pollsters.add(r.pollster);
    if (r.language) languages.add(r.language);
    for (const t of r.themes) themes.add(t);
  }
  return {
    years: [...years].sort((a, b) => b - a),
    pollsters: [...pollsters].sort(),
    languages: [...languages].sort(),
    themes: [...themes].sort(),
  };
}

export default function SearchPage() {
  const {
    query, filters, concepts, results, loading, decomposing, error, hasSearched,
    handleSearch, handleFilterChange, handleConceptsChange,
  } = useSearchState();

  const facetOptions = useMemo(() => buildFacetOptions(results), [results]);
  const groups = useMemo(() => groupBySurvey(results), [results]);

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
      <p className="op-kicker mb-3">Recherche de questions</p>

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
            options={facetOptions}
            filters={filters}
            onFilterChange={handleFilterChange}
            themeFilter={filters.themes?.[0] || null}
            onThemeChange={(t) => handleFilterChange({ ...filters, themes: t ? [t] : undefined })}
          />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-base-content/60">
                {results.length} question{results.length > 1 ? "s" : ""} · {groups.length} sondage
                {groups.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                {relevanceStats["Exact"] > 0 && (
                  <span className="op-badge op-badge-exact">{relevanceStats["Exact"]} Exact</span>
                )}
                {relevanceStats["Partiel"] > 0 && (
                  <span className="op-badge op-badge-partiel">{relevanceStats["Partiel"]} Partiel</span>
                )}
                {relevanceStats["Faible"] > 0 && (
                  <span className="op-badge op-badge-faible">{relevanceStats["Faible"]} Faible</span>
                )}
              </div>
            </div>
            {groups.map((g) => (
              <SurveyGroup key={g.survey_id} group={g} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
