import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAllSurveys } from "../api";
import type { SurveyParent } from "../types";
import ThemeExplorer from "./ThemeExplorer";

interface ExplorationViewProps {
  onOpenSurvey: (id: string) => void;
}

const MONTHS_FR = [
  "",
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function monthLabel(m?: number | null): string {
  if (!m || m < 1 || m > 12) return "";
  return MONTHS_FR[m];
}

interface YearColumn {
  key: string;
  label: string;
  surveys: SurveyParent[];
}

export default function ExplorationView({ onOpenSurvey }: ExplorationViewProps) {
  const [surveys, setSurveys] = useState<SurveyParent[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Année (colonne) actuellement déployée, ou null pour la vue d'ensemble.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Carte de sondage dépliée (dans la colonne déployée), ou null.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selectedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllSurveys();
        setSurveys(data.surveys);
        setTotalQuestions(data.total_questions || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Une colonne par année, de la plus ancienne à la plus récente (années vides
  // incluses pour respecter l'échelle temporelle). Sondages triés par mois.
  const columns = useMemo<YearColumn[]>(() => {
    const dated = surveys.filter((s) => s.survey_year != null);
    const undated = surveys.filter((s) => s.survey_year == null);

    const byYear = new Map<number, SurveyParent[]>();
    for (const s of dated) {
      const y = s.survey_year as number;
      const bucket = byYear.get(y) ?? [];
      bucket.push(s);
      byYear.set(y, bucket);
    }
    for (const bucket of byYear.values()) {
      bucket.sort((a, b) => (a.survey_month ?? 0) - (b.survey_month ?? 0));
    }

    const cols: YearColumn[] = [];
    const years = [...byYear.keys()];
    if (years.length > 0) {
      const min = Math.min(...years);
      const max = Math.max(...years);
      for (let y = min; y <= max; y++) {
        cols.push({ key: String(y), label: String(y), surveys: byYear.get(y) ?? [] });
      }
    }
    if (undated.length > 0) {
      cols.push({ key: "nd", label: "n.d.", surveys: undated });
    }
    return cols;
  }, [surveys]);

  const maxCount = useMemo(
    () => Math.max(1, ...columns.map((c) => c.surveys.length)),
    [columns],
  );

  // Centre la colonne déployée dans le scroll horizontal, voisins visibles.
  useEffect(() => {
    if (selectedKey && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="stats w-full rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
        <div className="stat">
          <div className="stat-title">Sondages</div>
          <div className="stat-value text-primary">{surveys.length}</div>
          <div className="stat-desc">Disponibles dans le corpus</div>
        </div>
        <div className="stat">
          <div className="stat-title">Questions</div>
          <div className="stat-value text-secondary">{totalQuestions.toLocaleString()}</div>
          <div className="stat-desc">Indexées et cherchables</div>
        </div>
      </div>

      {/* Timeline : vue d'ensemble (nb de sondages/année), clic = déploie l'année */}
      <div>
        <h2 className="px-1 text-xl font-semibold tracking-tight">Chronologie du corpus</h2>
        <p className="mb-4 mt-1 px-1 text-sm text-base-content/60">
          {selectedKey
            ? "Clique de nouveau sur l’année pour revenir à la vue d’ensemble."
            : "Nombre de sondages par année. Clique une année pour voir ses sondages."}
        </p>

        {/* En vue d'ensemble, les colonnes se partagent la largeur : tout l'axe
            doit tenir sans scroll. Une année dépliée fait 32rem à elle seule et
            ne peut pas tenir — c'est le seul cas qui repasse en `min-w-max`. */}
        <div className={`pb-4 ${selectedKey ? "overflow-x-auto" : ""}`}>
          <div
            className={`flex items-stretch border-b-2 border-base-content/15 ${
              selectedKey ? "min-w-max" : ""
            }`}
          >
            {columns.map((col) => {
              const count = col.surveys.length;
              const selected = col.key === selectedKey;

              if (selected) {
                // Colonne déployée : large, montre les sondages en cartes lisibles.
                return (
                  <div
                    key={col.key}
                    ref={selectedRef}
                    className="flex w-[32rem] shrink-0 flex-col border-l-2 border-primary bg-base-200/40 px-3"
                  >
                    <button
                      className="flex items-center justify-between border-b border-base-content/10 py-2 text-left"
                      onClick={() => {
                        setSelectedKey(null);
                        setExpandedId(null);
                      }}
                    >
                      <span className="text-lg font-bold tabular-nums">{col.label}</span>
                      <span className="badge badge-primary badge-sm">
                        {count} sondage{count > 1 ? "s" : ""}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 items-start gap-3 py-3">
                      {col.surveys.map((s) => {
                        const open = expandedId === s.id;
                        return (
                          <div
                            key={s.id}
                            className={`card rounded-xl border border-base-content/10 bg-base-100 shadow-sm transition ${
                              open ? "ring-2 ring-primary" : "cursor-pointer hover:shadow-md"
                            }`}
                          >
                            <div
                              className="card-body cursor-pointer gap-2 p-3"
                              onClick={() => setExpandedId(open ? null : s.id)}
                            >
                              {/* Toujours visible (replié) : titre + infos de base */}
                              <h3 className="text-sm font-semibold leading-tight">{s.survey_name}</h3>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-70">
                                {s.pollster && <span>{s.pollster}</span>}
                                {monthLabel(s.survey_month) && (
                                  <span>· {monthLabel(s.survey_month)}</span>
                                )}
                                {s.n_respondents != null && (
                                  <span className="badge badge-ghost badge-xs whitespace-nowrap">
                                    N = {s.n_respondents.toLocaleString()}
                                  </span>
                                )}
                              </div>

                              {/* Déplié : description, concepts, lien détail */}
                              {open && (
                                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                  {s.language && (
                                    <p className="text-xs opacity-60">{s.language.toUpperCase()}</p>
                                  )}
                                  {s.survey_description && (
                                    <p className="text-xs leading-snug opacity-80">
                                      {s.survey_description}
                                    </p>
                                  )}
                                  {s.top_concepts && s.top_concepts.length > 0 && (
                                    <div>
                                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-50">
                                        Concepts dominants
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {s.top_concepts.map((c) => (
                                          <span key={c.value} className="badge badge-outline badge-sm">
                                            {c.value}
                                            <span className="ml-1 opacity-50">{c.count}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="card-actions justify-end">
                                    <button
                                      className="btn btn-primary btn-xs"
                                      onClick={() => onOpenSurvey(s.survey_id)}
                                    >
                                      Ouvrir le détail →
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Vue d'ensemble : colonne étroite, barre proportionnelle au nombre.
              return (
                <button
                  key={col.key}
                  className={`flex flex-col items-center border-l border-base-content/10 pb-2 transition hover:bg-base-200/60 ${
                    selectedKey ? "w-16 shrink-0" : "min-w-0 flex-1"
                  } ${count === 0 ? "opacity-50" : "cursor-pointer"}`}
                  onClick={() => count > 0 && setSelectedKey(col.key)}
                  disabled={count === 0}
                >
                  <div className="flex h-32 w-full items-end justify-center px-2 pt-3">
                    {count > 0 && (
                      <div
                        className="w-full max-w-7 rounded-t bg-primary/70"
                        style={{ height: `${(count / maxCount) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="h-4 text-xs font-bold tabular-nums text-primary">
                    {count > 0 ? count : ""}
                  </div>
                  <div className="mt-1 w-full truncate px-0.5 text-center text-xs tabular-nums opacity-60">
                    {col.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="divider"></div>

      {/* Exploration thématique : filtre par thème / concept → questions */}
      <ThemeExplorer />
    </div>
  );
}
