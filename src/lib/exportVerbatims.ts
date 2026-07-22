import type { SearchResult, Verbatim, VerbatimSociodemo } from "../types";
import { csvCell, triggerDownload, type ExportFormat } from "./exportCart";

/** Colonnes sociodémo de l'export CSV, dans un ordre stable. */
const SOCIODEMO_COLUMNS: (keyof VerbatimSociodemo)[] = [
  "gender",
  "age",
  "education",
  "income",
  "region",
  "language",
  "occupation",
];

/**
 * Export des citations sélectionnées (bead jsu.4).
 *
 * SÉPARÉ du panier d'export : le panier collecte des QUESTIONS à travers le
 * corpus (`CartItem`), alors qu'ici on emporte des RÉPONSES d'une seule
 * question. Mélanger les deux dans `exportCart` donnerait un CSV aux colonnes
 * incompatibles. La machinerie de download, elle, est partagée.
 *
 * Le contexte de la question voyage avec les citations : une réponse libre
 * hors de sa question ne veut rien dire.
 */
export function exportVerbatims(
  items: Verbatim[],
  q: Pick<SearchResult, "survey_id" | "survey_name" | "survey_year" | "variable" | "question_text" | "display_label">,
  format: ExportFormat,
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `opubliq-citations-${q.survey_id}-${q.variable}-${stamp}`;

  if (format === "json") {
    const payload = {
      survey_id: q.survey_id,
      survey_name: q.survey_name,
      survey_year: q.survey_year,
      variable: q.variable,
      question_text: q.question_text,
      display_label: q.display_label ?? null,
      verbatims: items.map((v) => ({
        respondent_id: v.respondent_id,
        text: v.text,
        score_pertinence: v.score_pertinence ?? null,
        ...v.sociodemo,
      })),
    };
    triggerDownload(JSON.stringify(payload, null, 2), `${base}.json`, "application/json");
    return;
  }

  const headers = [
    "survey_id",
    "survey_name",
    "variable",
    "question_text",
    "respondent_id",
    "text",
    "score_pertinence",
    ...SOCIODEMO_COLUMNS,
  ];
  // La sociodémo va TOUJOURS dans l'export, même si la liste n'en montre que
  // trois repères : un rapport cite « une femme de 45-54 ans en Ontario », et
  // recouper l'occupation ou la scolarité après coup ne doit pas obliger à
  // relancer une extraction.
  const rows = items.map((v) =>
    [
      q.survey_id,
      q.survey_name,
      q.variable,
      q.question_text,
      v.respondent_id,
      v.text,
      v.score_pertinence ?? "",
      ...SOCIODEMO_COLUMNS.map((c) => v.sociodemo?.[c] ?? ""),
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM UTF-8 pour ouverture correcte des accents dans Excel.
  triggerDownload("﻿" + [headers.join(","), ...rows].join("\n"), `${base}.csv`, "text/csv;charset=utf-8");
}
