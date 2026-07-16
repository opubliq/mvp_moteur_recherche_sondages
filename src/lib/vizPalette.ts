/**
 * Palette catégorielle des microdonnées — segments de barres empilées / séries.
 *
 * Validée avec le script dataviz (`validate_palette.js`, mode light) : bande de
 * clarté OK, chroma ≥ 0.1, séparation CVD dans la bande 6–8 (légale UNIQUEMENT
 * avec encodage secondaire → on met des gaps 2px + labels directs), plancher
 * normal-vision ≥ 15. Ancrée sur l'identité Opubliq (teal primary + coral).
 *
 * Ordre FIXE, jamais cyclé : au-delà de 6 catégories on replie sur « Autre »
 * (gris) — cf. non-négociables dataviz.
 */

export const CATEGORICAL: readonly string[] = [
  "#0d9488", // teal (primary)
  "#ef6a5a", // coral (secondary)
  "#5b6bd6", // indigo
  "#b7791f", // ambre
  "#3f9e6b", // vert
  "#a85fb0", // prune
] as const;

/** Gris neutre pour le repli « Autre » (jamais une teinte de la palette). */
export const OTHER_COLOR = "#9aa0a6";

/** Nombre max de catégories distinctes avant repli sur « Autre ». */
export const MAX_CATEGORIES = CATEGORICAL.length;

/** Couleur d'une catégorie par son rang FIXE (l'entité, pas son ampleur). */
export function categoryColor(index: number): string {
  return index < CATEGORICAL.length ? CATEGORICAL[index] : OTHER_COLOR;
}
