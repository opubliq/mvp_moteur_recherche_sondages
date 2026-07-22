/**
 * Croisement d'une annotation avec une variable du sondage (bead jsu.7).
 *
 * L'annotation de jsu.6 n'est pas persistée : il n'y a rien à joindre côté
 * serveur au repos. La map `respondent_id → étiquette` part donc dans la
 * requête, `/microdata` la matérialise le temps d'une jointure sur
 * `__respondent_id`, et elle disparaît avec la réponse. Le contrat RAW-FIRST
 * des Parquet reste intact — une annotation est de la donnée dérivée.
 *
 * CE N'EST PAS UN NOUVEAU MOTEUR. Même agrégation pondérée `SUM(__weight)`,
 * mêmes barres empilées 100 % que le dashboard v33, mêmes conventions de tri et
 * de gradient ordinal. Sans ça, les chiffres d'ici ne seraient pas comparables à
 * ceux du dashboard, et deux vues du même sondage se contrediraient.
 *
 * L'ANNOTATION PORTE LES COULEURS, la variable de sondage porte les lignes.
 * C'est le sens de lecture de la question qu'on se pose : « dans chaque groupe
 * d'âge, quelle part invoque l'identification partisane ? » — pas l'inverse.
 */

import { useEffect, useMemo, useState } from "react";
import { Download, GitCompare } from "lucide-react";
import { fetchMicrodata, NoMicrodataError } from "../api";
import type { AnnotationSession } from "../context/AnnotationContext";
import { exportCrosstab } from "../lib/exportAnnotations";
import type { CrosstabRow, ResponseOption, SearchResult } from "../types";
import DimSelect from "./microdata/DimSelect";
import StackedBars100 from "./microdata/StackedBars100";
import { formatN } from "../lib/microdataFormat";

/** Nom réservé de l'annotation côté `/microdata` (cf. microdata-core/core.ts). */
const ANNOTATION_COLUMN = "__annotation";

export default function AnnotationCrosstab({
  q,
  questions,
  session,
}: {
  /** La question ouverte annotée. */
  q: SearchResult;
  /** Toutes les questions du sondage — le vivier des dimensions de croisement. */
  questions: SearchResult[];
  session: AnnotationSession;
}) {
  const [dimVar, setDimVar] = useState("");
  const [rows, setRows] = useState<CrosstabRow[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  /**
   * La map envoyée au serveur. Construite depuis les `rows` du batch (qui
   * portent le `respondent_id`) et non depuis la liste affichée : le croisement
   * doit porter sur tout ce qui a été annoté.
   */
  const annotation = useMemo(() => {
    const batch = session.batch;
    if (!batch) return [];
    return batch.rows
      .filter((v) => batch.annotations.has(v.id))
      .map((v) => ({ rid: v.respondent_id, label: batch.annotations.get(v.id)!.label }));
  }, [session.batch]);

  /** Questions fermées du sondage, hors la question ouverte annotée elle-même. */
  const { socioDims, otherDims } = useMemo(() => {
    const closed = questions.filter((x) => x.variable !== q.variable && x.response_options.length > 0);
    const byLabel = (a: SearchResult, b: SearchResult) =>
      (a.display_label || a.question_text).localeCompare(b.display_label || b.question_text);
    return {
      socioDims: closed.filter((x) => x.is_sociodemo).sort(byLabel),
      otherDims: closed.filter((x) => !x.is_sociodemo).sort(byLabel),
    };
  }, [questions, q.variable]);

  const dimQ = useMemo(() => questions.find((x) => x.variable === dimVar), [questions, dimVar]);

  useEffect(() => {
    if (!dimVar || annotation.length === 0) return;
    let cancelled = false;
    setState("loading");
    setError(null);
    fetchMicrodata<CrosstabRow>({
      surveyId: q.survey_id,
      target: ANNOTATION_COLUMN,
      dim: dimVar,
      annotation,
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows);
        setState("ok");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof NoMicrodataError
            ? "Ce sondage n'a pas de microdonnées : le croisement est impossible."
            : err instanceof Error
              ? err.message
              : "Croisement échoué",
        );
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [q.survey_id, dimVar, annotation]);

  /**
   * Les « options de réponse » de l'annotation, fabriquées depuis les étiquettes
   * réellement présentes : le code EST l'étiquette. Ça permet de réutiliser les
   * composants du dashboard sans les toucher, eux qui attendent partout un
   * couple code/label.
   */
  const targetOptions: ResponseOption[] = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows ?? []) seen.add(String(r.target_code));
    return [...seen].sort().map((code) => ({ code, label: code }));
  }, [rows]);

  /** Effectif réellement joint — jamais supposé égal au nombre d'annotations. */
  const joined = useMemo(() => (rows ?? []).reduce((s, r) => s + r.raw_n, 0), [rows]);

  if (!session.batch || annotation.length === 0) return null;

  const shortLabel = (x: SearchResult) => (x.display_label || x.question_text).slice(0, 60);

  return (
    <div className="op-card">
      <h3 className="mb-1 flex items-center gap-1.5 font-semibold">
        <GitCompare size={16} strokeWidth={1.75} /> Croiser l'annotation
      </h3>
      <p className="mb-3 text-sm text-base-content/55">
        {formatN(annotation.length)} réponses annotées, croisées avec une autre variable du sondage.
        Effectifs pondérés par <code className="font-mono text-xs">__weight</code>, comme le dashboard.
      </p>

      <DimSelect socioDims={socioDims} otherDims={otherDims} value={dimVar} onChange={setDimVar} />

      {!dimVar && (
        <p className="mt-3 text-sm text-base-content/45">
          Choisis une variable pour voir comment tes étiquettes s'y distribuent.
        </p>
      )}

      {state === "loading" && (
        <div className="py-10 text-center">
          <span className="loading loading-spinner" />
        </div>
      )}
      {state === "error" && <p className="mt-3 text-sm text-error">{error}</p>}

      {state === "ok" && rows && rows.length > 0 && dimQ && (
        <div className="mt-4">
          <StackedBars100
            rows={rows}
            targetOptions={targetOptions}
            dimOptions={dimQ.response_options}
            dimOrdinal={dimQ.is_ordinal}
            targetName={session.property.trim().slice(0, 60) || "annotation"}
            dimName={shortLabel(dimQ)}
          />

          {/* Le décompte apparié est une information, pas un détail : un
              répondant sans microdonnée ne peut pas être croisé, et l'écart
              doit être visible plutôt que déduit. */}
          <p className="mt-3 text-xs text-base-content/45">
            {formatN(joined)} réponses appariées sur {formatN(annotation.length)} annotées
            {joined < annotation.length && " — les autres n'ont pas de valeur pour cette variable"}.
          </p>

          <button
            className="btn btn-outline btn-sm mt-2 gap-1.5"
            onClick={() =>
              exportCrosstab({
                rows,
                q,
                dimQ,
                property: session.property,
                labels: targetOptions.map((o) => o.label),
              })
            }
          >
            <Download size={15} strokeWidth={1.75} /> Télécharger le croisement
          </button>
        </div>
      )}

      {state === "ok" && rows && rows.length === 0 && (
        <p className="mt-3 text-sm text-base-content/55">
          Aucun croisement : aucune réponse annotée n'a de valeur pour cette variable.
        </p>
      )}
    </div>
  );
}
