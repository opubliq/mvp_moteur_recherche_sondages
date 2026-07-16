import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { SearchResult } from "../../types";

/**
 * Sélecteur de dimension de croisement avec mini-recherche (regex simple).
 * Un <select> natif ne peut pas filtrer ; combobox léger, options groupées
 * Sociodémographiques / Autres questions.
 */
function optionLabel(d: SearchResult): string {
  const prefix = d.is_sociodemo && d.sociodemo_type ? `${d.sociodemo_type} — ` : `${d.variable} — `;
  return prefix + d.question_text;
}

/** Filtre : essaie la regex (insensible à la casse), repli sur sous-chaîne. */
function makeMatcher(query: string): (d: SearchResult) => boolean {
  const q = query.trim();
  if (!q) return () => true;
  let re: RegExp | null = null;
  try {
    re = new RegExp(q, "i");
  } catch {
    re = null;
  }
  const hay = (d: SearchResult) => `${d.variable} ${d.sociodemo_type ?? ""} ${d.question_text}`;
  return re ? (d) => re!.test(hay(d)) : (d) => hay(d).toLowerCase().includes(q.toLowerCase());
}

export default function DimSelect({
  socioDims,
  otherDims,
  value,
  onChange,
}: {
  socioDims: SearchResult[];
  otherDims: SearchResult[];
  value: string;
  onChange: (variable: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => [...socioDims, ...otherDims].find((d) => d.variable === value) ?? null,
    [socioDims, otherDims, value],
  );

  const { socio, other } = useMemo(() => {
    const m = makeMatcher(query);
    return { socio: socioDims.filter(m), other: otherDims.filter(m) };
  }, [socioDims, otherDims, query]);

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className="relative max-w-md">
      <button
        type="button"
        className="select select-bordered select-sm flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{selected ? optionLabel(selected) : "Choisir une dimension…"}</span>
        <ChevronDown size={15} className="shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-box border border-base-content/12 bg-base-100 shadow-lg">
          <div className="sticky top-0 flex items-center gap-2 border-b border-base-content/8 bg-base-100 px-2 py-1.5">
            <Search size={14} className="opacity-50" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Rechercher (regex)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            />
          </div>

          {socio.length === 0 && other.length === 0 && (
            <p className="px-3 py-3 text-sm text-base-content/50">Aucune variable.</p>
          )}

          {socio.length > 0 && (
            <Group title="Sociodémographiques" dims={socio} value={value} onPick={pick} />
          )}
          {other.length > 0 && (
            <Group title="Autres questions" dims={other} value={value} onPick={pick} />
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  dims,
  value,
  onPick,
}: {
  title: string;
  dims: SearchResult[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="py-1">
      <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-base-content/45">{title}</div>
      {dims.map((d) => (
        <button
          key={d.variable}
          type="button"
          className={`block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-primary/8 ${d.variable === value ? "text-primary" : ""}`}
          title={optionLabel(d)}
          onClick={() => onPick(d.variable)}
        >
          {optionLabel(d)}
        </button>
      ))}
    </div>
  );
}
