/**
 * Couleur du score de pertinence Cohere (0-100, continu et absolu — voir
 * `SearchResult.score_pertinence` dans `src/types.ts`).
 *
 * Rampe SÉQUENTIELLE Opubliq : coral pâle -> ambre -> sarcelle profonde.
 * Les pôles restent les tokens de marque :
 *   score 0   ~ --color-secondary #f0695a (coral, éclairci)
 *   score 100 = --color-primary   oklch(0.58 0.10 196.4) (sarcelle)
 *
 * POURQUOI SÉQUENTIEL ET NON DIVERGENT (révision 9gf.15) — la 1re version était
 * un colormap divergent (coral -> gris neutre -> sarcelle). C'était la mauvaise
 * FORME pour cette donnée : un divergent suppose un milieu qui signifie quelque
 * chose (un zéro, une bascule), or 50 n'est pas neutre sur l'échelle Cohere,
 * c'est juste « moyen ». Le creux de chroma au centre délavait donc exactement
 * la zone où vivent les scores réels (mesuré : 39-59 sur une requête live) —
 * tout sortait gris. Un score 0->100 est une grandeur ORDONNÉE : sa forme est
 * la rampe séquentielle.
 *
 * LE PIÈGE ARC-EN-CIEL, ET POURQUOI ON N'Y TOMBE PAS. Interpoler naïvement
 * coral (H≈29°) -> sarcelle (H≈196°) en 2 points fait tourner la teinte à
 * travers le jaune/vert à clarté quasi constante : c'est `jet`, illisible, et
 * la teinte y invente des frontières qui n'existent pas dans la donnée.
 * Ici la teinte tourne AUSSI (29° -> 78° -> 196°) mais c'est le principe de
 * viridis : la rotation est légitime tant que la CLARTÉ EST MONOTONE. C'est L
 * qui porte l'ordre, la teinte ne fait que l'amplifier. Conséquence : l'ordre
 * reste lisible même pour un œil qui ne distingue pas rouge et vert (~8% des
 * hommes) — d'où le refus du rouge->vert classique.
 *
 * TROIS INVARIANTS À NE PAS CASSER si tu retouches les ancres :
 *   1. L strictement DÉCROISSANTE de 0 à 100. Les bons scores sont sombres donc
 *      contrastés sur le fond clair (ils « poppent »), les mauvais sont pâles
 *      et s'effacent. C'est voulu : la hiérarchie visuelle doit suivre la
 *      pertinence.
 *   2. C jamais creusée à ~0. C'était le défaut du divergent. La chroma reste
 *      haute sur toute la plage, sinon le milieu redevient gris.
 *   3. H monotone croissante (pas de retour en arrière, pas de passage par 0°).
 *
 * Fonction CONTINUE de `score` : aucun seuil, aucun bucket. Deux scores voisins
 * (63 vs 64) donnent des couleurs voisines. Re-binner en paliers réintroduirait
 * ce que l'éval golden a rejeté.
 */

import type { CSSProperties } from "react";

interface Oklch {
  l: number;
  c: number;
  h: number;
}

/**
 * Ancres de la rampe. L décroît, C reste haute, H croît — voir les trois
 * invariants dans l'en-tête du module.
 */

/** Score 0 : coral de marque (#f0695a) éclairci pour ouvrir la rampe en haut de L. */
const CORAL_PALE: Oklch = { l: 0.84, c: 0.13, h: 28.65 };

/**
 * Score 50 : ambre. C'est le point qui « poppe » — il remplace le gris neutre
 * du divergent, cause du rendu terne (les scores Cohere réels se concentrent
 * autour du milieu, donc c'est LA teinte que l'utilisateur voit le plus).
 * H=78° tient à mi-chemin de la rotation 29° -> 196°, sans faire de détour.
 */
const AMBER_MID: Oklch = { l: 0.75, c: 0.15, h: 78 };

/** Score 100 : sarcelle de marque, telle quelle (--color-primary). */
const SARCELLE: Oklch = { l: 0.58, c: 0.1, h: 196.4 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Score 0-100 -> couleur OKLCH de la rampe séquentielle, en chaîne CSS `oklch(...)`. */
export function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  const t = s / 100;

  // Interpolation par morceaux entre les trois ancres. H croît de façon
  // monotone (29 -> 78 -> 196), donc un lerp direct suffit : aucun risque de
  // franchir 0°/360° et de repartir à l'envers sur le cercle chromatique.
  const [from, to, localT] =
    t <= 0.5
      ? [CORAL_PALE, AMBER_MID, t / 0.5]
      : [AMBER_MID, SARCELLE, (t - 0.5) / 0.5];

  const l = lerp(from.l, to.l, localT);
  const c = lerp(from.c, to.c, localT);
  const h = lerp(from.h, to.h, localT);

  return `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)})`;
}

/**
 * Variable CSS `--score-c` prête à poser en `style` sur un badge/barre qui lit
 * le gradient (classes `.op-badge-score` / `.op-bar-score` dans `src/App.css`).
 */
export function scoreColorVars(score: number): CSSProperties {
  return { "--score-c": scoreToColor(score) } as CSSProperties;
}
