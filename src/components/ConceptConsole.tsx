import type { Concept } from "../types";

interface ConceptConsoleProps {
  concepts: Concept[];
  onChange: (concepts: Concept[]) => void;
}

export default function ConceptConsole({ concepts, onChange }: ConceptConsoleProps) {
  const handleWeightChange = (index: number, weight: number) => {
    const next = [...concepts];
    next[index] = { ...next[index], weight };
    onChange(next);
  };

  return (
    <div className="op-card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-base-content/55">
          Console de Concepts
        </h2>
        <div className="flex flex-wrap gap-4">
          {concepts.map((c, i) => (
            <div key={i} className="flex min-w-[200px] flex-col gap-2 rounded-xl border border-base-content/10 bg-base-200/50 p-3">
              <div className="flex justify-between items-start">
                <span className="font-bold text-primary">{c.orig}</span>
                <div className="badge badge-sm badge-outline opacity-50">
                  {c.weight.toFixed(1)}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 mt-1">
                {c.syns.map((s, si) => (
                  <span key={si} className="badge badge-ghost badge-xs italic">
                    {s}
                  </span>
                ))}
                {c.qualifiers?.map((q, qi) => (
                  <span key={qi} className="badge badge-secondary badge-outline badge-xs">
                    {q}
                  </span>
                ))}
              </div>

              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={c.weight}
                  onChange={(e) => handleWeightChange(i, parseFloat(e.target.value))}
                  className="range range-primary range-xs"
                />
                <div className="flex justify-between text-[10px] px-1 opacity-50">
                  <span>Désactivé</span>
                  <span>Max</span>
                </div>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
