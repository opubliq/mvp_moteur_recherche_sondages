import { useMemo } from "react";
import type { MeanByGroupRow, ResponseOption } from "../../types";
import { codeLabel, formatMean, formatN, labelMap } from "../../lib/microdataFormat";

/**
 * Croisement cible `scale`/`continuous` × dimension → moyenne pondérée par
 * groupe. DOT PLOT sur un axe COMMUN (domaine de l'échelle) : une moyenne est une
 * POSITION, pas une magnitude depuis zéro — un point, pas une barre (une barre
 * suggère un pourcentage). Une seule mesure → primary, pas de légende. La moyenne
 * globale est un repère DISCRET en arrière-plan (gris fin), pas au premier plan.
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
          <div key={String(g.dim_code)} className="grid items-center gap-2" style={{ gridTemplateColumns: "10rem 1fr 3.2rem" }}>
            <div className="text-sm leading-tight">
              <div>{codeLabel(dMap, g.dim_code)}</div>
              <div className="text-xs text-base-content/40">n = {formatN(g.raw_n)}</div>
            </div>
            <div className="relative h-6">
              {/* rail de l'axe (discret) */}
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: "color-mix(in oklch, var(--color-base-content) 12%, transparent)" }} />
              {/* repère moyenne globale : discret, en arrière-plan */}
              {overallMean != null && (
                <div
                  className="absolute inset-y-1"
                  style={{ left: pct(overallMean), width: 1, background: "color-mix(in oklch, var(--color-base-content) 28%, transparent)" }}
                  title={`Moyenne globale : ${formatMean(overallMean)}`}
                />
              )}
              {/* point = moyenne du groupe (au premier plan) */}
              <div
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: pct(g.mean),
                  background: "var(--color-primary)",
                  boxShadow: "0 0 0 2px var(--color-base-100)", // anneau de surface pour lisibilité sur le rail
                }}
                title={`${codeLabel(dMap, g.dim_code)} : moy. ${formatMean(g.mean)} (n ${formatN(g.raw_n)})`}
              />
            </div>
            <span className="text-right text-sm font-medium tabular-nums">{formatMean(g.mean)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-base-content/45" style={{ paddingLeft: "10.5rem", paddingRight: "3.2rem" }}>
        <span>{domainMin}</span>
        {overallMean != null && <span>moy. globale {formatMean(overallMean)}</span>}
        <span>{domainMax}</span>
      </div>
    </div>
  );
}
