import { useMemo } from "react";
import type { SearchResult } from "../types";
import { scoreToColor } from "../lib/scoreColor";
import { buildScoreBins } from "../lib/scoreBins";

interface ScoreDistributionProps {
  results: SearchResult[];
  threshold: number;
  onThresholdChange: (t: number) => void;
}

const BIN_WIDTH = 5; // 20 bins sur le domaine fixe 0-100.
const AXIS_TICKS = [0, 25, 50, 75, 100];

/**
 * Histogramme global des scores — sert aussi de FILTRE (seuil « >= X », v1
 * simple retenue par la bead plutôt qu'un brush de range complet).
 *
 * Domaine X FIXE 0-100 (jamais cadré sur le min/max des résultats affichés) :
 * deux recherches doivent rester comparables à l'œil, y compris quand tous
 * les scores tiennent dans une plage étroite (mesuré sur données réelles :
 * ~24-73 sur « qualité de l'eau », ~42-88 sur « intentions de vote » — voir
 * eval/_dist_probe.ts). L'histogramme montre alors une bosse étroite quelque
 * part sur l'axe plutôt que de mentir en l'étirant à 0-100.
 *
 * Couleur : chaque bin prend `scoreToColor(bin.center)`, jamais une couleur
 * de palier — un bin est un artefact de comptage (voir scoreBins.ts).
 *
 * Le filtre MASQUE (les bins sous le seuil s'atténuent, une ligne marque le
 * seuil) mais ne recolore et ne recalcule aucun score.
 */
export default function ScoreDistribution({ results, threshold, onThresholdChange }: ScoreDistributionProps) {
  const scores = useMemo(
    () => results.map((r) => r.score_pertinence).filter((s): s is number => s !== undefined),
    [results],
  );

  const bins = useMemo(() => buildScoreBins(scores, BIN_WIDTH), [scores]);
  const maxCount = Math.max(1, ...bins.map((b) => b.count));

  if (scores.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {/* L'histogramme et le slider partagent le MÊME domaine 0-100 sur la même
          largeur : le slider tient donc lieu d'axe, et son curseur pointe
          directement la position du seuil dans la distribution. */}
      <div className="min-w-0 flex-1">
        <div className="relative h-10">
          <div
            className="absolute top-0 bottom-0 w-px bg-base-content/40"
            style={{ left: `${threshold}%` }}
          />
          <div className="relative flex h-full items-end gap-px">
            {bins.map((b) => (
              <div
                key={b.start}
                className="min-w-0 flex-1 rounded-t transition-opacity"
                style={{
                  height: b.count > 0 ? `${(b.count / maxCount) * 100}%` : "1px",
                  background: b.count > 0 ? scoreToColor(b.center) : "transparent",
                  opacity: b.end <= threshold ? 0.25 : 1,
                }}
                title={`${b.start}-${b.end} : ${b.count} résultat${b.count > 1 ? "s" : ""}`}
              />
            ))}
          </div>
        </div>

        <input
          id="score-threshold"
          type="range"
          min={0}
          max={100}
          step={1}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="range range-xs w-full"
          style={{ accentColor: "var(--color-primary)" }}
          aria-label="Seuil minimal de score de pertinence"
        />

        <div className="flex justify-between text-[10px] tabular-nums text-base-content/35">
          {AXIS_TICKS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      {/* Le libellé est collé au seuil pour se lire d'un trait — « Score de
          pertinence ≥ 30 » — plutôt qu'en titre détaché : sans lui, rien ne dit
          sur QUOI porte le filtre. Pas de décompte ici : le compteur de la page
          affiche déjà « N questions (sur M avant filtre) ». */}
      <div className="shrink-0 text-xs">
        <span className="text-base-content/60">Score de pertinence</span>{" "}
        <span className="font-semibold tabular-nums">≥ {threshold}</span>
      </div>
    </div>
  );
}
