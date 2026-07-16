import type { DistributionRow, ResponseOption } from "../../types";
import { codeLabel, formatN, formatPct, labelMap } from "../../lib/microdataFormat";

/**
 * Distribution univariée — barres horizontales pondérées.
 * `single` : ordonné par part décroissante. `scale` : ordonné par code (l'ordre
 * porte le sens). Une seule série → couleur primary, pas de légende (le titre
 * nomme la variable). Hover = n brut (fiabilité de la cellule).
 */
export default function DistributionBars({
  rows,
  options,
  orderBy = "share",
}: {
  rows: DistributionRow[];
  options: ResponseOption[];
  orderBy?: "share" | "code";
}) {
  const map = labelMap(options);
  const sorted = [...rows].sort((a, b) =>
    orderBy === "code"
      ? Number(a.target_code) - Number(b.target_code)
      : b.share - a.share,
  );
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
