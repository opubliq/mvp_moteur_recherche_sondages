import type { CartItem } from "../context/CartContext";
import type { DistributionRow } from "../types";
import { fetchMicrodata, NoMicrodataError } from "../api";
import { triggerDownload } from "./exportCart";

/** Nom de feuille Excel : 31 caractères max, sans `[]:*?/\`. */
function sheetName(item: CartItem, used: Set<string>): string {
  const base = `${item.survey_id}_${item.variable}`.replace(/[[\]:*?/\\]/g, "_").slice(0, 31);
  let name = base || "Question";
  let n = 2;
  while (used.has(name)) {
    const suffix = `_${n++}`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name);
  return name;
}

/**
 * Construit et télécharge un classeur Excel pour la sélection du panier : un
 * onglet sommaire + un onglet par question. Quand le sondage a des
 * micro-données (bead f3i.13), l'onglet contient la distribution PONDÉRÉE
 * réelle (réutilise `/microdata`, cœur `microdata-core/core.ts`) — sinon,
 * repli sur le codebook (code/libellé) avec une note explicite.
 */
export async function exportCartXlsx(items: CartItem[]): Promise<void> {
  // Chargée à la demande : exceljs pèse ~500 kB et ne sert qu'à ce seul export.
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Opubliq";
  wb.created = new Date();

  const summary = wb.addWorksheet("Sommaire");
  summary.columns = [
    { header: "Sondage", key: "survey_name", width: 32 },
    { header: "Année", key: "survey_year", width: 8 },
    { header: "Maison de sondage", key: "pollster", width: 20 },
    { header: "Variable", key: "variable", width: 16 },
    { header: "Question", key: "question_text", width: 60 },
    { header: "Micro-données", key: "microdata", width: 14 },
  ];
  summary.getRow(1).font = { bold: true };

  const usedNames = new Set<string>();

  for (const item of items) {
    const sheet = wb.addWorksheet(sheetName(item, usedNames));
    sheet.mergeCells("A1:E1");
    sheet.getCell("A1").value = item.question_text;
    sheet.getCell("A1").font = { bold: true, size: 12 };
    sheet.getCell("A2").value = `${item.survey_name}${item.survey_year ? ` (${item.survey_year})` : ""}${item.pollster ? ` · ${item.pollster}` : ""}`;
    sheet.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

    let rows: DistributionRow[] | null = null;
    let noteRow3: string | null = null;
    try {
      const res = await fetchMicrodata<DistributionRow>({ surveyId: item.survey_id, target: item.variable, agg: "count" });
      rows = res.rows;
    } catch (err) {
      if (!(err instanceof NoMicrodataError)) {
        // Erreur inattendue (réseau, 5xx) : on tombe quand même sur le codebook,
        // mais on le signale distinctement d'une absence de micro-données.
        noteRow3 = `Distribution indisponible (erreur) : ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    const hasMicrodata = rows !== null;
    if (noteRow3) {
      sheet.getCell("A3").value = noteRow3;
      sheet.getCell("A3").font = { color: { argb: "FFB00020" } };
    }

    if (rows) {
      const labelByCode = new Map(item.response_options.map((o) => [String(o.code), o.label]));
      const header = sheet.getRow(4);
      header.values = ["Code", "Réponse", "N pondéré", "% pondéré", "N brut"];
      header.font = { bold: true };
      rows.forEach((r, i) => {
        const row = sheet.getRow(5 + i);
        row.values = [
          r.target_code,
          labelByCode.get(String(r.target_code)) ?? "",
          Math.round(r.weighted_n),
          r.share,
          r.raw_n,
        ];
        row.getCell(4).numFmt = "0.0%";
      });
      sheet.columns = [{ width: 10 }, { width: 45 }, { width: 12 }, { width: 12 }, { width: 10 }];
    } else {
      const headerRowIdx = noteRow3 ? 5 : 4;
      sheet.getCell(`A${headerRowIdx - 1}`).value =
        "Distribution non disponible : micro-données non ingérées pour ce sondage. Codebook ci-dessous.";
      sheet.getCell(`A${headerRowIdx - 1}`).font = { italic: true };
      const header = sheet.getRow(headerRowIdx);
      header.values = ["Code", "Réponse"];
      header.font = { bold: true };
      item.response_options.forEach((o, i) => {
        sheet.getRow(headerRowIdx + 1 + i).values = [o.code, o.label];
      });
      sheet.columns = [{ width: 10 }, { width: 55 }];
    }

    summary.addRow({
      survey_name: item.survey_name,
      survey_year: item.survey_year ?? "",
      pollster: item.pollster ?? "",
      variable: item.variable,
      question_text: item.question_text,
      microdata: hasMicrodata ? "Oui" : "Non",
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(
    buffer as ArrayBuffer,
    `opubliq-export-${stamp}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
