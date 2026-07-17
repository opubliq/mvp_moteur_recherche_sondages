import { useMemo, useState } from "react";
import type { CrosstabRow, ResponseOption } from "../../types";
import { codeLabel, formatN, formatPct, labelMap, refusalCodes } from "../../lib/microdataFormat";
import { categoryColor, divergingRamp, MAX_CATEGORIES, OTHER_COLOR } from "../../lib/vizPalette";

/**
 * Croisement cible catégorielle × dimension → barres empilées 100 %. Une barre
 * par groupe de dimension ; segments = catégories de la cible, part normalisée
 * PAR groupe (col_share). Gap 2px entre fills + légende + labels directs.
 *
 * ORDINAL (Likert/échelle) : gradient SÉQUENTIEL suivant l'ordre des
 * response_options (l'ordre porte le sens), refus/NSP en gris À LA FIN, et AUCUN
 * repli « Autre » (tous les niveaux gardés). NOMINAL : palette catégorielle à rang
 * fixe, au-delà de 6 modalités → repli « Autre » gris.
 */
const OTHER = "__other__";

interface Cat {
  code: string;
  color: string;
  label: string;
  dark: boolean; // texte foncé (segment clair) vs blanc
}

export default function StackedBars100({
  rows,
  targetOptions,
  dimOptions,
  ordinal = false,
  dimOrdinal = false,
  targetName,
  dimName,
}: {
  rows: CrosstabRow[];
  targetOptions: ResponseOption[];
  dimOptions: ResponseOption[];
  ordinal?: boolean;
  /** Dimension (axe Y) ordinale → préserver l'ordre naturel ; sinon tri par n décroissant. */
  dimOrdinal?: boolean;
  targetName?: string;
  dimName?: string;
}) {
  const tMap = labelMap(targetOptions);
  const dMap = labelMap(dimOptions);
  const [tip, setTip] = useState<{ x: number; y: number; label: string; pct: string; n: number; group: string } | null>(null);

  const { cats, groups } = useMemo(() => {
    const present = new Set(rows.map((r) => String(r.target_code)));
    let cats: Cat[];
    let catOf: (code: string) => string;

    if (ordinal) {
      // Ordre = response_options (la rampe). Refus/NSP sortis en gris à la fin.
      const refusal = new Set(refusalCodes(targetOptions).map(String));
      const ordered = targetOptions.map((o) => String(o.code));
      const scaleCodes = ordered.filter((c) => !refusal.has(c) && present.has(c));
      const refusalPresent = ordered.filter((c) => refusal.has(c) && present.has(c));
      const extras = [...present].filter((c) => !ordered.includes(c)).sort((a, b) => Number(a) - Number(b));
      // Ordinal → toujours DIVERGENT depuis le centre (teal ↔ coral).
      const ramp = divergingRamp(scaleCodes.length);
      cats = [
        ...scaleCodes.map((code, i) => ({
          code,
          color: ramp[i].color,
          label: codeLabel(tMap, code),
          dark: ramp[i].dark,
        })),
        ...refusalPresent.map((code) => ({ code, color: OTHER_COLOR, label: codeLabel(tMap, code), dark: true })),
        ...extras.map((code) => ({ code, color: OTHER_COLOR, label: codeLabel(tMap, code), dark: true })),
      ];
      catOf = (code) => code; // aucun repli : chaque niveau reste distinct
    } else {
      // Nominal : rang par poids total, repli « Autre » au-delà de 6.
      const totals = new Map<string, number>();
      for (const r of rows) {
        const k = String(r.target_code);
        totals.set(k, (totals.get(k) ?? 0) + r.weighted_n);
      }
      const ranked = [...totals.keys()].sort((a, b) => totals.get(b)! - totals.get(a)!);
      const kept = ranked.slice(0, MAX_CATEGORIES - (ranked.length > MAX_CATEGORIES ? 1 : 0));
      const keptSet = new Set(kept);
      cats = kept
        .sort((a, b) => Number(a) - Number(b))
        .map((code, i) => ({ code, color: categoryColor(i), label: codeLabel(tMap, code), dark: false }));
      if (ranked.length > kept.length) cats.push({ code: OTHER, color: OTHER_COLOR, label: "Autre", dark: true });
      catOf = (code) => (keptSet.has(code) ? code : OTHER);
    }

    // Agrégation par groupe de dimension (shares = col_share, raws = n par cat).
    const byDim = new Map<string, { raw: number; shares: Map<string, number>; raws: Map<string, number> }>();
    for (const r of rows) {
      const dk = String(r.dim_code);
      if (!byDim.has(dk)) byDim.set(dk, { raw: 0, shares: new Map(), raws: new Map() });
      const g = byDim.get(dk)!;
      g.raw += r.raw_n;
      const cat = catOf(String(r.target_code));
      g.shares.set(cat, (g.shares.get(cat) ?? 0) + r.col_share);
      g.raws.set(cat, (g.raws.get(cat) ?? 0) + r.raw_n);
    }
    // Rangées : dimension ORDINALE → ordre naturel des response_options ;
    // dimension NOMINALE → tri par n (raw) DÉCROISSANT (plus gros en haut).
    const dimOrder = new Map(dimOptions.map((o, i) => [String(o.code), i]));
    const groups = [...byDim.entries()]
      .map(([code, g]) => ({ code, label: codeLabel(dMap, code), raw: g.raw, shares: g.shares, raws: g.raws }))
      .sort((a, b) =>
        dimOrdinal
          ? (dimOrder.get(a.code) ?? Number(a.code)) - (dimOrder.get(b.code) ?? Number(b.code))
          : b.raw - a.raw,
      );

    return { cats, groups };
  }, [rows, tMap, dMap, ordinal, targetOptions, dimOptions, dimOrdinal]);

  return (
    <div>
      {/* Titre de la couleur = variable cible (quel axe = quelle variable). */}
      {targetName && (
        <div className="mb-1 text-xs font-semibold text-base-content/70">
          Couleurs = « {targetName} »
        </div>
      )}
      {/* Légende (identité jamais portée par la couleur seule) */}
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {cats.map((c) => (
          <li key={c.code} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c.color }} />
            {c.label}
          </li>
        ))}
      </ul>

      {dimName && (
        <div className="mb-1 text-xs font-medium text-base-content/55">Lignes = « {dimName} »</div>
      )}
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.code} className="grid items-center gap-2" style={{ gridTemplateColumns: "10rem 1fr" }}>
            <div className="text-sm leading-tight">
              <div>{g.label}</div>
              <div className="text-xs text-base-content/40">n = {formatN(g.raw)}</div>
            </div>
            <div className="flex h-6 overflow-hidden rounded" style={{ gap: 1 }}>
              {cats.map((c) => {
                const share = g.shares.get(c.code) ?? 0;
                if (share <= 0) return null;
                const wide = share >= 0.12;
                return (
                  <div
                    key={c.code}
                    className="flex cursor-default items-center justify-center overflow-hidden text-[11px] font-medium"
                    style={{ flexGrow: share, flexBasis: 0, background: c.color, color: c.dark ? "oklch(0.28 0.02 196)" : "white" }}
                    onMouseMove={(e) =>
                      setTip({ x: e.clientX, y: e.clientY, label: c.label, pct: formatPct(share, 1), n: g.raws.get(c.code) ?? 0, group: g.label })
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    {wide ? formatPct(share) : ""}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {tip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-base-content/10 bg-base-100 px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          <div className="font-semibold">{tip.label}</div>
          <div className="text-base-content/60">{tip.group}</div>
          <div className="mt-0.5 tabular-nums">
            <b>{tip.pct}</b> · n = {formatN(tip.n)}
          </div>
        </div>
      )}
    </div>
  );
}
