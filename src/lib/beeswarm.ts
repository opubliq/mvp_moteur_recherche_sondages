/**
 * Packing d'un beeswarm : place des points le long d'un axe principal (ici
 * toujours le score de pertinence 0-100) en RANGÉES SYMÉTRIQUES de part et
 * d'autre de l'axe.
 *
 * DÉTERMINISTE À DESSEIN : le décalage est une fonction pure des valeurs triées.
 * Jamais de `Math.random()` — un nuage qui saute à chaque rendu (survol,
 * ouverture d'une année, changement de seuil) suggérerait que la donnée a bougé
 * alors qu'elle est identique.
 *
 * FORME : rangées symétriques, pas placement glouton. Une première version
 * posait chaque point au premier emplacement libre le plus proche du centre, en
 * gardant sa position exacte sur l'axe principal. Résultat : les décalages
 * n'avaient aucune régularité d'un point au suivant, et le nuage se lisait comme
 * du jitter — le défaut même qu'on voulait corriger. Un beeswarm ne se contente
 * pas d'éviter les chevauchements : il ORGANISE les points autour de l'axe, et
 * c'est cette symétrie qui rend la densité lisible.
 *
 * CE QUE ÇA COÛTE. Grouper en rangées quantise la position sur l'axe principal :
 * les points d'une même rangée s'alignent sur son ancre. C'est le compromis
 * classique du dot plot, et c'est un artefact de RENDU, pas une catégorie —
 * l'ancre est une vraie valeur des données (le premier point de la rangée), la
 * résolution ne dépend que de la taille des points, et aucun seuil sémantique
 * n'apparaît. À ne pas confondre avec les paliers exact/partiel/faible rejetés
 * par l'éval golden (voir `src/lib/scoreColor.ts`) : ici rien n'est nommé, rien
 * n'est compté par tranche, et le score exact reste porté par la couleur et le
 * tooltip.
 *
 * QUAND ÇA NE RENTRE PLUS. À largeur de colonne donnée, une rangée n'accepte
 * qu'un nombre fini de points — au-delà, aucun placement n'est honnête. Plutôt
 * que de resserrer les points jusqu'à la bouillie, une rangée peut être REPLIÉE
 * en un jeton portant son compte (voir `collapsedSize`) : le nombre est écrit
 * plutôt qu'encodé dans une largeur qu'on vient d'écraser.
 *
 * Les deux axes sont dans la MÊME unité (des px chez les appelants) : deux
 * points se touchent quand leurs centres sont à `diameter` l'un de l'autre, donc
 * mélanger px et % ferait des ronds ovales et un packing faux. `diameter` doit
 * inclure TOUTE l'empreinte peinte d'un point, bordure comprise — une bordure
 * posée en `ring`/box-shadow déborde du disque et recouvrirait le voisin.
 */

export interface SwarmPoint<T> {
  item: T;
  /** Décalage sur l'axe transverse, centré sur 0 (peut être négatif). */
  offset: number;
}

export interface SwarmRow<T> {
  /** Position de la rangée sur l'axe principal, dans l'unité rendue par
   * `mainOf`. Commune à toute la rangée : c'est la valeur de son ancre, pas
   * celle de chaque point. */
  main: number;
  /** Les points À DESSINER, dans l'ordre de l'axe transverse. Avec un `token`,
   * c'est le RESTE : les questions que le jeton ne compte pas. */
  points: SwarmPoint<T>[];
  /**
   * Présent quand la rangée ne tient pas à cette largeur : l'appelant dessine un
   * jeton portant `count` à `offset` sur l'axe transverse, plus les `points`.
   *
   * `token.count + points.length` = le nombre de questions de la rangée, TOUJOURS.
   * Les deux ensembles sont disjoints — un point dessiné n'est jamais compté
   * dans le jeton, sinon la rangée mentirait sur son volume.
   */
  token?: { count: number; offset: number };
}

/**
 * Arrondi du compte d'un jeton, quand `quantum` est demandé (voir `packSwarm`).
 * 5 comme la largeur de bande de `src/lib/scoreBins.ts` : les deux graphes
 * doivent s'accorder, un lecteur qui apprend la règle sur l'un la retrouve sur
 * l'autre.
 */
export const TOKEN_QUANTUM = 5;

/** Avance d'un chiffre en `tabular-nums`, en fraction de la taille de police (Inter). */
const DIGIT_ADVANCE = 0.6;

/**
 * Diamètre minimal d'un jeton rond portant `digits` chiffres à `fontPx`, marge
 * comprise.
 *
 * LE TEXTE EST UN RECTANGLE DANS UN CERCLE : c'est sa DIAGONALE qui doit tenir,
 * pas sa largeur. Dimensionner sur la largeur laisse les chiffres sortir par les
 * côtés, parce que la corde du cercle à la hauteur du texte est plus courte que
 * son diamètre — mesuré : « 20 » à 8px fait 9.6px de large, mais un jeton de
 * 12px n'offre que 8.9px de corde à cette hauteur-là. Les chiffres dépassaient.
 *
 * Deux chiffres suffisent en pratique (un jeton porte un multiple de 5 borné par
 * le nombre de questions d'une bande), mais le paramètre reste explicite : un
 * corpus plus gros passerait à trois sans que personne ne s'en aperçoive.
 */
export function tokenDiameter(digits: number, fontPx: number): number {
  return Math.ceil(Math.hypot(digits * DIGIT_ADVANCE * fontPx, fontPx)) + 2;
}

/**
 * Range les points en rangées le long de l'axe principal, puis étale chaque
 * rangée symétriquement autour du centre.
 *
 * `diameter` = distance minimale tolérée entre deux centres (diamètre du point
 * + le blanc qu'on veut entre deux voisins). Il fixe aussi la hauteur d'une
 * rangée, donc la résolution du nuage sur l'axe principal.
 *
 * `maxOffset` borne le nuage à la largeur de sa colonne.
 *
 * `collapsedSize` — si fourni, une rangée qui ne tient pas dans `maxOffset` est
 * REPLIÉE (elle reçoit un `token`) au lieu d'être comprimée, et l'appelant y
 * dessine un jeton portant le compte. `collapsedSize` est la place que ce jeton
 * prend sur l'axe principal ; étant plus gros qu'un point, il mordrait ses
 * rangées voisines, donc celles qu'il recouvre sont FUSIONNÉES dedans (leurs
 * questions s'ajoutent au compte). Sans `collapsedSize`, une rangée trop peuplée
 * est comprimée : ses points se resserrent jusqu'à se chevaucher, mais restent
 * centrés et symétriques. La compression convient à une vignette (la forme
 * générale suffit) ; le repli convient dès que la couleur d'un point doit
 * rester lisible.
 *
 * `quantum` — si fourni, le jeton ne porte que le plus grand multiple de
 * `quantum` de la rangée, et le RESTE est rendu en points à côté de lui : 21 se
 * lit « 20 » + un point, 19 se lit « 15 » + quatre points. Le compte reste
 * exact — le jeton ne compte jamais un point dessiné.
 *
 * LE RESTE EST TOUJOURS DESSINÉ, même s'il dépasse `maxOffset`. Une première
 * version le repliait dans le jeton quand il ne tenait pas (« 19 » au lieu de
 * « 15 » + 4) : la règle devenait alors imprévisible, deux comptes voisins se
 * rendant différemment selon la largeur (21 → « 20 » + un point, mais 23 →
 * « 23 »). Le reste fait au plus `quantum - 1` points, donc son débordement est
 * borné et petit — mesuré à moins d'un px sur 16 colonnes en pleine largeur.
 * L'appelant qui a un VRAI mur (une vignette, où déborder écrirait par-dessus
 * autre chose) doit se dimensionner pour l'accepter, pas compter là-dessus.
 */
export function packSwarm<T>(
  items: readonly T[],
  mainOf: (item: T) => number,
  opts: { diameter: number; maxOffset?: number; collapsedSize?: number; quantum?: number },
): SwarmRow<T>[] {
  const { diameter, maxOffset, collapsedSize, quantum } = opts;

  // Tri par position sur l'axe principal : les rangées se constituent de proche
  // en proche, et l'ordre du tableau d'entrée n'a aucune raison de suivre l'axe.
  // `index` départage les ex æquo pour que le tri reste déterministe.
  const sorted = items
    .map((item, index) => ({ item, index, main: mainOf(item) }))
    .sort((a, b) => a.main - b.main || a.index - b.index);

  // Découpage en rangées « dot density » : un point rejoint la rangée courante
  // tant qu'il est à moins d'un diamètre de son ancre, sinon il en ouvre une
  // nouvelle. Les ancres sont donc espacées d'au moins `diameter` — deux rangées
  // de points ne peuvent pas se toucher, quels que soient leurs décalages.
  const bins: Array<{ main: number; items: T[] }> = [];
  for (const p of sorted) {
    const bin = bins[bins.length - 1];
    if (bin && p.main - bin.main < diameter) bin.items.push(p.item);
    else bins.push({ main: p.main, items: [p.item] });
  }

  /** La rangée tient-elle dans la colonne à l'écartement idéal ? */
  const fits = (n: number) =>
    n <= 1 || maxOffset === undefined || (n - 1) * diameter <= 2 * maxOffset;

  // Repli + fusion. Une rangée repliée occupe `collapsedSize` sur l'axe au lieu
  // de `diameter` : on avale les rangées voisines qu'elle recouvrirait. Fusionner
  // ne fait qu'ajouter des questions, donc une rangée repliée le reste — la
  // boucle termine.
  // `lo`/`hi` = les ancres extrêmes fusionnées dans la rangée ; elle est rendue
  // au MILIEU de cette étendue. Un jeton posé sur l'ancre du haut porterait le
  // meilleur score de sa bande alors qu'il en représente toute la largeur —
  // il surestimerait les questions qu'il replie.
  const folded: Array<{ lo: number; hi: number; items: T[]; collapsed: boolean }> = [];
  const mid = (r: { lo: number; hi: number }) => (r.lo + r.hi) / 2;
  for (const bin of bins) {
    let cur = { lo: bin.main, hi: bin.main, items: bin.items, collapsed: false };
    if (collapsedSize !== undefined) {
      cur.collapsed = !fits(cur.items.length);
      const halfOf = (r: typeof cur) => (r.collapsed ? collapsedSize : diameter) / 2;
      let prev = folded[folded.length - 1];
      while (prev && mid(cur) - mid(prev) < halfOf(prev) + halfOf(cur)) {
        folded.pop();
        cur = { lo: prev.lo, hi: cur.hi, items: [...prev.items, ...cur.items], collapsed: true };
        prev = folded[folded.length - 1];
      }
    }
    folded.push(cur);
  }

  /**
   * Étendue transverse d'une rangée à jeton : le jeton, puis `rem` points.
   * Le jeton VIENT EN PREMIER (à gauche d'un nuage vertical, en haut d'un nuage
   * horizontal) — un jeton posé au milieu de son propre reste forcerait l'œil à
   * additionner de part et d'autre, alors qu'en tête il se lit « 15, puis 4 ».
   */
  const spanOf = (rem: number) => collapsedSize! + rem * diameter;
  /**
   * Le groupe reste CENTRÉ SUR L'AXE, comme n'importe quelle rangée de points :
   * seul l'ordre interne change, pas l'alignement. Une rangée calée sur le bord
   * se lirait comme appartenant à la colonne voisine, et son débordement
   * éventuel partirait entièrement du même côté.
   *
   * Ne dépend donc pas de `maxOffset` : un centrage est intrinsèque à la rangée.
   */
  const tokenOffset = (rem: number) => -spanOf(rem) / 2 + collapsedSize! / 2;
  /** i-ème point du reste : à la suite du jeton, un diamètre par point. */
  const afterToken = (rem: number, i: number) =>
    -spanOf(rem) / 2 + collapsedSize! + diameter / 2 + i * diameter;

  return folded.map((row): SwarmRow<T> => {
    const n = row.items.length;

    if (row.collapsed) {
      // Le reste (n % quantum) se dessine en points ; le jeton porte le multiple.
      // `count > 0` écarte le cas où la rangée entière est plus courte qu'un
      // quantum : un jeton « 0 » suivi de tous ses points serait absurde, et
      // plus large que le jeton exact.
      const rem = quantum ? n % quantum : 0;
      const count = n - rem;
      if (rem > 0 && count > 0) {
        return {
          main: mid(row),
          token: { count, offset: tokenOffset(rem) },
          // Les points du reste sont pris dans l'ordre de l'axe principal : à
          // l'intérieur d'une rangée les scores sont voisins par construction,
          // donc aucun point n'a de titre particulier à sortir du jeton — seul
          // compte le fait que le choix soit déterministe.
          points: row.items.slice(0, rem).map((item, i) => ({ item, offset: afterToken(rem, i) })),
        };
      }
      // Sans reste, le jeton est seul : centré, comme un point seul le serait.
      return { main: mid(row), token: { count: n, offset: tokenOffset(0) }, points: [] };
    }

    // Écartement idéal = un diamètre ; sinon on resserre juste assez pour tenir.
    const spacing =
      n > 1 && maxOffset !== undefined && !fits(n)
        ? (2 * maxOffset) / (n - 1)
        : diameter;
    // Rangée centrée sur 0 : un point seul reste sur l'axe, deux points
    // s'écartent à ±spacing/2, et ainsi de suite.
    const start = -((n - 1) / 2) * spacing;
    return {
      main: mid(row),
      points: row.items.map((item, i) => ({ item, offset: start + i * spacing })),
    };
  });
}
