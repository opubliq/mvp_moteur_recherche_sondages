import type { SearchResult } from "../types";

/**
 * Prédicat verbatim — le SEUL endroit où il est défini côté front.
 *
 * `var_type === "open"` ne suffit pas : il signifie « colonne string », ce qui
 * couvre aussi des réponses d'un mot (`short`) et des colonnes vides (`empty`).
 * Les nombres stockés en string sont, eux, déjà requalifiés `continuous` à
 * l'ingestion. Cf. `ingestion/SCHEMA.md` § text_kind.
 */
export function isVerbatim(q: Pick<SearchResult, "var_type" | "text_kind">): boolean {
  return q.var_type === "open" && q.text_kind === "prose";
}
