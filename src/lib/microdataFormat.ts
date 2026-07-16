/** Helpers de formatage & mapping code→label pour les graphes de microdonnées. */

import type { ResponseOption } from "../types";

/** Map code(string)→label depuis les response_options du catalogue AI Search. */
export function labelMap(options: ResponseOption[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const o of options) m.set(String(o.code), o.label);
  return m;
}

/** Label d'un code ; repli sur le code brut si absent du catalogue. */
export function codeLabel(map: Map<string, string>, code: number | string): string {
  return map.get(String(code)) ?? String(code);
}

/** % lisible à partir d'une part 0..1. */
export function formatPct(share: number, digits = 0): string {
  return `${(share * 100).toFixed(digits)} %`;
}

/** Entier avec séparateur FR (espaces insécables). */
export function formatN(n: number): string {
  return Math.round(n).toLocaleString("fr-CA");
}

/** Moyenne à 1 décimale. */
export function formatMean(m: number): string {
  return m.toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Sentinelles numériques classiques de refus/NSP (échelles 0–10, 0–100, codes 2 ch.).
const SENTINELS = new Set([98, 99, 998, 999, 9998, 9999, 997]);
// Motifs de libellé de non-réponse.
const REFUSAL_RE =
  /refus|nsp|ne sais|ne le\/la conna|pr[ée]f[èe]re ne pas|sans opinion|pas de r[ée]ponse|n\/a|aucun/i;

/**
 * Codes de refus/NSP d'une variable, à exclure des MOYENNES (sinon un 999 fait
 * exploser la moyenne d'une échelle). Détectés par libellé, complétés par les
 * sentinelles numériques. Ce sont des réponses RAW valides pour une
 * distribution : on ne les masque QUE pour les moyennes (ou sur demande UI).
 */
export function refusalCodes(options: ResponseOption[]): (string | number)[] {
  const out = new Set<string | number>();
  for (const o of options) {
    if (REFUSAL_RE.test(o.label)) out.add(o.code);
    const n = Number(o.code);
    if (Number.isFinite(n) && SENTINELS.has(n)) out.add(o.code);
  }
  return [...out];
}
