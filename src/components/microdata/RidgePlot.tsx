import { useMemo, useState } from "react";
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
  dimOrdinal = false,
  targetName,
  dimName,
  binCount = 24,
}: {
  rows: CrosstabRow[];
  dimOptions: ResponseOption[];
  /** Dimension (axe Y) ordinale → préserver l'ordre naturel ; sinon tri par n décroissant. */
  dimOrdinal?: boolean;
  targetName?: string;
  dimName?: string;
  /** Nombre de bins par défaut pour une cible CONTINUE (ignoré en mode discret). */
  binCount?: number;
}) {
  const dMap = labelMap(dimOptions);
  // Contrôles interactifs : nombre de bins (continu) et seuil de n minimal.
  const [nBins, setNBins] = useState(binCount);
  const [minN, setMinN] = useState(20);

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
    const bins = discrete ? Math.round(span) + 1 : Math.max(2, nBins);
    const width = span / (discrete ? Math.max(1, bins - 1) : bins);
    // Centre du bin i sur l'axe X (valeur de la variable).
    const center = (i: number) => (discrete ? min + i : min + (i + 0.5) * width);
    const idxOf = (x: number) =>
      discrete ? Math.round(x - min) : Math.min(bins - 1, Math.floor((x - min) / width));
    // Indice fractionnaire d'une valeur x dans le tableau de buckets (pour
    // interpoler la hauteur de la courbe lissée à une position quelconque).
    const fracIdx = (x: number) => (discrete ? x - min : (x - min) / width - 0.5);

    // Densité (buckets pondérés) par sous-groupe.
    const byDim = new Map<string, { w: number[]; raw: number; pts: { x: number; w: number }[] }>();
    for (const p of pts) {
      if (!byDim.has(p.dim)) byDim.set(p.dim, { w: Array(bins).fill(0), raw: 0, pts: [] });
      const g = byDim.get(p.dim)!;
      g.w[idxOf(p.x)] += p.w;
      g.pts.push({ x: p.x, w: p.w });
    }
    for (const r of rows) {
      const g = byDim.get(String(r.dim_code));
      if (g) g.raw += r.raw_n;
    }

    // Médiane pondérée (sur col_share) des valeurs de la cible dans le groupe.
    const weightedMedian = (arr: { x: number; w: number }[]) => {
      const sorted = [...arr].sort((a, b) => a.x - b.x);
      const total = sorted.reduce((s, p) => s + p.w, 0);
      if (total <= 0) return sorted.length ? sorted[Math.floor(sorted.length / 2)].x : min;
      let acc = 0;
      for (const p of sorted) {
        acc += p.w;
        if (acc >= total / 2) return p.x;
      }
      return sorted[sorted.length - 1].x;
    };
    // Hauteur (valeur de densité) de la courbe lissée à la position x, par
    // interpolation linéaire entre les centres de bins voisins.
    const heightAt = (buckets: number[], x: number) => {
      const fi = Math.max(0, Math.min(bins - 1, fracIdx(x)));
      const lo = Math.floor(fi);
      const hi = Math.min(bins - 1, lo + 1);
      return buckets[lo] + (buckets[hi] - buckets[lo]) * (fi - lo);
    };

    // Rangées : dimension ORDINALE → ordre naturel des response_options ;
    // dimension NOMINALE → tri par n (raw) DÉCROISSANT (plus gros en haut).
    const dimOrder = new Map(dimOptions.map((o, i) => [String(o.code), i]));
    const allGroups = [...byDim.entries()]
      .map(([code, g]) => {
        const median = weightedMedian(g.pts);
        return {
          code,
          label: codeLabel(dMap, code),
          buckets: g.w,
          raw: g.raw,
          median,
          medianH: heightAt(g.w, median),
        };
      })
      .sort((a, b) =>
        dimOrdinal
          ? (dimOrder.get(a.code) ?? Number(a.code)) - (dimOrder.get(b.code) ?? Number(b.code))
          : b.raw - a.raw,
      );

    // Sous-groupes sous le seuil de n : écartés AVANT le calcul de maxW, sinon
    // un groupe minuscule (ex. n=1, densité concentrée dans un seul bin) fixe
    // l'échelle verticale et aplatit toutes les autres rangées.
    const groups = allGroups.filter((g) => g.raw >= minN);
    const hidden = allGroups.length - groups.length;

    // Échelle verticale COMMUNE : max global des buckets (pics comparables).
    const maxW = Math.max(0.0001, ...groups.flatMap((g) => g.buckets));

    return { min, max, span, bins, discrete, center, groups, hidden, maxW };
  }, [rows, dMap, nBins, minN, dimOptions, dimOrdinal]);

  if (!model)
    return <p className="text-sm text-base-content/60">Aucune donnée numérique.</p>;

  const { min, max, span, discrete, center, groups, hidden, maxW } = model;
  const N = groups.length;

  // Barre de contrôles : seuil de n (toujours) + nombre de bins (continu seul).
  const controls = (
    <div className="flex w-36 shrink-0 flex-col gap-3 text-xs text-base-content/60">
      <label className="flex flex-col gap-1">
        <span className="font-medium">n minimal</span>
        <select
          className="select select-bordered select-xs"
          value={minN}
          onChange={(e) => setMinN(Number(e.target.value))}
        >
          <option value={0}>tous</option>
          <option value={10}>≥ 10</option>
          <option value={20}>≥ 20</option>
          <option value={30}>≥ 30</option>
          <option value={50}>≥ 50</option>
        </select>
      </label>
      {!discrete && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">finesse (bins)</span>
          <input
            type="range"
            className="range range-xs"
            min={8}
            max={60}
            step={2}
            value={nBins}
            onChange={(e) => setNBins(Number(e.target.value))}
          />
          <span className="tabular-nums text-base-content/45">{nBins} bins</span>
        </label>
      )}
      {hidden > 0 && (
        <span className="text-base-content/45">
          {hidden} sous-groupe{hidden > 1 ? "s" : ""} masqué{hidden > 1 ? "s" : ""} (n &lt; {minN})
        </span>
      )}
    </div>
  );

  if (N === 0)
    return (
      <div>
        {controls}
        <p className="text-sm text-base-content/60">
          Aucun sous-groupe au-dessus du seuil (n ≥ {minN}). Abaisse le seuil « n minimal ».
        </p>
      </div>
    );

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

  // Graduations liées à la NATURE de la cible (discrète = un tick/entier), pas
  // au nombre de bins choisi — sinon baisser la finesse resserre l'axe à des
  // pas de 1 illisibles.
  const ticks = model.min === model.max ? [min] : buildTicks(min, max, discrete);

  return (
    <div role="img" aria-label="Ridgeline des distributions par sous-groupe">
      {dimName && (
        <div className="mb-1 text-xs font-medium text-base-content/55">Lignes = « {dimName} »</div>
      )}
      <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1 overflow-x-auto">
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
            // Courbe lissée à TRAVERS les centres de bins seulement : pas d'ancre
            // baseline forcée aux extrémités (évite le débordement de la spline
            // hors de l'axe). On ferme l'aire par une descente verticale droite.
            const curve = g.buckets.map((w, b) => ({ x: xPix(center(b)), y: by - (w / maxW) * ridgeH }));
            const line = smoothPath(curve);
            const first = curve[0];
            const last = curve[curve.length - 1];
            const area = `${line} L ${last.x.toFixed(2)} ${by} L ${first.x.toFixed(2)} ${by} Z`;
            // Position de la médiane du sous-groupe + hauteur de la courbe à cet endroit.
            const mx = xPix(g.median);
            const myTop = by - (g.medianH / maxW) * ridgeH;
            const clipId = `ridge-clip-${i}`;
            return (
              <g key={g.code}>
                {/* rien ne doit déborder sous la ligne d'axe de la rangée */}
                <clipPath id={clipId}>
                  <rect x={0} y={0} width={W} height={by} />
                </clipPath>
                <path d={area} fill={FILL} stroke="none" clipPath={`url(#${clipId})`} />
                {/* médiane : de l'axe jusqu'au sommet du ridge à cette position */}
                <line x1={mx} y1={by} x2={mx} y2={myTop} stroke={STROKE} strokeWidth={1.5} opacity={0.7} />
                <title>{g.label} — n = {formatN(g.raw)}</title>
                {/* libellé du sous-groupe + n, dans la gouttière gauche : en
                    HTML (foreignObject) pour que les longs libellés passent sur
                    plusieurs lignes, comme le dot plot des moyennes. */}
                <foreignObject x={0} y={by - 46} width={padL - 10} height={52}>
                  <div className="flex h-full flex-col items-end justify-end text-right leading-tight">
                    <span className="text-[12px] text-base-content">{g.label}</span>
                    <span className="text-[10px] text-base-content/45">n = {formatN(g.raw)}</span>
                  </div>
                </foreignObject>
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
      {controls}
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
