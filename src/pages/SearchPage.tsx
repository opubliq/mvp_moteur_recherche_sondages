import { useEffect, useMemo, useState } from "react";
import { useSearchState } from "../context/SearchContext";
import SearchBar from "../components/SearchBar";
import ConceptChips from "../components/ConceptChips";
import Facets from "../components/Facets";
import SurveyGroup, { type SurveyGroupData } from "../components/SurveyGroup";
import RelevanceTimeline from "../components/RelevanceTimeline";
import ScoreDistribution from "../components/ScoreDistribution";
import type { SearchResult } from "../types";

/** Position de départ du curseur de seuil — voir le commentaire dans SearchPage. */
const DEFAULT_THRESHOLD = 30;

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
  // paliers n'existent plus (bead 9gf.12, gradient continu). Le filtre est
  // maintenant un seuil de score continu (bead 9gf.16, v1 « >= X » — voir
  // ScoreDistribution) : masque les résultats sous le seuil, ne re-score rien.
  //
  // Ce seuil n'est qu'une POSITION DE DÉPART du curseur, pas une coupe : le
  // serveur renvoie toujours toute la fenêtre de rerank (150), et glisser à 0
  // la réaffiche en entier. Le défaut évite juste de noyer la première vue —
  // une fenêtre de 150 contient en moyenne ~25 résultats pertinents pour ~125
  // hors-sujet (golden 15 requêtes : 375 vs 1875).
  //
  // 30 est délibérément prudent : sur le golden il conserve 100 % des exacts
  // (et 98,1 % de tout ce qui est pertinent) tout en écartant 17 % du bruit.
  // Monter à 45 jetterait 53 % du bruit pour 1,6 % des exacts — arbitrage
  // ouvert. La vraie correction est en amont (bead 9gf.14 : le retrieval
  // sur-décompose et remplit le pool de bruit) ; ce seuil est un pansement.
  const [scoreThreshold, setScoreThreshold] = useState(DEFAULT_THRESHOLD);
  // Nouvelle recherche → le filtre précédent n'a plus de sens, on le réinitialise.
  useEffect(() => setScoreThreshold(DEFAULT_THRESHOLD), [results]);

  const visibleResults = useMemo(
    () => results.filter((r) => (r.score_pertinence ?? 0) >= scoreThreshold),
    [results, scoreThreshold],
  );

  const themes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      for (const t of r.themes) set.add(t);
    }
    return [...set].sort();
  }, [results]);

  const groups = useMemo(() => groupBySurvey(visibleResults), [visibleResults]);

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
            {/* Le décompte et le filtre partagent une rangée : le filtre est un
                contrôle, pas le sujet de la page — il n'occupe que ~40 % de la
                largeur et laisse les sondages respirer. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <p className="text-sm text-base-content/60">
                {visibleResults.length} question{visibleResults.length > 1 ? "s" : ""} · {groups.length} sondage
                {groups.length > 1 ? "s" : ""}
                {visibleResults.length !== results.length && (
                  <> (sur {results.length} avant filtre)</>
                )}
              </p>

              <div className="w-full min-w-0 sm:w-2/5">
                <ScoreDistribution
                  results={results}
                  threshold={scoreThreshold}
                  onThresholdChange={setScoreThreshold}
                />
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
