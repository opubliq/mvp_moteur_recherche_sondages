import { useEffect, useMemo, useState } from "react";
import type { SearchResult, Pertinence } from "../types";
import QuestionCard from "./QuestionCard";

interface RelevanceTimelineProps {
  results: SearchResult[];
}

type LevelKey = "exact" | "partiel" | "faible";

interface YearBucket {
  key: string;
  label: string;
  exact: SearchResult[];
  partiel: SearchResult[];
  faible: SearchResult[];
  total: number;
}

const LEVELS: { key: LevelKey; label: Pertinence; varName: string }[] = [
  { key: "exact", label: "Exact", varName: "--op-exact" },
  { key: "partiel", label: "Partiel", varName: "--op-partiel" },
  { key: "faible", label: "Faible", varName: "--op-faible" },
];

function emptyBucket(key: string, label: string): YearBucket {
  return { key, label, exact: [], partiel: [], faible: [], total: 0 };
}

/**
 * Chronologie de pertinence : une barre empilée par année (exact/partiel/faible),
 * affichée sous la liste des sondages. Cliquer un segment déplie les questions
 * correspondantes (année + niveau).
 */
export default function RelevanceTimeline({ results }: RelevanceTimelineProps) {
  const [selected, setSelected] = useState<{ key: string; level: LevelKey } | null>(null);

  // Les résultats changent (nouvelle recherche / filtre) → on referme le drill-down.
  useEffect(() => setSelected(null), [results]);

  const buckets = useMemo<YearBucket[]>(() => {
    const byYear = new Map<number, YearBucket>();
    const undated = emptyBucket("nd", "n.d.");
    let hasUndated = false;

    for (const r of results) {
      const p = r.pertinence;
      const level: LevelKey | null =
        p === "Exact" ? "exact" : p === "Partiel" ? "partiel" : p === "Faible" ? "faible" : null;
      if (!level) continue;

      let b: YearBucket;
      if (r.survey_year == null) {
        b = undated;
        hasUndated = true;
      } else {
        const y = r.survey_year;
        b = byYear.get(y) ?? emptyBucket(String(y), String(y));
        byYear.set(y, b);
      }
      b[level].push(r);
      b.total += 1;
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

  const maxTotal = useMemo(() => Math.max(1, ...buckets.map((b) => b.total)), [buckets]);

  const totals = useMemo(
    () =>
      buckets.reduce(
        (acc, b) => {
          acc.exact += b.exact.length;
          acc.partiel += b.partiel.length;
          acc.faible += b.faible.length;
          return acc;
        },
        { exact: 0, partiel: 0, faible: 0 },
      ),
    [buckets],
  );

  const selection = useMemo(() => {
    if (!selected) return null;
    const bucket = buckets.find((b) => b.key === selected.key);
    if (!bucket) return null;
    const level = LEVELS.find((l) => l.key === selected.level)!;
    return { bucket, level, list: bucket[selected.level] };
  }, [selected, buckets]);

  if (buckets.length === 0) return null;

  const selectSegment = (key: string, level: LevelKey) =>
    setSelected((prev) => (prev && prev.key === key && prev.level === level ? null : { key, level }));

  return (
    <div className="rounded-2xl border border-base-content/10 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Chronologie de la pertinence</h3>
        <div className="flex items-center gap-3 text-xs">
          {LEVELS.map((l) => (
            <span key={l.key} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `var(${l.varName})` }} />
              <span className="opacity-70">
                {l.label} <span className="tabular-nums opacity-100">{totals[l.key]}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-1 border-b-2 border-base-content/15">
          {buckets.map((b) => (
            <div key={b.key} className="flex w-14 shrink-0 flex-col items-center">
              <div className="flex h-32 w-full items-end justify-center px-2 pt-3">
                {b.total > 0 && (
                  <div
                    className="flex w-7 flex-col-reverse overflow-hidden rounded-t"
                    style={{ height: `${(b.total / maxTotal) * 100}%` }}
                  >
                    {LEVELS.map((l) => {
                      const count = b[l.key].length;
                      if (count === 0) return null;
                      const isSel = selected?.key === b.key && selected.level === l.key;
                      return (
                        <button
                          key={l.key}
                          type="button"
                          onClick={() => selectSegment(b.key, l.key)}
                          title={`${b.label} · ${l.label} : ${count}`}
                          className={`w-full cursor-pointer transition ${
                            isSel ? "ring-2 ring-inset ring-base-content/50" : "hover:brightness-110"
                          }`}
                          style={{ height: `${(count / b.total) * 100}%`, background: `var(${l.varName})` }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="h-4 text-xs font-bold tabular-nums opacity-70">{b.total > 0 ? b.total : ""}</div>
              <div className="mt-1 text-xs tabular-nums opacity-60">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {selection && (
        <div className="mt-4 border-t border-base-content/10 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `var(${selection.level.varName})` }} />
              {selection.bucket.label} · {selection.level.label}
              <span className="opacity-50">({selection.list.length})</span>
            </p>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSelected(null)}>
              Fermer
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-base-content/10">
            {selection.list.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
