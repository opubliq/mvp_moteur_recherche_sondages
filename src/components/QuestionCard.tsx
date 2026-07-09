import { Link } from "react-router-dom";
import { BarChart3, ArrowRight } from "lucide-react";
import type { SearchResult } from "../types";
import { useCart, toCartItem } from "../context/CartContext";

/** Une question = une rangée pleine largeur, cliquable → dashboard de données. */
export default function QuestionCard({ q }: { q: SearchResult }) {
  const { has, toggle } = useCart();
  const inCart = has(q.survey_id, q.variable);

  const pertinenceConfig = {
    Exact: { badge: "op-badge-exact", bar: "op-bar-exact", percent: 100, label: "Exact" },
    Partiel: { badge: "op-badge-partiel", bar: "op-bar-partiel", percent: 67, label: "Partiel" },
    Faible: { badge: "op-badge-faible", bar: "op-bar-faible", percent: 33, label: "Faible" },
    "Hors-sujet": { badge: "", bar: "", percent: 0, label: "Hors-sujet" },
  };

  const config = q.pertinence ? pertinenceConfig[q.pertinence] : null;
  const progressValue = q.score_couverture !== undefined ? q.score_couverture : config?.percent ?? 0;

  return (
    <Link to={`/sondage/${q.survey_id}/q/${encodeURIComponent(q.variable)}`} className="op-qrow">
      <input
        type="checkbox"
        className="cart-check"
        checked={inCart}
        title="Ajouter à l'export"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          toggle(toCartItem(q));
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-medium leading-snug">{q.question_text}</h4>
          <div className="flex shrink-0 items-center gap-2">
            {config && config.badge && <span className={`op-badge ${config.badge}`}>{config.label}</span>}
            <code className="badge badge-ghost badge-sm font-mono">{q.variable}</code>
          </div>
        </div>

        {config && config.bar && (
          <progress className={`op-bar ${config.bar} w-full`} value={progressValue} max="100"></progress>
        )}

        {q.response_options.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {q.response_options.map((opt) => (
              <li key={opt.code} className="badge badge-outline badge-sm whitespace-normal">
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
          {q.var_type && <span className="badge badge-neutral badge-sm">{q.var_type}</span>}
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

          <span className="op-cta ml-auto flex items-center gap-1 font-semibold text-primary">
            <BarChart3 size={15} strokeWidth={1.75} /> Explorer les données
            <span className="op-cta-arrow" aria-hidden><ArrowRight size={15} strokeWidth={1.75} /></span>
          </span>
        </div>
      </div>
    </Link>
  );
}
