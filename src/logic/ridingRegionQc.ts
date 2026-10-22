/**
 * Table de correspondance circonscription fédérale québécoise (`fedname`,
 * découpage 2013 Representation Order) → région(s) administrative(s) du
 * Québec (17 régions, découpage ISQ/MAMH).
 *
 * SOURCE DE VÉRITÉ : `ingestion/geo/riding_region_qc.py` (table construite et
 * sourcée côté ingestion — Élections Canada, ISQ, commissions de délimitation).
 * `ridingRegionQc.generated.ts` est un EXPORT mécanique de ce dict Python,
 * jamais édité à la main : régénérer avec
 *   `uv run python -c "import json; from ingestion.geo.riding_region_qc import RIDING_TO_REGION; print('export const RIDING_TO_REGION_QC_DATA: Record<string, string | string[]> = ' + json.dumps(RIDING_TO_REGION, ensure_ascii=False, indent=2) + ';')" > src/logic/ridingRegionQc.generated.ts`
 * si la table Python change (TS plutôt que JSON : évite d'ajouter
 * `resolveJsonModule` aux deux tsconfig qui compilent ce module — frontend
 * Vite ET azure-functions).
 *
 * Sert au tool-use de l'agent (`riding_lookup`, agent.ts) pour traduire une
 * région administrative en langage naturel ("Mauricie") en la liste des
 * valeurs RAW de `fedname` à passer en filtre `crosstab` — `fedname` n'ayant
 * aucun `response_options` (variable texte), ce mapping ne peut PAS venir de
 * `get_survey`. Variable `fedname` présente sur ces_2021, ces_2025, eeq_2022
 * uniquement (cf. ingestion/surveys/*.py, SOCIODEMO_VARS).
 */

import { RIDING_TO_REGION_QC_DATA } from "./ridingRegionQc.generated";

export const RIDING_LOOKUP_TOOL_NAME = "riding_lookup";

/** `fedname` (ou alias verbatim raw, cf. module Python) → région(s) administrative(s). */
export const RIDING_TO_REGION_QC: Record<string, string | string[]> = RIDING_TO_REGION_QC_DATA;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Les 17 régions administratives qui apparaissent dans la table (dédupliquées, ordre d'apparition). */
export const REGIONS_ADMINISTRATIVES_QC: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of Object.values(RIDING_TO_REGION_QC)) {
    for (const r of Array.isArray(v) ? v : [v]) {
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
    }
  }
  return out;
})();

/** Région(s) administrative(s) d'une circonscription (`fedname` exact ou normalisé), ou `null` si inconnue. */
export function regionsForRiding(fedname: string): string[] | null {
  const direct = RIDING_TO_REGION_QC[fedname];
  if (direct) return Array.isArray(direct) ? direct : [direct];
  const target = norm(fedname);
  for (const [key, val] of Object.entries(RIDING_TO_REGION_QC)) {
    if (norm(key) === target) return Array.isArray(val) ? val : [val];
  }
  return null;
}

/**
 * Circonscriptions (valeurs RAW `fedname`, incluant les alias d'encodage —
 * cf. module Python) dont la région administrative recherchée fait partie des
 * régions associées. Recherche insensible à la casse/accents. `overlapping`
 * liste celles qui chevauchent une AUTRE région (pour que l'agent le signale).
 */
export function ridingsForRegion(region: string): { ridings: string[]; overlapping: string[] } {
  const target = norm(region);
  const ridings: string[] = [];
  const overlapping: string[] = [];
  for (const [fedname, val] of Object.entries(RIDING_TO_REGION_QC)) {
    const regions = Array.isArray(val) ? val : [val];
    if (regions.some((r) => norm(r) === target)) {
      ridings.push(fedname);
      if (regions.length > 1) overlapping.push(fedname);
    }
  }
  return { ridings, overlapping };
}
