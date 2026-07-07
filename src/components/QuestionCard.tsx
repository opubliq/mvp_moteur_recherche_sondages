import type { SearchResult } from "../types";

/** Carte d'une question : libellé, variable, options de réponse, métadonnées. */
export default function QuestionCard({ q }: { q: SearchResult }) {
  const pertinenceConfig = {
    Exact: { color: "badge-success", progressColor: "progress-success", percent: 100, label: "Exact" },
    Partiel: { color: "badge-warning", progressColor: "progress-warning", percent: 67, label: "Partiel" },
    Faible: { color: "bg-orange-400 text-orange-950 border-orange-400", progressColor: "[&::-webkit-progress-value]:bg-orange-400 [&::-moz-progress-bar]:bg-orange-400", percent: 33, label: "Faible" },
    "Hors-sujet": { color: "badge-ghost", progressColor: "progress-ghost", percent: 0, label: "Hors-sujet" },
  };

  const config = q.pertinence ? pertinenceConfig[q.pertinence] : null;
  const progressValue = q.score_couverture !== undefined ? q.score_couverture : (config?.percent ?? 0);

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 w-full">
            <h4 className="font-medium leading-snug">{q.question_text}</h4>
            {config && (
              <progress
                className={`progress ${config.progressColor} h-1 w-24`}
                value={progressValue}
                max="100"
              ></progress>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <code className="badge badge-ghost badge-sm font-mono">
              {q.variable}
            </code>
            {config && (
              <span className={`badge badge-sm font-bold ${config.color}`}>
                {config.label}
              </span>
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
    </div>
  );
}
