import { Fragment, useMemo } from "react";
import type { MeanByGroupRow, ResponseOption } from "../../types";
import { codeLabel, formatMean, formatN, labelMap } from "../../lib/microdataFormat";

/**
 * Croisement cible `scale`/`continuous` × dimension → moyenne pondérée par
 * groupe. DOT PLOT sur un axe COMMUN (domaine de l'échelle) : une moyenne est une
 * POSITION, pas une magnitude depuis zéro — un point, pas une barre (une barre
 * suggère un pourcentage). Une seule mesure → primary, pas de légende.
 *
 * La moyenne globale = une seule ligne verticale DISCRÈTE qui TRAVERSE toutes les
 * rangées (grille : élément colonne 2 sur `grid-row 1 / -1`), avec son label
 * centré horizontalement sur la ligne.
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
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: "10rem 1fr 3.2rem",
          columnGap: "0.5rem",
          rowGap: "0.5rem",
          marginTop: overallMean != null ? "1.25rem" : 0, // place pour le label de ligne
        }}
      >
        {/* Ligne de moyenne globale : traverse TOUTES les rangées (colonne 2). */}
        {overallMean != null && (
          <div style={{ gridColumn: 2, gridRow: "1 / -1", position: "relative", pointerEvents: "none" }}>
            <div
              className="absolute inset-y-0"
              style={{ left: pct(overallMean), width: 1, background: "color-mix(in oklch, var(--color-base-content) 32%, transparent)" }}
            />
            <div
              className="absolute -top-4 whitespace-nowrap text-xs text-base-content/50"
              style={{ left: pct(overallMean), transform: "translateX(-50%)" }}
            >
              moy. globale {formatMean(overallMean)}
            </div>
          </div>
        )}

        {groups.map((g, i) => (
          <Fragment key={String(g.dim_code)}>
            <div style={{ gridColumn: 1, gridRow: i + 1 }} className="text-sm leading-tight">
              <div>{codeLabel(dMap, g.dim_code)}</div>
              <div className="text-xs text-base-content/40">n = {formatN(g.raw_n)}</div>
            </div>
            <div style={{ gridColumn: 2, gridRow: i + 1 }} className="relative h-6">
              {/* rail de l'axe (discret) */}
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: "color-mix(in oklch, var(--color-base-content) 12%, transparent)" }} />
              {/* point = moyenne du groupe (au premier plan) */}
              <div
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: pct(g.mean),
                  background: "var(--color-primary)",
                  boxShadow: "0 0 0 2px var(--color-base-100)", // anneau de surface sur le rail
                }}
                title={`${codeLabel(dMap, g.dim_code)} : moy. ${formatMean(g.mean)} (n ${formatN(g.raw_n)})`}
              />
            </div>
            <span style={{ gridColumn: 3, gridRow: i + 1 }} className="text-right text-sm font-medium tabular-nums">
              {formatMean(g.mean)}
            </span>
          </Fragment>
        ))}
      </div>

      {/* graduations du domaine, alignées sous la colonne 2 */}
      <div className="mt-1.5 flex justify-between text-xs text-base-content/45" style={{ paddingLeft: "10.5rem", paddingRight: "3.2rem" }}>
        <span>{domainMin}</span>
        <span>{domainMax}</span>
      </div>
    </div>
  );
}
