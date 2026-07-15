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
