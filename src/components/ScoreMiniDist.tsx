import { Fragment, useMemo } from "react";
import { scoreToColor, scoreToInkColor } from "../lib/scoreColor";
import { packSwarm, tokenDiameter, TOKEN_QUANTUM } from "../lib/beeswarm";
import { N_SCORE_BANDS, scoreBandIndex } from "../lib/scoreBins";

interface ScoreMiniDistProps {
  scores: number[];
}

/** Géométrie du mini-nuage, en px. */
const DOT = 4;
const DOT_GAP = 1;
/** Distance minimale entre deux centres. Pas de bordure ici (contrairement à la
 * chronologie), donc l'empreinte d'un point vaut son seul diamètre. */
const SPACING = DOT + DOT_GAP;

/**
 * Largeur de la zone de tracé, en px. DÉRIVÉE des bandes, comme la hauteur de la
 * chronologie : une bande de score doit valoir au moins une empreinte de point,
 * sinon deux bandes voisines se chevauchent et `packSwarm` les fusionne. Doit
 * rester synchro avec la classe `w-25` du rendu (25 × 4px = 100px).
 */
const W = N_SCORE_BANDS * SPACING;

/** Taille du chiffre dans le jeton, en px. Plus petite que dans la chronologie :
 * c'est une vignette, et c'est elle qui dicte toute la hauteur ci-dessous. */
const TOKEN_FONT = 7;
/** Diamètre du jeton. DÉRIVÉ de ce qu'il doit porter — voir `tokenDiameter`. */
const TOKEN = tokenDiameter(2, TOKEN_FONT);
/** Place qu'un jeton prend sur l'axe des scores, le blanc compris. */
const TOKEN_SPACING = TOKEN + DOT_GAP;

/**
 * Demi-étendue transverse (verticale) du nuage, en px. DÉRIVÉE du pire cas : le
 * jeton est calé en haut et son reste descend à sa suite, soit au plus 4 points
 * (voir `quantum` dans `src/lib/beeswarm.ts`). Il faut donc pouvoir loger un
 * jeton et 3 intervalles de point entre les deux bords.
 */
const MAX_OFFSET = (TOKEN_SPACING + (TOKEN_QUANTUM - 2) * SPACING) / 2;
/**
 * Hauteur de la zone de tracé, en px : la demi-étendue, plus le rayon du point
 * extrême et 1px de marge, de chaque côté.
 *
 * ELLE GRANDIT AVEC LE JETON, ce n'est plus une valeur ronde. Ici le bord est un
 * VRAI mur : la chronologie peut laisser un point mordre de quelques px sur
 * l'année voisine (du blanc, la plupart du temps), mais une vignette qui déborde
 * écrit par-dessus le titre du sondage. Le choix était donc entre grandir et
 * renoncer au reste dans les vignettes — or y renoncer, c'est réintroduire le
 * « 19 » au lieu de « 15 » + 4 points.
 */
const H = 2 * (MAX_OFFSET + DOT / 2 + 1);

/** Score → position du CENTRE de sa bande sur l'axe horizontal, en px. Par index
 * de bande, pour que la grille reste exacte — voir `scoreBandIndex`. */
const toMain = (score: number) => scoreBandIndex(score) * SPACING + SPACING / 2;
/** Réciproque : la couleur d'un jeton vient de la bande qu'il occupe, pas d'une
 * des questions qu'il replie. */
const mainToScore = (main: number) => (main / W) * 100;

/**
 * Mini-distribution des scores d'un sondage, pour l'en-tête de `SurveyGroup`.
 *
 * FORME : un BEESWARM horizontal (x = score, un point par question).
 *
 * POURQUOI PAS UN HISTOGRAMME. La version d'avant basculait de forme à n=6 :
 * rug plot en dessous (trop peu de docs pour que des bins veuillent dire quoi
 * que ce soit), histogramme au-dessus. Deux sondages voisins dans la même liste
 * de résultats se lisaient donc dans deux langages graphiques différents selon
 * qu'ils avaient 5 ou 7 questions — précisément ce qui casse la comparaison à
 * l'œil. Le beeswarm tient de n=1 à n=40 sans seuil arbitraire, et 10 bins dans
 * 96px n'étaient de toute façon pas une lecture honnête.
 *
 * Mêmes bandes fixes de 5 (`src/lib/scoreBins.ts`), même domaine fixe 0-100,
 * même rampe `scoreToColor`, même packing et mêmes jetons chiffrés que la
 * chronologie — c'est un zoom sur le même système visuel, pas un mini-graphe à
 * part. Purement informatif : le filtre global vit dans `ScoreDistribution`, qui
 * reste un histogramme (hauteur = comptage, même domaine que son slider, et il
 * encaisse des centaines de résultats).
 */
export default function ScoreMiniDist({ scores }: ScoreMiniDistProps) {
  const rows = useMemo(
    () =>
      packSwarm(scores, toMain, {
        diameter: SPACING,
        maxOffset: MAX_OFFSET,
        collapsedSize: TOKEN_SPACING,
        quantum: TOKEN_QUANTUM,
      }),
    [scores],
  );

  if (scores.length === 0) return null;

  return (
    <div
      className="relative w-25 shrink-0"
      style={{ height: H }}
      title={`Distribution des ${scores.length} score${scores.length > 1 ? "s" : ""} (${Math.min(
        ...scores,
      )}-${Math.max(...scores)})`}
    >
      {rows.map((row) => (
        <Fragment key={row.main}>
          {/* Une vignette de 100px ne peut pas empiler dix points dans une bande
              sans les écraser les uns sur les autres — donc sans écraser la
              couleur, seul canal qui porte encore le score ici. On écrit le
              compte à la place. */}
          {row.token && (
            <span
              className="absolute flex items-center justify-center rounded-full font-semibold leading-none tabular-nums"
              style={{
                height: TOKEN,
                width: TOKEN,
                fontSize: TOKEN_FONT,
                left: row.main - TOKEN / 2,
                top: H / 2 + row.token.offset - TOKEN / 2,
                background: scoreToColor(mainToScore(row.main)),
                // L'encre suit la bande, en plus foncé.
                color: scoreToInkColor(mainToScore(row.main)),
              }}
            >
              {row.token.count}
            </span>
          )}
          {row.points.map(({ item: s, offset }, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                height: DOT,
                width: DOT,
                left: row.main - DOT / 2,
                top: H / 2 + offset - DOT / 2,
                background: scoreToColor(s),
              }}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
}
