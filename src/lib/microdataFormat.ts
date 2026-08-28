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

// Sentinelles numériques classiques de refus/NSP (y compris codes négatifs de sondage comme -99, -98, -999).
const SENTINELS = new Set([
  -9999, -9998, -999, -998, -99, -98, -97, -96, -95, -9, -8, -7, -1,
  98, 99, 998, 999, 9998, 9999, 997,
]);

// Codes négatifs par défaut à toujours inclure comme refus/missing (utilisés dans les échelles et continus sans response_options)
const DEFAULT_NEGATIVE_REFUSALS = [-9999, -9998, -999, -998, -99, -98, -97, -96, -95, -9, -8, -7, -1];

// Motifs de libellé de non-réponse.
const REFUSAL_RE =
  /refus|nsp|ne sais|ne le\/la conna|pr[ée]f[èe]re ne pas|sans opinion|pas de r[ée]ponse|n\/a|aucun|don't know|know\/haven|refused|not applicable|skipped|no response/i;

/**
 * Codes de refus/NSP d'une variable, à exclure des MOYENNES et échelles (sinon un -99 ou 999 fait
 * exploser la moyenne d'une échelle). Détectés par libellé, complétés par les
 * sentinelles numériques (y compris codes négatifs de sondage).
 */
export function refusalCodes(options: ResponseOption[] = []): (string | number)[] {
  const out = new Set<string | number>();

  // Pour les échelles et variables continues (où options est souvent vide ou ne liste pas les sentinelles négatives),
  // inclure par défaut les sentinelles négatives courantes.
  for (const neg of DEFAULT_NEGATIVE_REFUSALS) {
    out.add(neg);
  }

  for (const o of options) {
    if (REFUSAL_RE.test(o.label)) out.add(o.code);
    const n = Number(o.code);
    if (Number.isFinite(n) && (SENTINELS.has(n) || n < 0)) {
      out.add(o.code);
    }
  }
  return [...out];
}
