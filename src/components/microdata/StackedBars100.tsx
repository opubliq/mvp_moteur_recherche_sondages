import { useMemo } from "react";
import type { CrosstabRow, ResponseOption } from "../../types";
import { codeLabel, formatN, formatPct, labelMap } from "../../lib/microdataFormat";
import { categoryColor, MAX_CATEGORIES, OTHER_COLOR } from "../../lib/vizPalette";

/**
 * Croisement cible catégorielle × dimension sociodémo → barres empilées 100 %.
 * Une barre par groupe de dimension ; segments = catégories de la cible, part
 * normalisée PAR groupe (col_share). Couleur = rang FIXE de la catégorie (jamais
 * son ampleur) ; au-delà de 6 catégories → repli « Autre » gris. Gap 2px entre
 * fills + légende + labels directs sur les segments larges (encodage secondaire
 * exigé par la faible séparation CVD de la paire teal/coral).
 */
const OTHER = "__other__";

export default function StackedBars100({
  rows,
  targetOptions,
  dimOptions,
}: {
  rows: CrosstabRow[];
  targetOptions: ResponseOption[];
  dimOptions: ResponseOption[];
}) {
  const tMap = labelMap(targetOptions);
  const dMap = labelMap(dimOptions);

  const { cats, groups } = useMemo(() => {
    // Poids total par catégorie cible → garder les plus grosses, replier le reste.
    const totals = new Map<string, number>();
    for (const r of rows) {
      const k = String(r.target_code);
      totals.set(k, (totals.get(k) ?? 0) + r.weighted_n);
    }
    const ranked = [...totals.keys()].sort((a, b) => (totals.get(b)! - totals.get(a)!));
    const kept = ranked.slice(0, MAX_CATEGORIES - (ranked.length > MAX_CATEGORIES ? 1 : 0));
    const keptSet = new Set(kept);
    const cats = kept
      .sort((a, b) => Number(a) - Number(b))
      .map((code, i) => ({ code, color: categoryColor(i), label: codeLabel(tMap, code) }));
    if (ranked.length > kept.length) cats.push({ code: OTHER, color: OTHER_COLOR, label: "Autre" });

    // Regrouper par dimension → part par catégorie (repli inclus).
    const byDim = new Map<string, { raw: number; shares: Map<string, number> }>();
    for (const r of rows) {
      const dk = String(r.dim_code);
      if (!byDim.has(dk)) byDim.set(dk, { raw: 0, shares: new Map() });
      const g = byDim.get(dk)!;
      g.raw += r.raw_n;
      const cat = keptSet.has(String(r.target_code)) ? String(r.target_code) : OTHER;
      g.shares.set(cat, (g.shares.get(cat) ?? 0) + r.col_share);
    }
    const groups = [...byDim.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([code, g]) => ({ code, label: codeLabel(dMap, code), raw: g.raw, shares: g.shares }));

    return { cats, groups };
  }, [rows, tMap, dMap]);

  return (
    <div>
      {/* Légende (identité jamais portée par la couleur seule) */}
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {cats.map((c) => (
          <li key={c.code} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c.color }} />
            {c.label}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.code} className="grid items-center gap-2" style={{ gridTemplateColumns: "10rem 1fr" }}>
            <div className="text-sm leading-tight">
              <div>{g.label}</div>
              <div className="text-xs text-base-content/40">n = {formatN(g.raw)}</div>
            </div>
            <div className="flex h-6 overflow-hidden rounded" style={{ gap: 2 }}>
              {cats.map((c) => {
                const share = g.shares.get(c.code) ?? 0;
                if (share <= 0) return null;
                const wide = share >= 0.12;
                return (
                  <div
                    key={c.code}
                    className="flex items-center justify-center overflow-hidden text-[11px] font-medium text-white"
                    style={{ flexGrow: share, flexBasis: 0, background: c.color }}
                    title={`${g.label} · ${c.label} : ${formatPct(share, 1)}`}
                  >
                    {wide ? formatPct(share) : ""}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
