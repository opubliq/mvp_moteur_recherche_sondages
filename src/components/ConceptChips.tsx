import type { Concept } from "../types";

interface ConceptChipsProps {
  concepts: Concept[];
  onChange: (concepts: Concept[]) => void;
}

/** Console de concepts compacte : une rangée de chips, slider révélé au survol. */
export default function ConceptChips({ concepts, onChange }: ConceptChipsProps) {
  const setWeight = (index: number, weight: number) => {
    const next = [...concepts];
    next[index] = { ...next[index], weight };
    onChange(next);
  };

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
            <span className="w">{c.weight.toFixed(1)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={c.weight}
              onChange={(e) => setWeight(i, parseFloat(e.target.value))}
              aria-label={`Poids du concept ${c.orig}`}
            />
          </span>
        );
      })}
    </div>
  );
}
