import { useMemo } from "react";
import type { CrosstabRow, ResponseOption } from "../../types";
import { codeLabel, formatN, labelMap } from "../../lib/microdataFormat";

/**
 * Croisement cible `scale`/`continuous` × dimension → RIDGELINE (façon ggridges
 * `geom_density_ridges`). Une densité par sous-groupe de la dimension, empilées
 * verticalement en Y, sur un axe X COMMUN = le domaine de la variable cible. La
 * distribution intra-groupe vient du crosstab (col_share, somme = 1 par groupe),
 * donc les pics sont comparables d'une rangée à l'autre.
 *
 * C'est une DISTRIBUTION, pas des catégories : une seule teinte (primary teal),
 * pas de rampe divergente (ça, c'est l'empilé ordinal centré, un autre bead).
 * Refus/NSP déjà exclus en amont (le crosstab reçoit `exclude`).
 *
 * Binning : repris de Histogram — bins réguliers pour un continu, un bin par
 * valeur entière quand la cible est une petite échelle discrète (ex. 1–7).
 */

const FILL = "color-mix(in oklch, var(--color-primary) 32%, transparent)";
const STROKE = "var(--color-primary)";

/** Courbe lisse (Catmull-Rom → Bézier) traversant les points. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function RidgePlot({
  rows,
  dimOptions,
  targetName,
  dimName,
}: {
  rows: CrosstabRow[];
  dimOptions: ResponseOption[];
  targetName?: string;
  dimName?: string;
}) {
  const dMap = labelMap(dimOptions);

  const model = useMemo(() => {
    const pts = rows
      .map((r) => ({ x: Number(r.target_code), dim: String(r.dim_code), w: r.col_share }))
      .filter((p) => Number.isFinite(p.x));
    if (pts.length === 0) return null;

    const xs = pts.map((p) => p.x);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const span = max - min || 1;

    // Échelle discrète (petit entier, ex. Likert 1–7) → un bin par valeur ;
    // sinon binning régulier comme l'histogramme d'un continu.
    const discrete = xs.every((x) => Number.isInteger(x)) && max - min <= 15;
    const bins = discrete ? Math.round(span) + 1 : 24;
    const width = span / (discrete ? Math.max(1, bins - 1) : bins);
    // Centre du bin i sur l'axe X (valeur de la variable).
    const center = (i: number) => (discrete ? min + i : min + (i + 0.5) * width);
    const idxOf = (x: number) =>
      discrete ? Math.round(x - min) : Math.min(bins - 1, Math.floor((x - min) / width));

    // Densité (buckets pondérés) par sous-groupe.
    const byDim = new Map<string, { w: number[]; raw: number }>();
    for (const p of pts) {
      if (!byDim.has(p.dim)) byDim.set(p.dim, { w: Array(bins).fill(0), raw: 0 });
      const g = byDim.get(p.dim)!;
      g.w[idxOf(p.x)] += p.w;
    }
    for (const r of rows) {
      const g = byDim.get(String(r.dim_code));
      if (g) g.raw += r.raw_n;
    }

    const groups = [...byDim.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([code, g]) => ({ code, label: codeLabel(dMap, code), buckets: g.w, raw: g.raw }));

    // Échelle verticale COMMUNE : max global des buckets (pics comparables).
    const maxW = Math.max(0.0001, ...groups.flatMap((g) => g.buckets));

    return { min, max, span, bins, center, groups, maxW };
  }, [rows, dMap]);

  if (!model || model.groups.length === 0)
    return <p className="text-sm text-base-content/60">Aucune donnée numérique.</p>;

  const { min, max, span, bins, center, groups, maxW } = model;
  const N = groups.length;

  // Géométrie SVG.
  const W = 640;
  const padL = 150; // gouttière des libellés de sous-groupe
  const padR = 14;
  const padT = 8;
  const rowH = 52; // pas vertical entre rangées
  const ridgeH = 60; // hauteur max d'une densité (> rowH → chevauchement ggridges)
  const axisPad = 30;
  const plotW = W - padL - padR;
  const H = padT + ridgeH + rowH * (N - 1) + axisPad;

  const xPix = (v: number) => padL + ((v - min) / span) * plotW;
  const baseY = (i: number) => padT + ridgeH + i * rowH;

  const ticks = model.min === model.max ? [min] : buildTicks(min, max, bins <= 12);
  const clip = (s: string, n = 20) => (s.length > n ? s.slice(0, n) + "…" : s);

  return (
    <div role="img" aria-label="Ridgeline des distributions par sous-groupe">
      {dimName && (
        <div className="mb-1 text-xs font-medium text-base-content/55">Lignes = « {dimName} »</div>
      )}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W }}>
          {/* graduations verticales discrètes de l'axe commun */}
          {ticks.map((t) => (
            <line
              key={`grid-${t}`}
              x1={xPix(t)}
              y1={padT}
              x2={xPix(t)}
              y2={baseY(N - 1)}
              stroke="currentColor"
              opacity={0.06}
            />
          ))}

          {/* densités empilées : dessinées de haut en bas pour que la rangée du
              bas passe DEVANT celle du dessus (chevauchement façon ggridges). */}
          {groups.map((g, i) => {
            const by = baseY(i);
            const pts = [
              { x: xPix(min), y: by },
              ...g.buckets.map((w, b) => ({ x: xPix(center(b)), y: by - (w / maxW) * ridgeH })),
              { x: xPix(max), y: by },
            ];
            const line = smoothPath(pts);
            return (
              <g key={g.code}>
                <path d={`${line} Z`} fill={FILL} stroke="none" />
                <path d={line} fill="none" stroke={STROKE} strokeWidth={1.4} strokeLinejoin="round" />
                <title>{g.label} — n = {formatN(g.raw)}</title>
                {/* libellé du sous-groupe + n, dans la gouttière gauche */}
                <text x={padL - 10} y={by - 5} textAnchor="end" fontSize={12} fill="currentColor">
                  {clip(g.label)}
                </text>
                <text x={padL - 10} y={by + 8} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.45}>
                  n = {formatN(g.raw)}
                </text>
              </g>
            );
          })}

          {/* axe X commun */}
          <line x1={padL} y1={baseY(N - 1)} x2={W - padR} y2={baseY(N - 1)} stroke="currentColor" opacity={0.2} />
          {ticks.map((t) => (
            <text
              key={`tick-${t}`}
              x={xPix(t)}
              y={baseY(N - 1) + 15}
              fontSize={11}
              textAnchor="middle"
              fill="currentColor"
              opacity={0.5}
            >
              {formatTick(t)}
            </text>
          ))}
        </svg>
      </div>
      {targetName && (
        <div className="mt-1 text-center text-xs font-semibold text-base-content/70">
          Axe horizontal = « {targetName} »
        </div>
      )}
    </div>
  );
}

/** Graduations lisibles. Échelle discrète courte → chaque entier ; sinon ~6 pas. */
function buildTicks(min: number, max: number, discrete: boolean): number[] {
  if (discrete) {
    const out: number[] = [];
    for (let v = Math.ceil(min); v <= max; v++) out.push(v);
    return out.length > 1 ? out : [min, max];
  }
  const steps = 5;
  return Array.from({ length: steps + 1 }, (_, i) => min + ((max - min) * i) / steps);
}

function formatTick(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
