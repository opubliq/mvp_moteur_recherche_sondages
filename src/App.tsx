import { useMemo, useState } from "react";
import { search, decompose } from "./api";
import type { SearchFilters, SearchResult, Concept } from "./types";
import SearchBar from "./components/SearchBar";
import Facets, { type FacetOptions } from "./components/Facets";
import SurveyGroup, { type SurveyGroupData } from "./components/SurveyGroup";
import SurveyDetail from "./components/SurveyDetail";
import ConceptConsole from "./components/ConceptConsole";
import ExplorationView from "./components/ExplorationView";
import { scoreResult } from "./logic/scoring";

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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "explore">("search");

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

  // Nouvelle requête : on décompose puis on cherche
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
      // On tente quand même la recherche sans concepts si la décomposition échoue
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

  // Changement local des concepts (poids)
  function handleConceptsChange(nextConcepts: Concept[]) {
    setConcepts(nextConcepts);
    // Recalcul local de la pertinence pour chaque résultat
    const nextResults = results
      .map((r) => {
        const { score, pertinence, matched } = scoreResult(nextConcepts, r);
        return { ...r, score_couverture: score, pertinence, matched_concepts: matched };
      })
      .sort((a, b) => (b.score_couverture || 0) - (a.score_couverture || 0));
    setResults(nextResults);
  }

  const facetOptions = useMemo(() => buildFacetOptions(results), [results]);

  const groups = useMemo(() => groupBySurvey(results), [results]);

  // Statistiques de pertinence globales (tous sondages confondus).
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

  // Nom déjà connu (depuis les résultats) pour l'en-tête de la vue détail.
  const selectedSurveyName = useMemo(
    () =>
      selectedSurveyId
        ? results.find((r) => r.survey_id === selectedSurveyId)?.survey_name
        : undefined,
    [results, selectedSurveyId],
  );

  return (
    <div className="op-page min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <header className="op-hero mb-6">
          <p className="op-kicker">Opubliq · Moteur de recherche</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Catalogue de questions de sondage
          </h1>
          <p className="max-w-2xl text-sm text-base-content/60">
            Recherchez un concept dans le corpus de sondages et explorez les
            questions par niveau de pertinence.
          </p>
        </header>

        <main>
        {selectedSurveyId ? (
          <SurveyDetail
            surveyId={selectedSurveyId}
            fallbackName={selectedSurveyName}
            onBack={() => setSelectedSurveyId(null)}
          />
        ) : (
          <>
            <div className="op-switch mb-6" role="tablist" aria-label="Vues">
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "search" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("search")}
              >
                Recherche
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "explore" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTab("explore")}
              >
                Exploration du Corpus
              </button>
            </div>

            {activeTab === "explore" ? (
              <ExplorationView onOpenSurvey={setSelectedSurveyId} />
            ) : (
              <>
                <div className="mb-6">
                  <SearchBar onSearch={handleSearch} loading={loading || decomposing} />
                </div>

                {concepts.length > 0 && (
                  <div className="mb-6">
                    <ConceptConsole concepts={concepts} onChange={handleConceptsChange} />
                  </div>
                )}

                {error && (
                  <div className="alert alert-error mb-6">
                    <span>{error}</span>
                  </div>
                )}

                {!hasSearched && !loading && (
                  <div className="py-20 text-center text-base-content/50">
                    <p className="text-lg">
                      Recherchez un concept pour explorer les questions de sondage.
                    </p>
                  </div>
                )}

                {hasSearched && !loading && results.length === 0 && !error && (
                  <div className="py-20 text-center text-base-content/50">
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
                      themeFilter={filters.themes?.[0] || null}
                      onThemeChange={(t) => handleFilterChange({ ...filters, themes: t ? [t] : undefined })}
                    />

                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm text-base-content/60">
                          {results.length} question{results.length > 1 ? "s" : ""} ·{" "}
                          {groups.length} sondage{groups.length > 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          {relevanceStats["Exact"] > 0 && (
                            <span className="op-badge op-badge-exact" title="Matches Exacts">
                              {relevanceStats["Exact"]} Exact
                            </span>
                          )}
                          {relevanceStats["Partiel"] > 0 && (
                            <span className="op-badge op-badge-partiel" title="Matches Partiels">
                              {relevanceStats["Partiel"]} Partiel
                            </span>
                          )}
                          {relevanceStats["Faible"] > 0 && (
                            <span className="op-badge op-badge-faible" title="Matches Faibles">
                              {relevanceStats["Faible"]} Faible
                            </span>
                          )}
                        </div>
                      </div>
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
          </>
        )}
        </main>
      </div>
    </div>
  );
}
