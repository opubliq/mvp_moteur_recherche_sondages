import type { CartItem } from "../context/CartContext";

export type ExportFormat = "csv-large" | "json";

/** Download côté client — partagé avec l'export des citations (`exportVerbatims`). */
export function triggerDownload(content: string | ArrayBuffer, filename: string, mime: string) {
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

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}
interface FileSystemWritableStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}
interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableStream>;
}
type ShowSaveFilePicker = (opts: SaveFilePickerOptions) => Promise<FileSystemFileHandleLike>;

/**
 * Sauvegarde côté client avec choix de l'emplacement ET du nom, via l'API File
 * System Access (Chrome/Edge) — l'utilisateur choisit où et sous quel nom.
 * Repli sur `triggerDownload` (dossier Téléchargements) sur les navigateurs
 * qui ne l'exposent pas (Firefox, Safari) ou si l'utilisateur annule.
 */
export async function saveFile(content: string | ArrayBuffer, suggestedName: string, mime: string): Promise<void> {
  const picker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker;
  if (picker) {
    const ext = suggestedName.includes(".") ? `.${suggestedName.split(".").pop()}` : "";
    try {
      const handle = await picker({
        suggestedName,
        types: ext ? [{ description: "Fichier", accept: { [mime]: [ext] } }] : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([content], { type: mime }));
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // annulé par l'utilisateur
      // toute autre erreur (ex. navigateur qui expose l'API mais la casse) : repli silencieux
    }
  }
  triggerDownload(content, suggestedName, mime);
}

/** Échappe une valeur pour un champ CSV (RFC 4180). */
export function csvCell(value: string | number | null): string {
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
export async function exportCart(items: CartItem[], format: ExportFormat, filename?: string): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    await saveFile(JSON.stringify(items, null, 2), filename || `opubliq-export-${stamp}.json`, "application/json");
  } else {
    // BOM UTF-8 pour ouverture correcte des accents dans Excel.
    await saveFile("﻿" + toCsvLarge(items), filename || `opubliq-export-${stamp}.csv`, "text/csv;charset=utf-8");
  }
}
