/**
 * Export d'un run d'annotation (bead jsu.6).
 *
 * Les annotations sont ÉPHÉMÈRES par décision du bead : ce fichier est la seule
 * façon de conserver un run. Il porte donc la CONSIGNE avec les résultats —
 * propriété, étiquettes proposées, modèle, date. Une colonne d'étiquettes sans
 * la question qui l'a produite est inexploitable trois semaines plus tard, et
 * indéfendable dans un rapport.
 *
 * Séparé de `exportVerbatims` : là on emporte des citations, ici une variable
 * dérivée. Les colonnes ne sont pas les mêmes, la machinerie de download si.
 */

import type { CrosstabRow, SearchResult, Verbatim, VerbatimSociodemo } from "../types";
import { codeLabel, labelMap } from "./microdataFormat";
import type { Annotation } from "../logic/annotate";
import { csvCell, triggerDownload, type ExportFormat } from "./exportCart";

const SOCIODEMO_COLUMNS: (keyof VerbatimSociodemo)[] = [
  "gender",
  "age",
  "education",
  "income",
  "region",
  "language",
  "occupation",
];

export interface AnnotationExport {
  property: string;
  options: string[];
  model: string;
  rows: Verbatim[];
  annotations: Map<string, Annotation>;
}

export function exportAnnotations(
  payload: AnnotationExport,
  q: Pick<SearchResult, "survey_id" | "survey_name" | "survey_year" | "variable" | "question_text" | "display_label">,
  format: ExportFormat,
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `opubliq-annotations-${q.survey_id}-${q.variable}-${stamp}`;
  // Seules les réponses effectivement annotées partent : une ligne vide se
  // lirait comme une catégorie, alors que c'est un paquet en échec.
  const annotated = payload.rows.filter((v) => payload.annotations.has(v.id));

  if (format === "json") {
    triggerDownload(
      JSON.stringify(
        {
          survey_id: q.survey_id,
          survey_name: q.survey_name,
          survey_year: q.survey_year,
          variable: q.variable,
          question_text: q.question_text,
          display_label: q.display_label ?? null,
          annotation: {
            property: payload.property,
            options: payload.options,
            model: payload.model,
            annotated_at: new Date().toISOString(),
            n: annotated.length,
          },
          responses: annotated.map((v) => ({
            respondent_id: v.respondent_id,
            text: v.text,
            label: payload.annotations.get(v.id)!.label,
            reason: payload.annotations.get(v.id)!.reason ?? null,
            ...v.sociodemo,
          })),
        },
        null,
        2,
      ),
      `${base}.json`,
      "application/json",
    );
    return;
  }

  const headers = [
    "survey_id",
    "variable",
    "question_text",
    "propriete_annotee",
    "respondent_id",
    "text",
    "label",
    "justification",
    ...SOCIODEMO_COLUMNS,
  ];
  const rows = annotated.map((v) => {
    const a = payload.annotations.get(v.id)!;
    return [
      q.survey_id,
      q.variable,
      q.question_text,
      payload.property,
      v.respondent_id,
      v.text,
      a.label,
      a.reason ?? "",
      ...SOCIODEMO_COLUMNS.map((c) => v.sociodemo?.[c] ?? ""),
    ]
      .map(csvCell)
      .join(",");
  });

  // BOM UTF-8 : sans lui, Excel massacre les accents des étiquettes.
  triggerDownload("﻿" + [headers.join(","), ...rows].join("\n"), `${base}.csv`, "text/csv;charset=utf-8");
}

/**
 * Export d'un croisement annotation × variable (bead jsu.7).
 *
 * CSV seulement : c'est un tableau de contingence, il va dans un tableur. Les
 * codes de la dimension sont RÉSOLUS EN LIBELLÉS ici — un fichier qui dit
 * « dim_code 3 » oblige à retrouver le codebook pour être lu, alors que le
 * front connaît déjà la correspondance.
 *
 * Les deux effectifs partent : `weighted_n` (celui qui fait foi, pondéré comme
 * le dashboard) ET `raw_n`. Sans le brut, impossible de voir qu'une part de
 * 40 % repose sur onze personnes.
 */
export function exportCrosstab(payload: {
  rows: CrosstabRow[];
  q: Pick<SearchResult, "survey_id" | "variable" | "question_text" | "display_label">;
  dimQ: Pick<SearchResult, "variable" | "question_text" | "display_label" | "response_options">;
  property: string;
  labels: string[];
}) {
  const { rows, q, dimQ } = payload;
  const dMap = labelMap(dimQ.response_options);
  const stamp = new Date().toISOString().slice(0, 10);

  const headers = [
    "survey_id",
    "question_ouverte",
    "propriete_annotee",
    "variable_croisee",
    "question_croisee",
    "categorie",
    "etiquette",
    "weighted_n",
    "raw_n",
    "col_share",
  ];
  const lines = rows.map((r) =>
    [
      q.survey_id,
      q.variable,
      payload.property,
      dimQ.variable,
      dimQ.display_label || dimQ.question_text,
      codeLabel(dMap, r.dim_code),
      String(r.target_code),
      r.weighted_n,
      r.raw_n,
      r.col_share,
    ]
      .map(csvCell)
      .join(","),
  );

  triggerDownload(
    "﻿" + [headers.join(","), ...lines].join("\n"),
    `opubliq-croisement-${q.survey_id}-${q.variable}-x-${dimQ.variable}-${stamp}.csv`,
    "text/csv;charset=utf-8",
  );
}
