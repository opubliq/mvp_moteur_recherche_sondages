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

export interface RampStep {
  color: string;
  dark: boolean; // texte foncé requis (segment clair)
}

/**
 * Rampe SÉQUENTIELLE (une teinte, clair→foncé) pour les variables ORDINALES
 * (Likert, échelle) : l'ampleur perçue suit l'ordre des niveaux, pas des couleurs
 * catégorielles arbitraires. Teinte teal Opubliq. Plage de clarté LARGE + chroma
 * qui monte vers le foncé pour bien distinguer les niveaux. Renvoie aussi le flag
 * `dark` (texte foncé sur les paliers clairs, pour le contraste).
 */
export function sequentialRamp(n: number): RampStep[] {
  const H = 196.4;
  const Lhi = 0.92; // niveau le plus clair (premier niveau de l'échelle)
  const Llo = 0.36; // niveau le plus foncé (dernier niveau)
  const Chi = 0.05; // chroma au clair
  const Clo = 0.14; // chroma au foncé
  if (n <= 1) return [{ color: `oklch(0.58 0.11 ${H})`, dark: false }];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const L = Lhi + (Llo - Lhi) * t;
    const C = Chi + (Clo - Chi) * t;
    return { color: `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H})`, dark: L > 0.6 };
  });
}
