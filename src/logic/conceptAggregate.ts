import type { Worksheet } from "exceljs";
import { cartKey, type CartItem } from "../context/CartContext";
import type { ConceptGroup } from "../context/ConceptContext";
import type { SociodemoMappings } from "../context/SociodemoMappingContext";
import { fetchMicrodata, NoMicrodataError } from "../api";
import { DEMO_TYPES, mapLimit, makeSheetName } from "../lib/exportExcel";
import { saveFile } from "../lib/exportCart";
import { resolveDemoVarsForSurveys } from "./sociodemoResolve";
import type { DistributionRow, SearchResult } from "../types";

/** Pseudo-variable croisement dérivée des métadonnées (cf. AdvancedExportPage). */
export const YEAR_CROSSING_KEY = "__year__";

/**
 * Agrégat SERVEUR d'un item (bead 9ou.6) : Σ poids et n brut par code cible
 * (× code de la socio-démo si croisement), calculés par `/microdata` en
 * `agg: "count"` — sur TOUS les répondants du Parquet. L'ancien chemin
 * rapatriait les lignes via `/microdata-raw`, plafonné à 20 000 lignes sans
 * signal : ces_2019_online (37 822), ces_2021, ces_2025, cecd_vote_qc_2007_2010
 * étaient silencieusement tronqués.
 *
 * Le mapping code → catégorie de sortie reste appliqué ICI, côté client, sur
 * ces sommes par code : Σ_{répondants de la catégorie} w = Σ_{codes mappés}
 * (Σ_{répondants du code} w), donc strictement équivalent au calcul ligne par
 * ligne. `cells === null` : micro-données indisponibles pour cet item.
 */
export interface AggregatedCell {
  target_code: number | string;
  dim_code?: number | string;
  weighted_n: number;
  raw_n: number;
}

export interface ItemAggregate {
  item: CartItem;
  /** Variable socio-démo croisée (absente = pas de croisement pour ce sondage). */
  dimVariable?: string;
  cells: AggregatedCell[] | null;
}

async function fetchItemAggregates(
  items: CartItem[],
  dimVariableFor: (item: CartItem) => string | undefined,
): Promise<ItemAggregate[]> {
  const results: ItemAggregate[] = [];
  await mapLimit(items, 6, async (item) => {
    const dimVariable = dimVariableFor(item);
    try {
      const res = await fetchMicrodata<AggregatedCell>({
        surveyId: item.survey_id,
        target: item.variable,
        dim: dimVariable,
        agg: "count",
        // Le mapping de l'utilisateur décide si un code de refus (-99…) compte :
        // pas d'exclusion d'office, comme l'ancien chemin ligne par ligne.
        includeSentinels: true,
      });
      results.push({ item, dimVariable, cells: res.rows });
    } catch (err) {
      results.push({ item, dimVariable, cells: null });
      if (!(err instanceof NoMicrodataError)) {
        console.error(`[concept] micro-données ${item.survey_id}/${item.variable} échouées`, err);
      }
    }
  });
  // mapLimit termine dans le désordre : rétablir l'ordre des items (avertissements stables).
  return items.map((it) => results.find((r) => r.item === it)!);
}

/**
 * Normalisation des poids par item (bead 9ou.7). Les `__weight` des Parquet
 * gardent l'échelle native de chaque sondage (ingestion/microdata.py) : moyenne
 * ≈ 1 pour la plupart, mais ≈ 6 pour cecd_charte_2013_10 et
 * cecd_vote_qc_2007_2010 (poids d'extrapolation). Cumulés tels quels dans une
 * colonne multi-sondages (fusion par année, total du concept), ces sondages
 * pèseraient ~6× trop.
 *
 * Choix : ramener les poids à MOYENNE 1 au sein de chaque item, sur ses
 * répondants valides (ceux qui entrent dans la table : code cible mappé et,
 * le cas échéant, socio-démo présente/mappée). Facteur = n brut / Σ poids ;
 * après correction Σ poids = n brut du sondage. Chaque sondage pèse donc au
 * prorata de son nombre de répondants valides, et sa répartition interne
 * (les parts) est inchangée — une constante multiplicative s'annule dans un
 * ratio. Le « N pondéré » affiché devient ainsi comparable entre sondages.
 */
export function weightNormalizationFactor(cells: { weightedN: number; rawN: number }[]): number {
  const sumW = cells.reduce((s, c) => s + c.weightedN, 0);
  const sumN = cells.reduce((s, c) => s + c.rawN, 0);
  return sumW > 0 ? sumN / sumW : 1;
}

function unavailableWarning(item: CartItem): string {
  return `Micro-données indisponibles pour « ${item.question_text} » (${item.survey_name}).`;
}

/**
 * Cœur pur de `computeConceptTotals` : total pondéré (poids normalisés par
 * sondage, cf. `weightNormalizationFactor`) par catégorie de sortie, tous
 * sondages confondus.
 */
export function buildConceptTotals(
  group: ConceptGroup,
  aggregates: ItemAggregate[],
): { rows: DistributionRow[]; warnings: string[] } {
  const warnings: string[] = [];
  if (group.categories.length === 0) return { rows: [], warnings };
  const totals = new Map<string, { weightedN: number; rawN: number }>();

  for (const { item, cells } of aggregates) {
    if (!cells || cells.length === 0) {
      warnings.push(unavailableWarning(item));
      continue;
    }
    const itemMapping = group.mapping[cartKey(item.survey_id, item.variable)] ?? {};
    const valid: { categoryId: string; weightedN: number; rawN: number }[] = [];
    for (const cell of cells) {
      if (cell.target_code === null || cell.target_code === undefined) continue;
      const categoryId = itemMapping[String(cell.target_code)];
      if (!categoryId) continue;
      valid.push({ categoryId, weightedN: cell.weighted_n, rawN: cell.raw_n });
    }
    const factor = weightNormalizationFactor(valid);
    for (const v of valid) {
      const prev = totals.get(v.categoryId) ?? { weightedN: 0, rawN: 0 };
      totals.set(v.categoryId, { weightedN: prev.weightedN + v.weightedN * factor, rawN: prev.rawN + v.rawN });
    }
  }

  const grandTotal = [...totals.values()].reduce((s, v) => s + v.weightedN, 0);
  const rows: DistributionRow[] = group.categories.map((c) => {
    const t = totals.get(c.id);
    return {
      target_code: c.id,
      weighted_n: t?.weightedN ?? 0,
      raw_n: t?.rawN ?? 0,
      share: t && grandTotal > 0 ? t.weightedN / grandTotal : 0,
    };
  });
  return { rows, warnings };
}

/**
 * Total pondéré par catégorie de sortie, tous sondages du concept confondus,
 * sans aucun croisement — vérification rapide que le mapping (tjf.3) produit
 * une répartition sensée, sans attendre un export.
 */
export async function computeConceptTotals(
  group: ConceptGroup,
  items: CartItem[],
): Promise<{ rows: DistributionRow[]; warnings: string[] }> {
  if (group.categories.length === 0) return { rows: [], warnings: [] };
  const aggregates = await fetchItemAggregates(items, () => undefined);
  return buildConceptTotals(group, aggregates);
}

export interface ConceptTableColumn {
  key: string;
  label: string;
  surveyIds: string[];
}

export interface ConceptTableCell {
  weightedN: number;
  rawN: number;
  share: number; // 0..1, part de cette catégorie dans la colonne
}

export interface ConceptTableRow {
  categoryId: string;
  categoryLabel: string;
  cells: Record<string, ConceptTableCell>; // keyed by column key
}

export interface ConceptTableResult {
  columns: ConceptTableColumn[];
  rows: ConceptTableRow[];
  warnings: string[];
}

export interface BuildConceptTableOptions {
  crossingKey: string | null;
  /** Question socio-démo résolue par sondage (croisement socio-démo seulement). */
  demoVarBySurvey?: Map<string, SearchResult | undefined>;
  sociodemoMappings?: SociodemoMappings;
}

/**
 * Cœur pur de `computeConceptTable` : agrège les cellules serveur de chaque
 * item en (catégorie de sortie × colonne), poids normalisés par sondage
 * (`weightNormalizationFactor`, 9ou.7) avant tout cumul multi-sondages.
 */
export function buildConceptTable(
  group: ConceptGroup,
  aggregates: ItemAggregate[],
  opts: BuildConceptTableOptions,
): ConceptTableResult {
  const warnings: string[] = [];
  const { crossingKey, sociodemoMappings } = opts;
  const demoVarBySurvey: Map<string, SearchResult | undefined> = opts.demoVarBySurvey ?? new Map();
  const groupByYear = crossingKey === YEAR_CROSSING_KEY;
  const demoKey = crossingKey && !groupByYear ? crossingKey : null;
  const demoMapping = demoKey ? sociodemoMappings?.[demoKey] : undefined;
  const harmonized = !!demoMapping && demoMapping.categories.length > 0;

  const columnsByKey = new Map<string, ConceptTableColumn>();
  const totals = new Map<string, Map<string, { weightedN: number; rawN: number }>>(); // columnKey -> categoryId -> totals
  let excluded = 0;

  for (const { item, dimVariable, cells } of aggregates) {
    if (!cells || cells.length === 0) {
      warnings.push(unavailableWarning(item));
      continue;
    }
    const itemMapping = group.mapping[cartKey(item.survey_id, item.variable)] ?? {};
    const dimQuestion = dimVariable ? demoVarBySurvey.get(item.survey_id) : undefined;

    // 1) Cellules valides de l'item, avec leur colonne et leur catégorie.
    const valid: { columnKey: string; columnLabel: string; categoryId: string; weightedN: number; rawN: number }[] = [];
    for (const cell of cells) {
      const categoryId = cell.target_code === null || cell.target_code === undefined ? undefined : itemMapping[String(cell.target_code)];
      if (!categoryId) {
        excluded += cell.raw_n;
        continue;
      }

      let comboKeyPart = "";
      let comboLabelPart = "";
      if (dimQuestion) {
        const raw = cell.dim_code;
        if (raw === null || raw === undefined) {
          excluded += cell.raw_n;
          continue;
        }
        // Harmonisée si un mapping socio-démo (tjf.8) existe pour ce type ;
        // sinon replie sur la catégorie native brute de CE sondage.
        if (harmonized) {
          const harmonizedId = demoMapping!.mapping[item.survey_id]?.[String(raw)];
          if (!harmonizedId) {
            excluded += cell.raw_n;
            continue;
          }
          const catLabel = demoMapping!.categories.find((c) => c.id === harmonizedId)?.label ?? harmonizedId;
          comboKeyPart = `|${harmonizedId}`;
          comboLabelPart = ` · ${catLabel}`;
        } else {
          const optLabel = dimQuestion.response_options.find((o) => String(o.code) === String(raw))?.label ?? String(raw);
          comboKeyPart = `|${raw}`;
          comboLabelPart = ` · ${optLabel}`;
        }
      }

      const baseKey = groupByYear ? `year:${item.survey_year ?? "n.d."}` : `survey:${item.survey_id}`;
      const baseLabel = groupByYear ? `${item.survey_year ?? "n.d."}` : `${item.survey_name} (${item.survey_year ?? "n.d."})`;
      valid.push({
        columnKey: baseKey + comboKeyPart,
        columnLabel: baseLabel + comboLabelPart,
        categoryId,
        weightedN: cell.weighted_n,
        rawN: cell.raw_n,
      });
    }

    // 2) Poids ramenés à moyenne 1 dans ce sondage, PUIS cumul par colonne.
    const factor = weightNormalizationFactor(valid);
    for (const v of valid) {
      if (!columnsByKey.has(v.columnKey)) {
        columnsByKey.set(v.columnKey, { key: v.columnKey, label: v.columnLabel, surveyIds: [] });
      }
      const col = columnsByKey.get(v.columnKey)!;
      if (!col.surveyIds.includes(item.survey_id)) col.surveyIds.push(item.survey_id);

      if (!totals.has(v.columnKey)) totals.set(v.columnKey, new Map());
      const byCategory = totals.get(v.columnKey)!;
      const prev = byCategory.get(v.categoryId) ?? { weightedN: 0, rawN: 0 };
      byCategory.set(v.categoryId, { weightedN: prev.weightedN + v.weightedN * factor, rawN: prev.rawN + v.rawN });
    }
  }

  if (excluded > 0) {
    warnings.push(`${excluded} réponse${excluded > 1 ? "s" : ""} exclue${excluded > 1 ? "s" : ""} (non mappée${excluded > 1 ? "s" : ""} ou socio-démo non mappée).`);
  }

  const columns = [...columnsByKey.values()].sort((a, b) => a.label.localeCompare(b.label, "fr-CA"));

  const rows: ConceptTableRow[] = group.categories.map((c) => ({ categoryId: c.id, categoryLabel: c.label, cells: {} }));
  for (const col of columns) {
    const byCategory = totals.get(col.key) ?? new Map();
    const colTotal = [...byCategory.values()].reduce((s, v) => s + v.weightedN, 0);
    for (const row of rows) {
      const t = byCategory.get(row.categoryId);
      row.cells[col.key] = {
        weightedN: t?.weightedN ?? 0,
        rawN: t?.rawN ?? 0,
        share: t && colTotal > 0 ? t.weightedN / colTotal : 0,
      };
    }
  }

  return { columns, rows, warnings };
}

/**
 * Cœur computationnel de l'exportation avancée (bead tjf.5) : combine le
 * concept groupé (tjf.2), le mapping de catégories par question (tjf.3) et
 * UNE variable de croisement (tjf.4) en une table de distributions pondérées,
 * alignée par sondage/année. Cocher plusieurs variables de croisement produit
 * plusieurs sections indépendantes (un appel par variable), pas un croisement
 * combiné — sur des sous-échantillons de sondage, combiner plusieurs
 * dimensions à la fois vide les cellules (n minuscules, illisible).
 *
 * `crossingKey` à `null` : pas de croisement, une colonne par sondage/année
 * (alignement de base). `YEAR_CROSSING_KEY` : une colonne par année,
 * fusionnant les sondages qui la partagent. Une clé de `DEMO_TYPES` : une
 * colonne par (sondage × catégorie de sortie harmonisée de cette socio-démo),
 * via `sociodemoMappings` (tjf.8) — sans mapping défini pour ce type, replie
 * sur la catégorie native brute (colonnes non harmonisées entre sondages).
 *
 * Agrégation côté serveur sur TOUS les répondants (9ou.6), poids normalisés
 * par sondage avant cumul (9ou.7) — cf. `ItemAggregate`, `weightNormalizationFactor`.
 */
export async function computeConceptTable(
  group: ConceptGroup,
  items: CartItem[],
  crossingKey: string | null,
  sociodemoMappings?: SociodemoMappings,
): Promise<ConceptTableResult> {
  if (group.categories.length === 0) {
    return { columns: [], rows: [], warnings: ["Aucune catégorie de sortie définie pour ce concept."] };
  }

  const warnings: string[] = [];
  const groupByYear = crossingKey === YEAR_CROSSING_KEY;
  const demoKey = crossingKey && !groupByYear ? crossingKey : null;
  const demoMapping = demoKey ? sociodemoMappings?.[demoKey] : undefined;

  // 1) Questions complètes de chaque sondage (pour résoudre la variable socio-démo demandée).
  const surveyIds = [...new Set(items.map((it) => it.survey_id))];
  const demoVarBySurvey: Map<string, SearchResult | undefined> = demoKey
    ? await resolveDemoVarsForSurveys(surveyIds, demoKey)
    : new Map();
  if (demoKey) {
    const label = DEMO_TYPES.find((d) => d.key === demoKey)?.label ?? demoKey;
    for (const sid of surveyIds) {
      if (!demoVarBySurvey.get(sid)) {
        const surveyName = items.find((it) => it.survey_id === sid)?.survey_name ?? sid;
        warnings.push(`« ${label} » indisponible pour ${surveyName} — pas de croisement pour ce sondage.`);
      }
    }
    if (!demoMapping || demoMapping.categories.length === 0) {
      warnings.push(
        `Mapping socio-démo non défini pour « ${label} » — colonnes non harmonisées entre sondages (catégories natives brutes).`,
      );
    }
  }

  // 2) Agrégats serveur par item : la variable ciblée (× la socio-démo résolue pour son sondage).
  const aggregates = await fetchItemAggregates(items, (item) => demoVarBySurvey.get(item.survey_id)?.variable);

  // 3) Mapping + normalisation + cumul (pur, testé).
  const result = buildConceptTable(group, aggregates, { crossingKey, demoVarBySurvey, sociodemoMappings });
  return { ...result, warnings: [...warnings, ...result.warnings] };
}

function crossingLabel(crossingKey: string | null): string {
  if (crossingKey === null) return "";
  if (crossingKey === YEAR_CROSSING_KEY) return "Année";
  return DEMO_TYPES.find((d) => d.key === crossingKey)?.label ?? crossingKey;
}

/** Écrit une table de concept (catégories de sortie en lignes, colonnes de croisement en colonnes) sur une feuille dédiée. */
function writeConceptTableSheet(sheet: Worksheet, groupLabel: string, crossKeyLabel: string, result: ConceptTableResult): void {
  sheet.getCell("A1").value = groupLabel;
  sheet.getCell("A1").font = { bold: true, size: 12 };
  sheet.getCell("A2").value = crossKeyLabel ? `Croisé par : ${crossKeyLabel}` : "Aucun croisement (une colonne par sondage)";
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

  const headerRow = sheet.getRow(4);
  result.columns.forEach((col, i) => {
    headerRow.getCell(2 + i).value = col.label;
  });
  headerRow.font = { bold: true };

  result.rows.forEach((row, ri) => {
    const excelRow = sheet.getRow(5 + ri);
    excelRow.getCell(1).value = row.categoryLabel;
    result.columns.forEach((col, ci) => {
      const cell = row.cells[col.key];
      const c = excelRow.getCell(2 + ci);
      c.value = cell?.share ?? 0;
      c.numFmt = "0.0%";
    });
  });

  const nRow = sheet.getRow(5 + result.rows.length);
  nRow.getCell(1).value = "N pondéré (poids normalisés par sondage)";
  nRow.font = { italic: true };
  result.columns.forEach((col, ci) => {
    const total = result.rows.reduce((s, row) => s + (row.cells[col.key]?.weightedN ?? 0), 0);
    nRow.getCell(2 + ci).value = Math.round(total);
  });

  sheet.getColumn(1).width = 30;
  result.columns.forEach((_, i) => {
    sheet.getColumn(2 + i).width = 22;
  });

  if (result.warnings.length > 0) {
    let r = 7 + result.rows.length;
    sheet.getCell(`A${r}`).value = "Avertissements";
    sheet.getCell(`A${r}`).font = { bold: true };
    r++;
    for (const w of result.warnings) {
      sheet.getCell(`A${r}`).value = w;
      sheet.getCell(`A${r}`).font = { italic: true, color: { argb: "FF999999" } };
      r++;
    }
  }
}

/**
 * Construit et télécharge le classeur Excel de l'exportation avancée (bead
 * tjf.6) : une feuille par (concept × variable de croisement cochée),
 * réutilisant `computeConceptTable` (tjf.5). Sans aucune variable cochée, une
 * seule feuille par concept (colonnes = sondage/année, alignement de base).
 * Ignore silencieusement les concepts sans catégorie de sortie ou avec moins
 * de deux questions — rien à croiser.
 */
export async function exportAdvancedXlsx(
  groups: ConceptGroup[],
  groupItems: Map<string, CartItem[]>,
  crossing: Set<string>,
  sociodemoMappings: SociodemoMappings,
  onProgress?: (done: number, total: number) => void,
  filename?: string,
): Promise<{ warnings: string[] }> {
  const exportGroups = groups.filter((g) => g.categories.length > 0 && (groupItems.get(g.id)?.length ?? 0) >= 2);
  const crossingKeys: (string | null)[] = crossing.size > 0 ? [...crossing] : [null];
  if (exportGroups.length === 0) {
    return { warnings: ["Aucun concept avec catégories de sortie et au moins deux questions — rien à exporter."] };
  }

  const ExcelJSRuntime = await import("exceljs");
  const wb = new ExcelJSRuntime.Workbook();
  wb.creator = "Opubliq";
  wb.created = new Date();

  let done = 0;
  const total = exportGroups.length * crossingKeys.length;
  const bump = () => onProgress?.(++done, total);

  const usedNames = new Set<string>();
  const warnings: string[] = [];

  for (const group of exportGroups) {
    const items = groupItems.get(group.id) ?? [];
    for (const crossKey of crossingKeys) {
      const result = await computeConceptTable(group, items, crossKey, sociodemoMappings);
      bump();
      const label = crossingLabel(crossKey);
      const sheet = wb.addWorksheet(makeSheetName(label ? `${group.label} · ${label}` : group.label, usedNames));
      writeConceptTableSheet(sheet, group.label, label, result);
      warnings.push(...result.warnings.map((w) => `${group.label}${label ? ` · ${label}` : ""} : ${w}`));
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  await saveFile(
    buffer as ArrayBuffer,
    filename || `opubliq-export-avance-${stamp}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  return { warnings };
}
