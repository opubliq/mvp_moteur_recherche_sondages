import { useMemo } from "react";
import type { DistributionRow } from "../../types";
import { formatMean } from "../../lib/microdataFormat";

/**
 * Histogramme d'une cible `continuous` (âge, thermomètre 0–100…). Refus/NSP
 * exclus en amont pour ne pas dilater l'axe. Valeurs binnées (pondérées via
 * `share`). La moyenne = un repère discret dont le label est SOUS l'axe x.
 */
export default function Histogram({
  rows,
  mean,
  bins = 24,
}: {
  rows: DistributionRow[];
  mean?: number;
  bins?: number;
}) {
  const model = useMemo(() => {
    const pts = rows
      .map((r) => ({ x: Number(r.target_code), w: r.share }))
      .filter((p) => Number.isFinite(p.x));
    if (pts.length === 0) return null;
    const min = Math.min(...pts.map((p) => p.x));
    const max = Math.max(...pts.map((p) => p.x));
    const span = max - min || 1;
    const width = span / bins;
    const buckets = Array.from({ length: bins }, (_, i) => ({ x0: min + i * width, x1: min + (i + 1) * width, w: 0 }));
    for (const p of pts) {
      const idx = Math.min(bins - 1, Math.floor((p.x - min) / width));
      buckets[idx].w += p.w;
    }
    const maxW = Math.max(0.0001, ...buckets.map((b) => b.w));
    return { min, max, span, buckets, maxW };
  }, [rows, bins]);

  if (!model) return <p className="text-sm text-base-content/60">Aucune donnée numérique.</p>;

  const W = 640;
  const H = 200;
  const padB = 34; // axe + graduations + label moyenne
  const padX = 6;
  const plotW = W - padX * 2;
  const plotH = H - padB;
  const bw = plotW / model.buckets.length;
  const meanX = mean != null ? padX + ((mean - model.min) / model.span) * plotW : null;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W }} role="img" aria-label="Histogramme">
        {/* barres */}
        {model.buckets.map((b, i) => {
          const h = (b.w / model.maxW) * (plotH - 4);
          return (
            <rect
              key={i}
              x={padX + i * bw + 0.75}
              y={plotH - h}
              width={Math.max(1, bw - 1.5)}
              height={h}
              rx={2}
              fill="var(--color-primary)"
              opacity={0.85}
            >
              <title>{b.x0.toFixed(0)}–{b.x1.toFixed(0)} : {(b.w * 100).toFixed(1)} %</title>
            </rect>
          );
        })}

        {/* axe de base */}
        <line x1={padX} y1={plotH} x2={W - padX} y2={plotH} stroke="currentColor" opacity={0.2} />

        {/* graduations min / max sous l'axe */}
        <text x={padX} y={plotH + 15} fontSize={11} fill="currentColor" opacity={0.5}>{model.min.toFixed(0)}</text>
        <text x={W - padX} y={plotH + 15} fontSize={11} textAnchor="end" fill="currentColor" opacity={0.5}>{model.max.toFixed(0)}</text>

        {/* moyenne : repère discret + label SOUS l'axe x */}
        {meanX != null && (
          <g>
            <line x1={meanX} y1={4} x2={meanX} y2={plotH} stroke="var(--color-secondary)" strokeWidth={1.5} />
            <circle cx={meanX} cy={plotH} r={3} fill="var(--color-secondary)" />
            <text x={meanX} y={plotH + 27} fontSize={11} textAnchor="middle" fill="var(--color-secondary)" fontWeight={600}>
              moy. {formatMean(mean!)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
