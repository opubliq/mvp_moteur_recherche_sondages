import type { SearchResult } from "../types";

/** Carte d'une question : libellé, variable, options de réponse, métadonnées. */
export default function QuestionCard({ q }: { q: SearchResult }) {
  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-medium leading-snug">{q.question_text}</h4>
          <code className="badge badge-ghost badge-sm shrink-0 font-mono">
            {q.variable}
          </code>
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
