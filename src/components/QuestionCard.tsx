import { Link } from "react-router-dom";
import { BarChart3, ArrowRight } from "lucide-react";
import type { SearchResult } from "../types";
import { useCart, toCartItem } from "../context/CartContext";
import { scoreColorVars } from "../lib/scoreColor";
import { HighlightedText } from "../lib/highlight";
import { useSearchState } from "../context/SearchContext";

/** Une question = une rangée pleine largeur, cliquable → dashboard de données. */
export default function QuestionCard({ q }: { q: SearchResult }) {
  const { has, toggle } = useCart();
  const inCart = has(q.survey_id, q.variable);
  // Termes de la query expansion (orig/syns/qualifiers), pour surlignage lexical
  // pur affichage (bead 9gf.19) — jamais utilisés pour trier/scorer/filtrer.
  const { concepts } = useSearchState();

  // Score Cohere 0-100, absolu et continu (bead 9gf.12). Couleur = gradient
  // divergent coral->sarcelle, fonction continue de `score` (bead 9gf.15).
  const score = q.score_pertinence;
  const scoreVars = score !== undefined ? scoreColorVars(score) : undefined;

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
          <div className="min-w-0">
            <h4 className="font-semibold leading-snug">
              <HighlightedText text={q.display_label || q.question_text} concepts={concepts} />
            </h4>
            {q.display_label && q.display_label !== q.question_text && (
              <p className="mt-0.5 text-sm leading-snug text-base-content/55">
                <HighlightedText text={q.question_text} concepts={concepts} />
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {score !== undefined && (
              <span
                className="op-badge op-badge-score tabular-nums"
                style={scoreVars}
                title="Score de pertinence (0-100, échelle absolue)"
              >
                {score}
              </span>
            )}
            <code className="badge badge-ghost badge-sm font-mono">{q.variable}</code>
          </div>
        </div>

        {score !== undefined && (
          <progress className="op-bar op-bar-score w-full" style={scoreVars} value={score} max="100"></progress>
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
