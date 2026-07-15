import { useMemo } from "react";
import { scoreToColor } from "../lib/scoreColor";
import { buildScoreBins } from "../lib/scoreBins";

interface ScoreMiniDistProps {
  scores: number[];
}

/** En-dessous de ce nombre de questions, un histogramme mentirait (trop peu
 * de docs pour que des "bins" veuillent dire quelque chose) — on bascule sur
 * un rug plot (un tick par question). Au-dessus, l'histogramme redevient
 * honnête. */
const RUG_MAX_N = 6;
const MINI_BIN_WIDTH = 10; // 10 bins, plus grossier que le global (largeur 5) : le mini est petit.

/**
 * Mini-distribution des scores d'un sondage, pour l'en-tête de `SurveyGroup`.
 *
 * Même domaine fixe 0-100 et même rampe `scoreToColor` que le reste de
 * l'app — c'est un zoom sur le même système visuel, pas un mini-graphe à
 * part. Purement informatif (pas de filtre ici, le filtre global vit dans
 * `ScoreDistribution`).
 */
export default function ScoreMiniDist({ scores }: ScoreMiniDistProps) {
  const bins = useMemo(
    () => (scores.length > RUG_MAX_N ? buildScoreBins(scores, MINI_BIN_WIDTH) : null),
    [scores],
  );

  if (scores.length === 0) return null;

  if (bins) {
    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    return (
      <div
        className="flex h-5 w-24 shrink-0 items-end gap-px"
        title={`Distribution des ${scores.length} scores (${Math.min(...scores)}-${Math.max(...scores)})`}
      >
        {bins.map((b) => (
          <div
            key={b.start}
            className="min-w-0 flex-1 rounded-t"
            style={{
              height: b.count > 0 ? `${(b.count / maxCount) * 100}%` : "1px",
              background: b.count > 0 ? scoreToColor(b.center) : "transparent",
            }}
          />
        ))}
      </div>
    );
  }

  // Rug plot : peu de questions, chaque score est un tick individuel — aucun
  // comptage groupé qui prêterait à confusion.
  return (
    <div
      className="relative h-5 w-24 shrink-0"
      title={`Scores : ${[...scores].sort((a, b) => b - a).join(", ")}`}
    >
      <div className="absolute inset-x-0 bottom-0.5 h-px bg-base-content/12" />
      {scores.map((s, i) => (
        <div
          key={i}
          className="absolute bottom-0.5 w-0.5 rounded-t"
          style={{
            left: `${Math.max(0, Math.min(100, s))}%`,
            height: "0.75rem",
            background: scoreToColor(s),
          }}
        />
      ))}
    </div>
  );
}
