import { fetchSurvey } from "../api";
import { pickSociodemoVar } from "../lib/exportExcel";
import type { SearchResult } from "../types";

/**
 * Pour chaque sondage, résout sa variable native d'un type socio-démo donné
 * (ex: "age") — partagé entre le moteur d'agrégation (conceptAggregate.ts) et
 * le panneau de mapping socio-démo (AdvancedExportPage.tsx) pour éviter deux
 * implémentations de la même heuristique.
 */
export async function resolveDemoVarsForSurveys(
  surveyIds: string[],
  demoKey: string,
): Promise<Map<string, SearchResult | undefined>> {
  const result = new Map<string, SearchResult | undefined>();
  await Promise.all(
    surveyIds.map(async (sid) => {
      try {
        const qs = (await fetchSurvey(sid)).questions;
        result.set(sid, pickSociodemoVar(qs, demoKey));
      } catch {
        result.set(sid, undefined);
      }
    }),
  );
  return result;
}
