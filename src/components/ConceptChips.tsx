import type { Concept } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface ConceptChipsProps {
  concepts: Concept[];
  /** Reformulation LLM envoyée au reranker Cohere ; masquée si vide. */
  rerankQuery?: string;
}

/** Console de concepts compacte : une rangée de chips en lecture seule. */
export default function ConceptChips({ concepts, rerankQuery }: ConceptChipsProps) {
  const { t } = useLanguage();
  return (
    <div className="concept-block">
      <div className="concept-row">
        <span className="text-xs font-semibold uppercase tracking-wide text-base-content/45">{t("conceptChips.title")}</span>
        {concepts.map((c, i) => {
          // Synonymes hors du mot original (souvent dupliqué dans syns).
          const syns = c.syns.filter((s) => s.toLowerCase() !== c.orig.toLowerCase());
          return (
            <span key={i} className="concept-chip">
              <b>{c.orig}</b>
              {syns.length > 0 && <span className="syns">{syns.join(", ")}</span>}
              {c.qualifiers && c.qualifiers.length > 0 && (
                <span className="q">·{c.qualifiers.join(" / ")}</span>
              )}
            </span>
          );
        })}
      </div>
      {rerankQuery && (
        <div className="rerank-query-row">
          <span className="text-xs font-semibold uppercase tracking-wide text-base-content/45">
            {t("conceptChips.rerankQuery")}
          </span>
          <span className="rerank-query">{rerankQuery}</span>
        </div>
      )}
    </div>
  );
}
