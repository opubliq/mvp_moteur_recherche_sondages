import type { Workbook, Worksheet } from "exceljs";
import type { CartItem } from "../context/CartContext";
import type { CrosstabRow, DistributionRow, SearchResult } from "../types";
import { fetchMicrodata, fetchSurvey, NoMicrodataError } from "../api";
import { triggerDownload } from "./exportCart";

/** Catégories socio-démo canoniques (cf. `sociodemo_type`, `QuestionDashboard.tsx`). */
export const DEMO_TYPES: { key: string; label: string }[] = [
  { key: "age", label: "Âge" },
  { key: "gender", label: "Genre" },
  { key: "region", label: "Région" },
  { key: "education", label: "Scolarité" },
  { key: "income", label: "Revenu" },
  { key: "language", label: "Langue" },
  { key: "occupation", label: "Occupation" },
];

/** Nom de feuille Excel : 31 caractères max, sans `[]:*?/\`, dédupliqué. */
function makeSheetName(base: string, used: Set<string>): string {
  const clean = base.replace(/[[\]:*?/\\]/g, "_").slice(0, 31) || "Feuille";
  let name = clean;
  let n = 2;
  while (used.has(name)) {
    const suffix = `_${n++}`;
    name = clean.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name);
  return name;
}

/** Meilleure variable socio-démo d'un type donné dans un sondage (même heuristique que le dashboard : 2-20 options préférées). */
function pickSociodemoVar(questions: SearchResult[], type: string): SearchResult | undefined {
  const candidates = questions.filter((q) => q.is_sociodemo && q.sociodemo_type === type);
  if (candidates.length === 0) return undefined;
  return candidates
    .map((q) => {
      const n = q.response_options.length;
      const band = n < 2 ? 2 : n > 20 ? 1 : 0;
      return { q, band, n };
    })
    .sort((a, b) => a.band - b.band || a.n - b.n)[0].q;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface CrosstabKeyParts {
  item: CartItem;
  dimVar: string;
  dimQuestion: SearchResult;
}
const crosstabKey = (surveyId: string, variable: string, dimVar: string) => `${surveyId}::${variable}::${dimVar}`;

/** Écrit un tableau croisé lisible (catégories cible en lignes, catégories dim en colonnes) à partir de `startRow`. Retourne la prochaine ligne libre. */
function writeCrosstabBlock(
  sheet: Worksheet,
  startRow: number,
  title: string,
  subtitle: string,
  targetOptions: { code: string | number; label: string }[],
  dimOptions: { code: string | number; label: string }[],
  rows: CrosstabRow[],
): number {
  sheet.getCell(`A${startRow}`).value = title;
  sheet.getCell(`A${startRow}`).font = { bold: true };
  sheet.getCell(`A${startRow + 1}`).value = subtitle;
  sheet.getCell(`A${startRow + 1}`).font = { italic: true, color: { argb: "FF666666" } };

  const byCell = new Map(rows.map((r) => [`${r.dim_code}::${r.target_code}`, r]));
  const totalByDim = new Map<string, number>();
  for (const r of rows) {
    totalByDim.set(String(r.dim_code), (totalByDim.get(String(r.dim_code)) ?? 0) + r.weighted_n);
  }

  const headerRow = startRow + 2;
  const header = sheet.getRow(headerRow);
  header.getCell(1).value = "";
  dimOptions.forEach((d, i) => {
    header.getCell(2 + i).value = d.label;
  });
  header.font = { bold: true };

  targetOptions.forEach((t, ti) => {
    const row = sheet.getRow(headerRow + 1 + ti);
    row.getCell(1).value = t.label;
    dimOptions.forEach((d, di) => {
      const cell = byCell.get(`${d.code}::${t.code}`);
      const c = row.getCell(2 + di);
      c.value = cell ? cell.col_share : 0;
      c.numFmt = "0.0%";
    });
  });

  const nRow = sheet.getRow(headerRow + 1 + targetOptions.length);
  nRow.getCell(1).value = "N pondéré";
  nRow.font = { italic: true };
  dimOptions.forEach((d, di) => {
    nRow.getCell(2 + di).value = Math.round(totalByDim.get(String(d.code)) ?? 0);
  });

  return headerRow + targetOptions.length + 3;
}

/**
 * Construit et télécharge un classeur Excel pour la sélection du panier (bead
 * f3i.13) : Sommaire, une feuille "Distributions" (toutes les questions,
 * format long), une feuille par socio-démo cochée (croise les questions
 * sélectionnées de tous les sondages sur cette dimension), et une feuille par
 * sondage (ses questions sélectionnées × tous ses socio-démos disponibles).
 * Tout est PONDÉRÉ, via `/microdata` (cœur `microdata-core/core.ts`) — repli
 * codebook explicite si le sondage n'a pas de micro-données ingérées.
 */
export async function exportCartXlsx(
  items: CartItem[],
  demoTypes: string[] = [],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const ExcelJSRuntime = await import("exceljs");
  const wb: Workbook = new ExcelJSRuntime.Workbook();
  wb.creator = "Opubliq";
  wb.created = new Date();

  let done = 0;
  const surveyIds = [...new Set(items.map((it) => it.survey_id))];
  // Approximation du total (les crosstabs par sondage ne sont connus qu'après
  // la résolution des socio-démos disponibles) — affinée dès que possible.
  let total = surveyIds.length + items.length;
  const bump = () => onProgress?.(++done, total);

  // 1) Résout les questions complètes de chaque sondage (nécessaire pour retrouver
  // les variables socio-démo — le panier ne contient que les questions cochées).
  const surveyQuestions = new Map<string, SearchResult[]>();
  await mapLimit(surveyIds, 4, async (sid) => {
    try {
      const res = await fetchSurvey(sid);
      surveyQuestions.set(sid, res.questions);
    } catch {
      surveyQuestions.set(sid, []);
    } finally {
      bump();
    }
  });

  // 2) Résout, par sondage, la meilleure variable pour chaque type socio-démo canonique.
  const demoVarBySurvey = new Map<string, Map<string, SearchResult>>();
  for (const sid of surveyIds) {
    const qs = surveyQuestions.get(sid) ?? [];
    const m = new Map<string, SearchResult>();
    for (const t of DEMO_TYPES) {
      const v = pickSociodemoVar(qs, t.key);
      if (v) m.set(t.key, v);
    }
    demoVarBySurvey.set(sid, m);
  }

  // 3) Liste les crosstabs nécessaires : union des types cochés (sheets "Âge", etc.,
  // tous sondages confondus) et des socio-démos par défaut de chaque sondage
  // (sheet par sondage). Une paire (question, variable dim) n'est calculée qu'une fois.
  const neededCrosstabs = new Map<string, CrosstabKeyParts>();
  for (const item of items) {
    const demos = demoVarBySurvey.get(item.survey_id) ?? new Map();
    for (const [, dimQuestion] of demos) {
      const key = crosstabKey(item.survey_id, item.variable, dimQuestion.variable);
      if (!neededCrosstabs.has(key)) neededCrosstabs.set(key, { item, dimVar: dimQuestion.variable, dimQuestion });
    }
  }
  total = surveyIds.length + items.length + neededCrosstabs.size;

  // 4) Distributions univariées pondérées (une par item).
  const distByItem = new Map<string, DistributionRow[] | null>();
  await mapLimit(items, 4, async (item) => {
    try {
      const res = await fetchMicrodata<DistributionRow>({ surveyId: item.survey_id, target: item.variable, agg: "count" });
      distByItem.set(item.variable + "::" + item.survey_id, res.rows);
    } catch (err) {
      distByItem.set(item.variable + "::" + item.survey_id, null);
      if (!(err instanceof NoMicrodataError)) {
        console.error(`[export] distribution ${item.survey_id}/${item.variable} échouée`, err);
      }
    } finally {
      bump();
    }
  });

  // 5) Crosstabs pondérés (union calculée en 3).
  const crossResults = new Map<string, CrosstabRow[] | null>();
  await mapLimit([...neededCrosstabs.entries()], 4, async ([key, parts]) => {
    try {
      const res = await fetchMicrodata<CrosstabRow>({
        surveyId: parts.item.survey_id,
        target: parts.item.variable,
        dim: parts.dimVar,
        agg: "count",
      });
      crossResults.set(key, res.rows);
    } catch (err) {
      crossResults.set(key, null);
      if (!(err instanceof NoMicrodataError)) {
        console.error(`[export] crosstab ${key} échoué`, err);
      }
    } finally {
      bump();
    }
  });

  // --- Construction des feuilles (déterministe, à partir des données en cache) ---
  const usedNames = new Set<string>();

  const summary = wb.addWorksheet(makeSheetName("Sommaire", usedNames));
  summary.columns = [
    { header: "Sondage", key: "survey_name", width: 32 },
    { header: "Année", key: "survey_year", width: 8 },
    { header: "Maison de sondage", key: "pollster", width: 20 },
    { header: "Variable", key: "variable", width: 16 },
    { header: "Question", key: "question_text", width: 60 },
    { header: "Micro-données", key: "microdata", width: 14 },
  ];
  summary.getRow(1).font = { bold: true };
  for (const item of items) {
    summary.addRow({
      survey_name: item.survey_name,
      survey_year: item.survey_year ?? "",
      pollster: item.pollster ?? "",
      variable: item.variable,
      question_text: item.question_text,
      microdata: distByItem.get(item.variable + "::" + item.survey_id) ? "Oui" : "Non",
    });
  }

  // Feuille "Distributions" : toutes les questions, format long (pivotable).
  const dist = wb.addWorksheet(makeSheetName("Distributions", usedNames));
  dist.columns = [
    { header: "Sondage", key: "survey_name", width: 28 },
    { header: "Année", key: "survey_year", width: 8 },
    { header: "Variable", key: "variable", width: 14 },
    { header: "Question", key: "question_text", width: 45 },
    { header: "Code", key: "code", width: 8 },
    { header: "Réponse", key: "label", width: 40 },
    { header: "N pondéré", key: "weighted_n", width: 12 },
    { header: "% pondéré", key: "share", width: 12 },
    { header: "N brut", key: "raw_n", width: 10 },
    { header: "Note", key: "note", width: 30 },
  ];
  dist.getRow(1).font = { bold: true };
  for (const item of items) {
    const rows = distByItem.get(item.variable + "::" + item.survey_id);
    const base = { survey_name: item.survey_name, survey_year: item.survey_year ?? "", variable: item.variable, question_text: item.question_text };
    if (rows) {
      const labelByCode = new Map(item.response_options.map((o) => [String(o.code), o.label]));
      for (const r of rows) {
        const row = dist.addRow({
          ...base,
          code: r.target_code,
          label: labelByCode.get(String(r.target_code)) ?? "",
          weighted_n: Math.round(r.weighted_n),
          share: r.share,
          raw_n: r.raw_n,
          note: "",
        });
        row.getCell("share").numFmt = "0.0%";
      }
    } else {
      for (const o of item.response_options) {
        dist.addRow({ ...base, code: o.code, label: o.label, weighted_n: "", share: "", raw_n: "", note: "Micro-données non disponibles pour ce sondage (codebook seul)" });
      }
    }
  }

  // Feuilles par socio-démo cochée : croise TOUTES les questions sélectionnées sur cette dimension.
  for (const t of demoTypes) {
    const demoLabel = DEMO_TYPES.find((d) => d.key === t)?.label ?? t;
    const blocks = items
      .map((item) => {
        const dimQuestion = demoVarBySurvey.get(item.survey_id)?.get(t);
        if (!dimQuestion) return { item, available: false as const };
        const key = crosstabKey(item.survey_id, item.variable, dimQuestion.variable);
        const rows = crossResults.get(key);
        return { item, available: true as const, dimQuestion, rows };
      });
    if (!blocks.some((b) => b.available && b.rows)) continue; // aucune donnée pour ce type, on n'ajoute pas la feuille

    const sheet = wb.addWorksheet(makeSheetName(demoLabel, usedNames));
    sheet.getColumn(1).width = 42;
    let row = 1;
    for (const b of blocks) {
      const title = `${b.item.question_text}`;
      const subtitle = `${b.item.survey_name}${b.item.survey_year ? ` (${b.item.survey_year})` : ""}`;
      if (!b.available) {
        sheet.getCell(`A${row}`).value = title;
        sheet.getCell(`A${row}`).font = { bold: true };
        sheet.getCell(`A${row + 1}`).value = `${subtitle} — socio-démo « ${demoLabel} » non disponible pour ce sondage.`;
        sheet.getCell(`A${row + 1}`).font = { italic: true, color: { argb: "FF999999" } };
        row += 3;
        continue;
      }
      if (!b.rows) {
        sheet.getCell(`A${row}`).value = title;
        sheet.getCell(`A${row}`).font = { bold: true };
        sheet.getCell(`A${row + 1}`).value = `${subtitle} — micro-données indisponibles pour ce sondage.`;
        sheet.getCell(`A${row + 1}`).font = { italic: true, color: { argb: "FF999999" } };
        row += 3;
        continue;
      }
      row = writeCrosstabBlock(sheet, row, title, subtitle, b.item.response_options, b.dimQuestion.response_options, b.rows);
    }
  }

  // Feuilles par sondage : ses questions sélectionnées × tous ses socio-démos disponibles.
  for (const sid of surveyIds) {
    const surveyItems = items.filter((it) => it.survey_id === sid);
    const demos = demoVarBySurvey.get(sid) ?? new Map();
    if (demos.size === 0) continue; // rien à croiser pour ce sondage

    const sheet = wb.addWorksheet(makeSheetName(surveyItems[0].survey_name || sid, usedNames));
    sheet.getColumn(1).width = 42;
    let row = 1;
    for (const item of surveyItems) {
      for (const [demoKey, dimQuestion] of demos) {
        const key = crosstabKey(sid, item.variable, dimQuestion.variable);
        const rows = crossResults.get(key);
        const demoLabel = DEMO_TYPES.find((d) => d.key === demoKey)?.label ?? demoKey;
        if (!rows) {
          sheet.getCell(`A${row}`).value = `${item.question_text} × ${demoLabel}`;
          sheet.getCell(`A${row}`).font = { bold: true };
          sheet.getCell(`A${row + 1}`).value = "Micro-données indisponibles pour ce sondage.";
          sheet.getCell(`A${row + 1}`).font = { italic: true, color: { argb: "FF999999" } };
          row += 3;
          continue;
        }
        row = writeCrosstabBlock(sheet, row, `${item.question_text} × ${demoLabel}`, "", item.response_options, dimQuestion.response_options, rows);
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(
    buffer as ArrayBuffer,
    `opubliq-export-${stamp}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
