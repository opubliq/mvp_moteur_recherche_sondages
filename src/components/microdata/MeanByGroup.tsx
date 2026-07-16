import { useMemo } from "react";
import type { MeanByGroupRow, ResponseOption } from "../../types";
import { codeLabel, formatMean, formatN, labelMap } from "../../lib/microdataFormat";

/**
 * Croisement cible `scale`/`continuous` × dimension → moyenne pondérée par
 * groupe. Barres horizontales sur un axe COMMUN (domaine de l'échelle), pour
 * comparer les groupes. Une seule mesure → primary, pas de légende. Ligne
 * pointillée = moyenne globale (repère).
 */
export default function MeanByGroup({
  rows,
  dimOptions,
  domainMin,
  domainMax,
  overallMean,
}: {
  rows: MeanByGroupRow[];
  dimOptions: ResponseOption[];
  domainMin: number;
  domainMax: number;
  overallMean?: number;
}) {
  const dMap = labelMap(dimOptions);
  const span = domainMax - domainMin || 1;
  const groups = useMemo(
    () => [...rows].sort((a, b) => Number(a.dim_code) - Number(b.dim_code)),
    [rows],
  );
  const pct = (v: number) => `${((v - domainMin) / span) * 100}%`;

  return (
    <div role="img" aria-label="Moyenne par groupe">
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={String(g.dim_code)} className="grid items-center gap-2" style={{ gridTemplateColumns: "8rem 1fr 3.2rem" }}>
            <span className="truncate text-sm" title={codeLabel(dMap, g.dim_code)}>
              {codeLabel(dMap, g.dim_code)}{" "}
              <span className="text-base-content/40">· {formatN(g.raw_n)}</span>
            </span>
            <div className="relative h-6 rounded" style={{ background: "color-mix(in oklch, var(--color-base-content) 6%, transparent)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: pct(g.mean), background: "color-mix(in oklch, var(--color-primary) 62%, var(--op-accent-soft, white))" }}
                title={`${codeLabel(dMap, g.dim_code)} : moy. ${formatMean(g.mean)} (n ${formatN(g.raw_n)})`}
              />
              {overallMean != null && (
                <div className="absolute inset-y-0" style={{ left: pct(overallMean), width: 2, background: "var(--color-secondary)" }} title={`Moyenne globale : ${formatMean(overallMean)}`} />
              )}
            </div>
            <span className="text-right text-sm font-medium tabular-nums">{formatMean(g.mean)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-base-content/45" style={{ paddingLeft: "8.5rem", paddingRight: "3.2rem" }}>
        <span>{domainMin}</span>
        {overallMean != null && <span className="text-secondary">moy. globale {formatMean(overallMean)}</span>}
        <span>{domainMax}</span>
      </div>
    </div>
  );
}
