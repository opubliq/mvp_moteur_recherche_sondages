import { cartKey, type CartItem } from "../context/CartContext";
import type { ConceptGroup } from "../context/ConceptContext";
import type { SociodemoMappings } from "../context/SociodemoMappingContext";
import { fetchMicrodataRaw, NoMicrodataError } from "../api";
import { DEMO_TYPES, mapLimit } from "../lib/exportExcel";
import { resolveDemoVarsForSurveys } from "./sociodemoResolve";
import type { DistributionRow, SearchResult } from "../types";

/** Pseudo-variable croisement dérivée des métadonnées (cf. AdvancedExportPage). */
export const YEAR_CROSSING_KEY = "__year__";

type RawRow = Record<string, number | string | null>;

/** Fetch des micro-données brutes par item, commun aux deux fonctions ci-dessous. */
async function fetchMappedRows(
  items: CartItem[],
  extraColumns: (item: CartItem) => string[],
): Promise<{ item: CartItem; rows: RawRow[] }[]> {
  const results: { item: CartItem; rows: RawRow[]; warning?: string }[] = [];
  await mapLimit(items, 6, async (item) => {
    const columns = [...new Set([item.variable, ...extraColumns(item)])];
    try {
      const res = await fetchMicrodataRaw(item.survey_id, columns);
      results.push({ item, rows: res.rows });
    } catch (err) {
      results.push({ item, rows: [] });
      if (!(err instanceof NoMicrodataError)) {
        console.error(`[concept] micro-données ${item.survey_id}/${item.variable} échouées`, err);
      }
    }
  });
  return results;
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
  const warnings: string[] = [];
  if (group.categories.length === 0) return { rows: [], warnings };

  const bundles = await fetchMappedRows(items, () => []);
  const totals = new Map<string, { weightedN: number; rawN: number }>();

  for (const { item, rows } of bundles) {
    const k = cartKey(item.survey_id, item.variable);
    const itemMapping = group.mapping[k] ?? {};
    if (rows.length === 0) {
      warnings.push(`Micro-données indisponibles pour « ${item.question_text} » (${item.survey_name}).`);
      continue;
    }
    for (const row of rows) {
      const code = row[item.variable];
      if (code === null || code === undefined) continue;
      const categoryId = itemMapping[String(code)];
      if (!categoryId) continue;
      const weight = typeof row.weight === "number" ? row.weight : 1;
      const prev = totals.get(categoryId) ?? { weightedN: 0, rawN: 0 };
      totals.set(categoryId, { weightedN: prev.weightedN + weight, rawN: prev.rawN + 1 });
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
 */
export async function computeConceptTable(
  group: ConceptGroup,
  items: CartItem[],
  crossingKey: string | null,
  sociodemoMappings?: SociodemoMappings,
): Promise<ConceptTableResult> {
  const warnings: string[] = [];
  if (group.categories.length === 0) {
    return { columns: [], rows: [], warnings: ["Aucune catégorie de sortie définie pour ce concept."] };
  }

  const groupByYear = crossingKey === YEAR_CROSSING_KEY;
  const demoKey = crossingKey && !groupByYear ? crossingKey : null;
  const demoMapping = demoKey ? sociodemoMappings?.[demoKey] : undefined;

  // 1) Questions complètes de chaque sondage (pour résoudre la variable socio-démo demandée).
  const surveyIds = [...new Set(items.map((it) => it.survey_id))];
  const demoVarBySurvey: Map<string, SearchResult | undefined> = demoKey
    ? await resolveDemoVarsForSurveys(surveyIds, demoKey)
    : new Map();
  if (demoKey) {
    for (const sid of surveyIds) {
      if (!demoVarBySurvey.get(sid)) {
        const label = DEMO_TYPES.find((d) => d.key === demoKey)?.label ?? demoKey;
        const surveyName = items.find((it) => it.survey_id === sid)?.survey_name ?? sid;
        warnings.push(`« ${label} » indisponible pour ${surveyName} — pas de croisement pour ce sondage.`);
      }
    }
    if (!demoMapping || demoMapping.categories.length === 0) {
      const label = DEMO_TYPES.find((d) => d.key === demoKey)?.label ?? demoKey;
      warnings.push(
        `Mapping socio-démo non défini pour « ${label} » — colonnes non harmonisées entre sondages (catégories natives brutes).`,
      );
    }
  }

  // 2) Micro-données brutes par item : la variable ciblée + la socio-démo résolue pour son sondage.
  const bundles = await fetchMappedRows(items, (item) => {
    const dimQuestion = demoVarBySurvey.get(item.survey_id);
    return dimQuestion ? [dimQuestion.variable] : [];
  });

  // 3) Agrégation : chaque répondant compte pour son poids dans (catégorie × colonne).
  const columnsByKey = new Map<string, ConceptTableColumn>();
  const totals = new Map<string, Map<string, { weightedN: number; rawN: number }>>(); // columnKey -> categoryId -> totals
  let excluded = 0;

  for (const { item, rows } of bundles) {
    if (rows.length === 0) {
      warnings.push(`Micro-données indisponibles pour « ${item.question_text} » (${item.survey_name}).`);
      continue;
    }
    const k = cartKey(item.survey_id, item.variable);
    const itemMapping = group.mapping[k] ?? {};
    const dimQuestion = demoVarBySurvey.get(item.survey_id);

    for (const row of rows) {
      const targetCode = row[item.variable];
      if (targetCode === null || targetCode === undefined) {
        excluded++;
        continue;
      }
      const categoryId = itemMapping[String(targetCode)];
      if (!categoryId) {
        excluded++;
        continue;
      }

      let comboKeyPart = "";
      let comboLabelPart = "";
      if (dimQuestion) {
        const raw = row[dimQuestion.variable];
        if (raw === null || raw === undefined) {
          excluded++;
          continue;
        }
        // Harmonisée si un mapping socio-démo (tjf.8) existe pour ce type ;
        // sinon replie sur la catégorie native brute de CE sondage.
        const harmonizedId = demoMapping?.mapping[item.survey_id]?.[String(raw)];
        if (demoMapping && demoMapping.categories.length > 0) {
          if (!harmonizedId) {
            excluded++;
            continue;
          }
          const catLabel = demoMapping.categories.find((c) => c.id === harmonizedId)?.label ?? harmonizedId;
          comboKeyPart = `|${harmonizedId}`;
          comboLabelPart = ` · ${catLabel}`;
        } else {
          const optLabel = dimQuestion.response_options.find((o) => String(o.code) === String(raw))?.label ?? String(raw);
          comboKeyPart = `|${raw}`;
          comboLabelPart = ` · ${optLabel}`;
        }
      }

      const baseKey = groupByYear ? `year:${item.survey_year ?? "n.d."}` : `survey:${item.survey_id}`;
      const columnKey = baseKey + comboKeyPart;
      if (!columnsByKey.has(columnKey)) {
        const baseLabel = groupByYear ? `${item.survey_year ?? "n.d."}` : `${item.survey_name} (${item.survey_year ?? "n.d."})`;
        columnsByKey.set(columnKey, { key: columnKey, label: baseLabel + comboLabelPart, surveyIds: [] });
      }
      const col = columnsByKey.get(columnKey)!;
      if (!col.surveyIds.includes(item.survey_id)) col.surveyIds.push(item.survey_id);

      const weight = typeof row.weight === "number" ? row.weight : 1;
      if (!totals.has(columnKey)) totals.set(columnKey, new Map());
      const byCategory = totals.get(columnKey)!;
      const prev = byCategory.get(categoryId) ?? { weightedN: 0, rawN: 0 };
      byCategory.set(categoryId, { weightedN: prev.weightedN + weight, rawN: prev.rawN + 1 });
    }
  }

  if (excluded > 0) {
    warnings.push(`${excluded} réponse${excluded > 1 ? "s" : ""} exclue${excluded > 1 ? "s" : ""} (non mappée${excluded > 1 ? "s" : ""} ou socio-démo manquante).`);
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
