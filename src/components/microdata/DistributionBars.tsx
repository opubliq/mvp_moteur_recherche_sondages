import type { DistributionRow, ResponseOption } from "../../types";
import { codeLabel, formatN, formatPct, labelMap } from "../../lib/microdataFormat";

/**
 * Distribution univariée — barres horizontales pondérées (une seule série →
 * couleur primary, pas de légende ; le titre nomme la variable). Hover = n brut.
 *
 * Ordre : ORDINAL → suit l'ordre du tableau `response_options` (l'ordre des
 * niveaux porte le sens) ; NOMINAL → part décroissante.
 */
export default function DistributionBars({
  rows,
  options,
  ordinal = false,
}: {
  rows: DistributionRow[];
  options: ResponseOption[];
  ordinal?: boolean;
}) {
  const map = labelMap(options);
  // Index d'ordre ordinal = position dans response_options.
  const optIndex = new Map(options.map((o, i) => [String(o.code), i]));
  const sorted = [...rows].sort((a, b) => {
    if (ordinal) {
      const ia = optIndex.get(String(a.target_code)) ?? Number.MAX_SAFE_INTEGER;
      const ib = optIndex.get(String(b.target_code)) ?? Number.MAX_SAFE_INTEGER;
      return ia - ib;
    }
    return b.share - a.share;
  });
  const maxShare = Math.max(0.01, ...sorted.map((r) => r.share));

  return (
    <div role="img" aria-label="Distribution des réponses">
      {sorted.map((r) => {
        const label = codeLabel(map, r.target_code);
        return (
          <div
            key={String(r.target_code)}
            className="dist-row"
            title={`${label} — ${formatPct(r.share, 1)} · ${formatN(r.raw_n)} répondants (n brut)`}
          >
            <span className="leading-snug">{label}</span>
            <div className="dist-track">
              <div className="dist-fill" style={{ width: `${(r.share / maxShare) * 100}%` }} />
            </div>
            <span className="dist-pct">{formatPct(r.share)}</span>
          </div>
        );
      })}
    </div>
  );
}
