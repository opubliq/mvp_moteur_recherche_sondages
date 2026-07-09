import { useEffect, useMemo, useState } from "react";
import { fetchQuestionsByTag, fetchThemeFacets } from "../api";
import type { ConceptCount, SearchResult } from "../types";
import SurveyGroup, { type SurveyGroupData } from "./SurveyGroup";

interface ThemeExplorerProps {
  onOpenSurvey: (surveyId: string) => void;
}

type Dim = "theme" | "concept";

// Les concepts sont très nombreux (~300) : on n'affiche que les plus fréquents.
const CONCEPT_CHIP_LIMIT = 60;

/** Regroupe des questions par sondage, sondages triés par année décroissante. */
function groupBySurvey(results: SearchResult[]): SurveyGroupData[] {
  const byId = new Map<string, SurveyGroupData>();
  for (const q of results) {
    let g = byId.get(q.survey_id);
    if (!g) {
      g = {
        survey_id: q.survey_id,
        survey_name: q.survey_name,
        survey_year: q.survey_year,
        pollster: q.pollster,
        questions: [],
      };
      byId.set(q.survey_id, g);
    }
    g.questions.push(q);
  }
  return [...byId.values()].sort((a, b) => (b.survey_year ?? 0) - (a.survey_year ?? 0));
}

export default function ThemeExplorer({ onOpenSurvey }: ThemeExplorerProps) {
  const [facets, setFacets] = useState<{ themes: ConceptCount[]; concepts: ConceptCount[] }>({
    themes: [],
    concepts: [],
  });
  const [facetsError, setFacetsError] = useState<string | null>(null);
  const [dim, setDim] = useState<Dim>("theme");
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState<number | null>(null);

  useEffect(() => {
    fetchThemeFacets()
      .then(setFacets)
      .catch((err) => setFacetsError(err instanceof Error ? err.message : "Erreur inconnue"));
  }, []);

  const chips = dim === "theme" ? facets.themes : facets.concepts.slice(0, CONCEPT_CHIP_LIMIT);

  function selectTag(value: string) {
    setSelected(value);
    setYearFilter(null);
    setResultsLoading(true);
    setResults([]);
    fetchQuestionsByTag(dim, value)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setResultsLoading(false));
  }

  function switchDim(next: Dim) {
    if (next === dim) return;
    setDim(next);
    setSelected(null);
    setResults([]);
    setYearFilter(null);
  }

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const r of results) if (r.survey_year != null) set.add(r.survey_year);
    return [...set].sort((a, b) => b - a);
  }, [results]);

  const groups = useMemo(() => {
    const filtered = yearFilter == null ? results : results.filter((r) => r.survey_year === yearFilter);
    return groupBySurvey(filtered);
  }, [results, yearFilter]);

  if (facetsError) {
    return (
      <div className="alert alert-error">
        <span>{facetsError}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold px-1">Explorer par thème</h2>
        <p className="text-sm opacity-60 px-1 mt-1">
          Choisis un {dim === "theme" ? "thème" : "concept"} pour voir les questions correspondantes
          à travers tous les sondages.
        </p>
      </div>

      {/* Bascule thème / concept */}
      <div className="tabs tabs-boxed w-fit bg-base-100">
        <button
          className={`tab ${dim === "theme" ? "tab-active" : ""}`}
          onClick={() => switchDim("theme")}
        >
          Thèmes
        </button>
        <button
          className={`tab ${dim === "concept" ? "tab-active" : ""}`}
          onClick={() => switchDim("concept")}
        >
          Concepts
        </button>
      </div>

      {/* Chips (triés par fréquence décroissante) */}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.value}
            className={`badge badge-lg gap-1 ${
              selected === c.value ? "badge-primary" : "badge-outline hover:badge-primary"
            }`}
            onClick={() => selectTag(c.value)}
          >
            {c.value}
            <span className="opacity-60">{c.count}</span>
          </button>
        ))}
        {dim === "concept" && facets.concepts.length > CONCEPT_CHIP_LIMIT && (
          <span className="badge badge-ghost badge-lg opacity-60">
            +{facets.concepts.length - CONCEPT_CHIP_LIMIT} autres
          </span>
        )}
      </div>

      {/* Résultats */}
      {selected && (
        <div className="space-y-3 pt-2">
          {resultsLoading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : results.length === 0 ? (
            <div className="alert">
              <span>Aucune question taggée « {selected} ».</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm opacity-60">
                  {results.length} question{results.length > 1 ? "s" : ""} · filtrer :
                </span>
                <button
                  className={`badge ${yearFilter == null ? "badge-primary" : "badge-outline"}`}
                  onClick={() => setYearFilter(null)}
                >
                  Toutes les années
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    className={`badge tabular-nums ${yearFilter === y ? "badge-primary" : "badge-outline"}`}
                    onClick={() => setYearFilter(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {groups.map((g) => (
                  <SurveyGroup key={g.survey_id} group={g} onOpenSurvey={onOpenSurvey} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
