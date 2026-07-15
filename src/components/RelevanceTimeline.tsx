import { useEffect, useMemo, useState } from "react";
import type { SearchResult } from "../types";
import QuestionCard from "./QuestionCard";

interface RelevanceTimelineProps {
  results: SearchResult[];
}

interface YearBucket {
  key: string;
  label: string;
  items: SearchResult[];
  /** Meilleur score de pertinence de l'année (0-100), null si aucun score. */
  best: number | null;
}

function emptyBucket(key: string, label: string): YearBucket {
  return { key, label, items: [], best: null };
}

/**
 * Chronologie : une barre par année, hauteur = nombre de questions trouvées.
 * Cliquer une barre déplie les questions de l'année, dans l'ordre de pertinence.
 *
 * DÉCISION EN SUSPENS (bead 9gf.12 → à trancher en .15/.16) : cette barre était
 * EMPILÉE par palier (exact/partiel/faible). Les paliers ayant été abandonnés au
 * profit d'un gradient continu, l'empilement n'a plus de référent. Plutôt que
 * d'inventer des tranches de score arbitraires (ce qui réintroduirait des
 * paliers par la porte d'en arrière, exactement ce que l'éval a écarté), on
 * dégrade ici au choix le plus simple et honnête : une barre par année, en une
 * seule teinte, plus le meilleur score de l'année en étiquette. La vraie
 * question — comment représenter un gradient continu dans une chronologie — est
 * un choix de design qui appartient à la bead d'UI.
 */
export default function RelevanceTimeline({ results }: RelevanceTimelineProps) {
  const [selected, setSelected] = useState<string | null>(null);

  // Les résultats changent (nouvelle recherche / filtre) → on referme le drill-down.
  useEffect(() => setSelected(null), [results]);

  const buckets = useMemo<YearBucket[]>(() => {
    const byYear = new Map<number, YearBucket>();
    const undated = emptyBucket("nd", "n.d.");
    let hasUndated = false;

    for (const r of results) {
      let b: YearBucket;
      if (r.survey_year == null) {
        b = undated;
        hasUndated = true;
      } else {
        const y = r.survey_year;
        b = byYear.get(y) ?? emptyBucket(String(y), String(y));
        byYear.set(y, b);
      }
      b.items.push(r);
      if (r.score_pertinence !== undefined) {
        b.best = b.best === null ? r.score_pertinence : Math.max(b.best, r.score_pertinence);
      }
    }

    const cols: YearBucket[] = [];
    const years = [...byYear.keys()];
    if (years.length > 0) {
      const min = Math.min(...years);
      const max = Math.max(...years);
      for (let y = min; y <= max; y++) {
        cols.push(byYear.get(y) ?? emptyBucket(String(y), String(y)));
      }
    }
    if (hasUndated) cols.push(undated);
    return cols;
  }, [results]);

  const maxTotal = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.items.length)),
    [buckets],
  );

  const selection = useMemo(
    () => (selected ? buckets.find((b) => b.key === selected) ?? null : null),
    [selected, buckets],
  );

  if (buckets.length === 0) return null;

  return (
    <div className="rounded-2xl border border-base-content/10 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Chronologie des résultats</h3>
        <p className="text-xs text-base-content/60">
          Hauteur = nombre de questions · étiquette = meilleur score de l'année
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-1 border-b-2 border-base-content/15">
          {buckets.map((b) => {
            const isSel = selected === b.key;
            return (
              <div key={b.key} className="flex w-14 shrink-0 flex-col items-center">
                <div className="flex h-32 w-full items-end justify-center px-2 pt-3">
                  {b.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelected((prev) => (prev === b.key ? null : b.key))}
                      title={`${b.label} : ${b.items.length} question${b.items.length > 1 ? "s" : ""}${
                        b.best !== null ? ` · meilleur score ${b.best}` : ""
                      }`}
                      className={`w-7 cursor-pointer rounded-t bg-primary transition ${
                        isSel ? "ring-2 ring-inset ring-base-content/50" : "hover:brightness-110"
                      }`}
                      style={{ height: `${(b.items.length / maxTotal) * 100}%` }}
                    />
                  )}
                </div>
                <div className="h-4 text-xs font-bold tabular-nums opacity-70">
                  {b.items.length > 0 ? b.items.length : ""}
                </div>
                <div className="mt-1 text-xs tabular-nums opacity-60">{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {selection && (
        <div className="mt-4 border-t border-base-content/10 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              {selection.label}
              <span className="opacity-50">({selection.items.length})</span>
            </p>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSelected(null)}>
              Fermer
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-base-content/10">
            {selection.items.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
