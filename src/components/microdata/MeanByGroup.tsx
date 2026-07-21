import { Fragment, useMemo } from "react";
import type { MeanByGroupRow, ResponseOption } from "../../types";
import { codeLabel, formatMean, formatN, labelMap } from "../../lib/microdataFormat";
import { HoverTip, useHoverTip } from "./HoverTip";

/**
 * Croisement cible `scale`/`continuous` × dimension → moyenne pondérée par
 * groupe. DOT PLOT sur un axe COMMUN (domaine de l'échelle) : une moyenne est une
 * POSITION, pas une magnitude depuis zéro — un point, pas une barre. Une seule
 * mesure → primary, pas de légende.
 *
 * La moyenne globale = une ligne verticale qui TRAVERSE toutes les rangées
 * (colonne 2 sur `grid-row: 1 / span N` — `1 / -1` s'effondre avec des rangées
 * implicites), avec son échelle (min · moy. globale · max) EN BAS.
 */
export default function MeanByGroup({
  rows,
  dimOptions,
  dimOrdinal = false,
  domainMin,
  domainMax,
  overallMean,
  targetName,
  dimName,
}: {
  rows: MeanByGroupRow[];
  dimOptions: ResponseOption[];
  /** Dimension (axe Y) ordinale → préserver l'ordre naturel ; sinon tri par n décroissant. */
  dimOrdinal?: boolean;
  domainMin: number;
  domainMax: number;
  overallMean?: number;
  targetName?: string;
  dimName?: string;
}) {
  const dMap = labelMap(dimOptions);
  const { tip, showTip, hideTip } = useHoverTip<{
    label: string;
    mean: number;
    n: number;
    half?: number;
  }>();
  const span = domainMax - domainMin || 1;
  // Rangées : dimension ORDINALE → ordre naturel des response_options ;
  // dimension NOMINALE → tri par n (raw_n) DÉCROISSANT (plus gros en haut).
  const groups = useMemo(() => {
    const dimOrder = new Map(dimOptions.map((o, i) => [String(o.code), i]));
    return [...rows].sort((a, b) =>
      dimOrdinal
        ? (dimOrder.get(String(a.dim_code)) ?? Number(a.dim_code)) -
          (dimOrder.get(String(b.dim_code)) ?? Number(b.dim_code))
        : b.raw_n - a.raw_n,
    );
  }, [rows, dimOptions, dimOrdinal]);
  const frac = (v: number) => ((v - domainMin) / span) * 100;
  const pct = (v: number) => `${frac(v)}%`;
  /**
   * IC 95 % de la moyenne du groupe, borné au domaine de l'échelle. Renvoie null
   * dès que la SE est absente/non finie (groupe dégénéré, cache antérieur à
   * l'ajout de `se`) — l'IC est alors simplement omis, pas d'erreur.
   */
  const ci = (g: MeanByGroupRow) => {
    const se = g.se;
    if (se == null || !Number.isFinite(se) || se <= 0) return null;
    const lo = Math.max(domainMin, g.mean - 1.96 * se);
    const hi = Math.min(domainMax, g.mean + 1.96 * se);
    return hi > lo ? { lo, hi, half: 1.96 * se } : null;
  };

  return (
    <div role="img" aria-label="Moyenne par groupe">
      {dimName && (
        <div className="mb-1 text-xs font-medium text-base-content/55">Lignes = « {dimName} »</div>
      )}
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "10rem 1fr 3.2rem", columnGap: "0.5rem", rowGap: "0.5rem" }}
      >
        {/* Ligne de moyenne globale : traverse TOUTES les rangées (colonne 2).
            align-self: stretch est indispensable — sinon `items-center` de la
            grille réduit cet élément à hauteur nulle et la ligne disparaît. */}
        {overallMean != null && groups.length > 0 && (
          <div
            style={{ gridColumn: 2, gridRow: `1 / span ${groups.length}`, alignSelf: "stretch", position: "relative", pointerEvents: "none" }}
          >
            <div
              className="absolute inset-y-0"
              style={{ left: pct(overallMean), width: 1.5, background: "color-mix(in oklch, var(--color-base-content) 45%, transparent)" }}
            />
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
              {/* IC 95 % : barre simple, SOUS le point (pas de capuchons — trop
                  de bruit sur une rangée de 24px). Sous n=30 l'approximation
                  normale est optimiste → pointillé plutôt que masquage, qui
                  suggérerait à tort une précision parfaite. */}
              {(() => {
                const c = ci(g);
                if (!c) return null;
                const weak = g.raw_n < 30;
                const color = "color-mix(in oklch, var(--color-primary) 35%, transparent)";
                return (
                  <div
                    className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                    style={{
                      left: pct(c.lo),
                      width: `${frac(c.hi) - frac(c.lo)}%`,
                      background: weak
                        ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)`
                        : color,
                    }}
                  />
                );
              })()}
              {/* point = moyenne du groupe (au premier plan) */}
              <div
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-default rounded-full"
                style={{
                  left: pct(g.mean),
                  background: "var(--color-primary)",
                  boxShadow: "0 0 0 2px var(--color-base-100)",
                }}
                onMouseMove={(e) =>
                  showTip(e, {
                    label: codeLabel(dMap, g.dim_code),
                    mean: g.mean,
                    n: g.raw_n,
                    half: ci(g)?.half,
                  })
                }
                onMouseLeave={hideTip}
              />
            </div>
            <span style={{ gridColumn: 3, gridRow: i + 1 }} className="text-right text-sm font-medium tabular-nums">
              {formatMean(g.mean)}
            </span>
          </Fragment>
        ))}
      </div>

      {/* Échelle EN BAS : min … (moy. globale posée sur la ligne) … max */}
      <div className="relative mt-1.5 text-xs text-base-content/45" style={{ marginLeft: "10.5rem", marginRight: "3.7rem" }}>
        <div className="flex justify-between">
          <span>{domainMin}</span>
          <span>{domainMax}</span>
        </div>
        {overallMean != null && (
          <div
            className="absolute top-0 whitespace-nowrap font-medium text-base-content/60"
            style={{ left: pct(overallMean), transform: "translateX(-50%)" }}
          >
            moy. globale {formatMean(overallMean)}
          </div>
        )}
      </div>
      {targetName && (
        <div className="mt-2 text-center text-xs font-semibold text-base-content/70">
          Axe horizontal = moyenne de « {targetName} »
        </div>
      )}

      <HoverTip
        tip={tip}
        render={(d) => (
          <>
            <div className="font-semibold">{d.label}</div>
            <div className="mt-0.5 tabular-nums">
              moy. <b>{formatMean(d.mean)}</b>
              {d.half != null && <> ± {formatMean(d.half)}</>} · n = {formatN(d.n)}
            </div>
            {d.half != null && (
              <div className="mt-0.5 text-base-content/60">
                IC 95 %{d.n < 30 ? " · n faible, à interpréter avec prudence" : ""}
              </div>
            )}
          </>
        )}
      />
    </div>
  );
}
