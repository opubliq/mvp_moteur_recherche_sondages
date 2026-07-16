import { useMemo } from "react";
import type { DistributionRow } from "../../types";
import { formatMean } from "../../lib/microdataFormat";

/**
 * Histogramme d'une cible `continuous` (âge, thermomètre 0–100…). Les codes de
 * refus/NSP sont exclus EN AMONT (côté appelant) pour ne pas dilater l'axe. On
 * binne les valeurs numériques (pondérées via `share`) et on trace la moyenne.
 * Une seule série → primary, pas de légende.
 */
export default function Histogram({
  rows,
  mean,
  bins = 20,
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
    const buckets = Array.from({ length: bins }, (_, i) => ({
      x0: min + i * width,
      x1: min + (i + 1) * width,
      w: 0,
    }));
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
  const padB = 26;
  const padL = 4;
  const plotW = W - padL * 2;
  const plotH = H - padB;
  const bw = plotW / model.buckets.length;
  const meanX =
    mean != null ? padL + ((mean - model.min) / model.span) * plotW : null;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W }} role="img" aria-label="Histogramme">
        {model.buckets.map((b, i) => {
          const h = (b.w / model.maxW) * (plotH - 6);
          return (
            <rect
              key={i}
              x={padL + i * bw + 1}
              y={plotH - h}
              width={Math.max(1, bw - 2)}
              height={h}
              rx={3}
              fill="var(--color-primary)"
              opacity={0.82}
            >
              <title>
                {b.x0.toFixed(0)}–{b.x1.toFixed(0)} : {(b.w * 100).toFixed(1)} %
              </title>
            </rect>
          );
        })}
        {/* axe de base */}
        <line x1={padL} y1={plotH} x2={W - padL} y2={plotH} stroke="currentColor" opacity={0.18} />
        {/* graduations min / max */}
        <text x={padL} y={H - 8} fontSize={11} fill="currentColor" opacity={0.55}>
          {model.min.toFixed(0)}
        </text>
        <text x={W - padL} y={H - 8} fontSize={11} textAnchor="end" fill="currentColor" opacity={0.55}>
          {model.max.toFixed(0)}
        </text>
        {/* ligne de moyenne */}
        {meanX != null && (
          <g>
            <line x1={meanX} y1={0} x2={meanX} y2={plotH} stroke="var(--color-secondary)" strokeWidth={2} strokeDasharray="4 3" />
            <text x={meanX} y={12} fontSize={11} textAnchor="middle" fill="var(--color-secondary)" fontWeight={600}>
              moy. {formatMean(mean!)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
