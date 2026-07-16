/**
 * Binning des scores de pertinence (0-100) pour l'histogramme global et les
 * mini-distributions par sondage.
 *
 * IMPORTANT — un bin est un artefact de COMPTAGE, pas une catégorie
 * sémantique. Il ne porte ni label (« bon »/« moyen »/« faible ») ni couleur
 * de palier : sa couleur vient de `scoreToColor` appliqué à son centre, sur
 * la même rampe continue que le reste de l'app (voir `src/lib/scoreColor.ts`,
 * qui documente pourquoi les paliers ont été rejetés). Ne réintroduis jamais
 * de seuils sémantiques ici — seule la largeur de bin (résolution du
 * comptage) est un paramètre légitime.
 *
 * L'axe est TOUJOURS 0-100, fixe : voir `buildScoreBins`, qui ne cadre jamais
 * sur le min/max des données passées.
 */

/**
 * Largeur d'une bande de score, en points de score. Grille FIXE sur [0, 100],
 * donc 20 bandes : 0-5, 5-10, … 95-100.
 *
 * Les beeswarms (`src/lib/beeswarm.ts`) s'en servent pour aligner leurs rangées.
 * Sans grille fixe, leur découpage est adaptatif : il se cale sur le premier
 * point rencontré, donc les scores 80 et 86 tombent dans la même rangée mais 79
 * et 86 non. Les rangées se déplacent alors avec les données, et deux recherches
 * ne se comparent plus à l'œil. Même raison que le domaine fixe de
 * `buildScoreBins` — et même valeur que son `binWidth` chez ses appelants, pour
 * que la chronologie et l'histogramme global aient la même résolution.
 */
export const SCORE_BAND = 5;

/** Nombre de bandes sur le domaine fixe [0, 100]. */
export const N_SCORE_BANDS = 100 / SCORE_BAND;

/**
 * Index de la bande où tombe `score` : 0 pour 0-5, … 19 pour 95-100.
 *
 * RENVOIE L'INDEX, ET NON LE CENTRE EN POINTS DE SCORE (2.5, 7.5, …), parce que
 * ses appelants placent leurs points en px et que la conversion doit rester
 * EXACTE. Deux bandes voisines sont espacées d'exactement une empreinte de
 * point : c'est le minimum qui les garde distinctes, donc la moindre erreur
 * d'arrondi les fait fusionner. Or passer par le centre impose un ×(1/100) qui
 * n'est pas représentable en binaire — mesuré : le centre 17.5 rendait 31.4999…
 * au lieu de 31.5, l'écart tombait sous le seuil, et deux bandes n'en faisaient
 * plus qu'une. Un index est un entier : `idx * pas` reste juste.
 *
 * Un score de 100 rejoint la dernière bande (95-100) au lieu d'en ouvrir une
 * 21e — même clamp que `buildScoreBins`.
 */
export function scoreBandIndex(score: number): number {
  const s = Math.max(0, Math.min(100, score));
  return Math.min(N_SCORE_BANDS - 1, Math.floor(s / SCORE_BAND));
}

export interface ScoreBin {
  start: number;
  end: number;
  /** Milieu du bin — c'est ce point qui alimente `scoreToColor`, jamais un palier. */
  center: number;
  count: number;
  scores: number[];
}

/**
 * Découpe le domaine FIXE [0, 100] en bins de largeur `binWidth`, et y range
 * `scores`. Les scores hors bornes sont clampés (défense en profondeur — le
 * contrat serveur garantit déjà 0-100, voir `SearchResult.score_pertinence`).
 */
export function buildScoreBins(scores: number[], binWidth: number): ScoreBin[] {
  const nBins = Math.ceil(100 / binWidth);
  const bins: ScoreBin[] = Array.from({ length: nBins }, (_, i) => {
    const start = i * binWidth;
    const end = Math.min(100, start + binWidth);
    return { start, end, center: (start + end) / 2, count: 0, scores: [] };
  });
  for (const raw of scores) {
    const s = Math.max(0, Math.min(100, raw));
    const idx = Math.min(bins.length - 1, Math.floor(s / binWidth));
    bins[idx].count++;
    bins[idx].scores.push(raw);
  }
  return bins;
}
