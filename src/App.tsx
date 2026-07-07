import { useMemo, useState } from "react";
import { search } from "./api";
import type { SearchFilters, SearchResult } from "./types";
import SearchBar from "./components/SearchBar";
import Facets, { type FacetOptions } from "./components/Facets";
import SurveyGroup, { type SurveyGroupData } from "./components/SurveyGroup";
import SurveyDetail from "./components/SurveyDetail";

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

/** Construit les options de facettes à partir des résultats courants. */
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

export default function App() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [themeFilter, setThemeFilter] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  async function runSearch(q: string, f: SearchFilters) {
    setLoading(true);
    setError(null);
    try {
      const res = await search(q, f);
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

  // Nouvelle requête : on repart de filtres vierges.
  function handleSearch(q: string) {
    setQuery(q);
    setFilters({});
    setThemeFilter(null);
    void runSearch(q, {});
  }

  // Changement de facette serveur (année / sondeur / langue) → re-requête.
  function handleFilterChange(next: SearchFilters) {
    setFilters(next);
    if (query) void runSearch(query, next);
  }

  const facetOptions = useMemo(() => buildFacetOptions(results), [results]);

  // Le filtre thème est appliqué côté client (champ collection non filtrable serveur).
  const displayed = useMemo(
    () =>
      themeFilter ? results.filter((r) => r.themes.includes(themeFilter)) : results,
    [results, themeFilter],
  );

  const groups = useMemo(() => groupBySurvey(displayed), [displayed]);

  // Nom déjà connu (depuis les résultats) pour l'en-tête de la vue détail.
  const selectedSurveyName = useMemo(
    () =>
      selectedSurveyId
        ? results.find((r) => r.survey_id === selectedSurveyId)?.survey_name
        : undefined,
    [results, selectedSurveyId],
  );

  return (
    <div className="min-h-screen bg-base-200">
      <header className="navbar bg-base-100 shadow-sm">
        <div className="mx-auto w-full max-w-6xl px-4">
          <span className="text-xl font-bold">Opubliq</span>
          <span className="ml-2 text-sm opacity-60">
            Catalogue de questions de sondage
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {selectedSurveyId ? (
          <SurveyDetail
            surveyId={selectedSurveyId}
            fallbackName={selectedSurveyName}
            onBack={() => setSelectedSurveyId(null)}
          />
        ) : (
          <>
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="py-20 text-center opacity-60">
            <p className="text-lg">
              Recherchez un concept pour explorer les questions de sondage.
            </p>
          </div>
        )}

        {hasSearched && !loading && results.length === 0 && !error && (
          <div className="py-20 text-center opacity-60">
            <p className="text-lg">Aucun résultat pour « {query} ».</p>
            <p className="mt-1 text-sm">
              L'index est peut-être encore vide, ou essayez d'autres termes.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
            <Facets
              options={facetOptions}
              filters={filters}
              onFilterChange={handleFilterChange}
              themeFilter={themeFilter}
              onThemeChange={setThemeFilter}
            />

            <div className="space-y-4">
              <p className="text-sm opacity-60">
                {displayed.length} question{displayed.length > 1 ? "s" : ""} ·{" "}
                {groups.length} sondage{groups.length > 1 ? "s" : ""}
              </p>
              {groups.map((g) => (
                <SurveyGroup
                  key={g.survey_id}
                  group={g}
                  onOpenSurvey={setSelectedSurveyId}
                />
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
