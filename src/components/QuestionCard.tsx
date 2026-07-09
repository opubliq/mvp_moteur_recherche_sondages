import type { SearchResult } from "../types";

/** Carte d'une question : libellé, variable, options de réponse, métadonnées. */
export default function QuestionCard({ q }: { q: SearchResult }) {
  const pertinenceConfig = {
    Exact: { badge: "op-badge-exact", bar: "op-bar-exact", percent: 100, label: "Exact" },
    Partiel: { badge: "op-badge-partiel", bar: "op-bar-partiel", percent: 67, label: "Partiel" },
    Faible: { badge: "op-badge-faible", bar: "op-bar-faible", percent: 33, label: "Faible" },
    "Hors-sujet": { badge: "", bar: "", percent: 0, label: "Hors-sujet" },
  };

  const config = q.pertinence ? pertinenceConfig[q.pertinence] : null;
  const progressValue = q.score_couverture !== undefined ? q.score_couverture : (config?.percent ?? 0);

  return (
    <div className="op-card op-card-hover flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex w-full flex-col gap-1.5">
          <h4 className="font-medium leading-snug">{q.question_text}</h4>
          {config && config.bar && (
            <progress
              className={`op-bar ${config.bar} w-24`}
              value={progressValue}
              max="100"
            ></progress>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <code className="badge badge-ghost badge-sm font-mono">
            {q.variable}
          </code>
          {config && config.badge && (
            <span className={`op-badge ${config.badge}`}>{config.label}</span>
          )}
        </div>
      </div>

      {q.response_options.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {q.response_options.map((opt) => (
            <li
              key={opt.code}
              className="badge badge-outline badge-sm whitespace-normal"
            >
              <span className="font-mono opacity-60">{opt.code}</span>
              &nbsp;{opt.label}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {q.matched_concepts && q.matched_concepts.length > 0 && (
          <div className="mr-2 flex items-center gap-1">
            <span className="text-base-content/50">Match&nbsp;:</span>
            {q.matched_concepts.map((mc) => (
              <span key={mc} className="badge badge-success badge-soft badge-xs font-semibold">
                {mc}
              </span>
            ))}
          </div>
        )}
        {q.var_type && (
          <span className="badge badge-neutral badge-sm">{q.var_type}</span>
        )}
        {q.is_sociodemo && (
          <span className="badge badge-info badge-sm">
            sociodémo{q.sociodemo_type ? ` · ${q.sociodemo_type}` : ""}
          </span>
        )}
        {q.themes.map((t) => (
          <span key={t} className="badge badge-primary badge-soft badge-sm">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
