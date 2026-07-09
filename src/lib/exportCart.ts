import type { CartItem } from "../context/CartContext";

export type ExportFormat = "csv-large" | "json";

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Échappe une valeur pour un champ CSV (RFC 4180). */
function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsvLarge(items: CartItem[]): string {
  const headers = ["survey_id", "survey_name", "survey_year", "pollster", "variable", "question_text", "response_options"];
  const rows = items.map((it) =>
    [
      it.survey_id,
      it.survey_name,
      it.survey_year,
      it.pollster,
      it.variable,
      it.question_text,
      it.response_options.map((o) => `${o.code}=${o.label}`).join(" | "),
    ].map(csvCell).join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

/** Exporte les questions du panier dans le format demandé (download côté client). */
export function exportCart(items: CartItem[], format: ExportFormat) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    triggerDownload(JSON.stringify(items, null, 2), `opubliq-export-${stamp}.json`, "application/json");
  } else {
    // BOM UTF-8 pour ouverture correcte des accents dans Excel.
    triggerDownload("﻿" + toCsvLarge(items), `opubliq-export-${stamp}.csv`, "text/csv;charset=utf-8");
  }
}
