import type { Concept } from "../types";

interface ConceptChipsProps {
  concepts: Concept[];
}

/** Console de concepts compacte : une rangée de chips en lecture seule. */
export default function ConceptChips({ concepts }: ConceptChipsProps) {
  return (
    <div className="concept-row">
      <span className="text-xs font-semibold uppercase tracking-wide text-base-content/45">Concepts</span>
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
  );
}
