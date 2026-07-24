/**
 * Carte d'annotation LLM des réponses libres (bead jsu.6).
 *
 * Le parcours est volontairement en trois temps, dans cet ordre :
 *
 *   1. DÉFINIR la propriété et ses étiquettes, en texte libre.
 *   2. ESSAYER sur les réponses cochées — obligatoire, pas décoratif. Le
 *      classement s'affiche dans la liste, sous chaque réponse, avec sa
 *      justification. On règle la consigne là, sans payer un batch.
 *   3. LANCER sur toute la question, par paquets, avec une progression réelle.
 *
 * L'étape 2 verrouille l'étape 3 : la signature de la consigne essayée doit
 * correspondre à la consigne courante (cf. `specSignature`). Sans ce verrou,
 * on valide un prompt et on en exécute un autre — le pire des deux mondes,
 * puisque le résultat a l'air validé.
 *
 * LE TÉLÉCHARGEMENT EST LA CONCLUSION DU RUN, pas un bouton discret : les
 * annotations sont éphémères (cf. `AnnotationContext`), et quatre minutes
 * d'appels LLM disparaissent avec l'onglet.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, GitCompare, Play, ScanSearch, Shuffle, Square, Wand2 } from "lucide-react";
import { specSignature, type AnnotationSession } from "../context/AnnotationContext";
import { scanQuestion, ScanRateLimitError } from "../api";
import { exportAnnotations } from "../lib/exportAnnotations";
import type { ExportFormat } from "../lib/exportCart";
import {
  MAX_RUN_ITEMS,
  fetchScanSample,
  fetchUniverse,
  runAnnotation,
  type RunProgress,
} from "../lib/annotationRun";
import { MAX_ITEMS_PER_CALL, effectiveLabels, type Annotation } from "../logic/annotate";
import { SCAN_SAMPLE_SIZE } from "../logic/scan";
import type { SearchResult, Verbatim } from "../types";
import { labelBadgeClass } from "./VerbatimRow";

/** Modèle affiché à l'utilisateur et inscrit dans l'export (cf. bead : reste 100 % Azure). */
const MODEL_LABEL = "gpt-5-mini (Azure)";

/**
 * Cadence réelle d'un paquet (cf. `MIN_DISPATCH_INTERVAL_MS`) : sert l'estimation
 * annoncée avant le lancement. Mieux vaut l'annoncer un peu haute que basse —
 * on demande à l'utilisateur de laisser l'onglet ouvert.
 */
const SECONDS_PER_CALL = 2.6;

/** Découpe le champ « étiquettes » : une par ligne, vides ignorées. */
function parseOptions(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function estimateMinutes(count: number): number {
  return Math.max(1, Math.round((Math.ceil(count / MAX_ITEMS_PER_CALL) * SECONDS_PER_CALL) / 60));
}

/** Compte par étiquette, dans l'ordre de la consigne (les couleurs suivent). */
function distribution(annotations: Map<string, Annotation>, labels: string[]) {
  const counts = new Map<string, number>();
  for (const a of annotations.values()) counts.set(a.label, (counts.get(a.label) ?? 0) + 1);
  return labels
    .map((l) => ({ label: l, n: counts.get(l) ?? 0 }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n);
}

export default function AnnotateCard({
  q,
  session,
  update,
  reset,
  selection,
  questionTotal,
  onSampleRandom,
  sampling,
}: {
  q: SearchResult;
  session: AnnotationSession;
  update: (updater: (prev: AnnotationSession) => AnnotationSession) => void;
  reset: () => void;
  /** Les réponses cochées dans la liste — la matière de l'essai. */
  selection: Verbatim[];
  /**
   * Nombre de réponses de la QUESTION, jamais celui de la liste affichée : en
   * mode recherche l'écran ne montre que 15 citations reclassées, et annoncer
   * ce chiffre laisserait croire que le batch ne porte que sur elles.
   */
  questionTotal: number;
  /** Tire N réponses au hasard dans toute la question et en fait la sélection. */
  onSampleRandom: (n?: number) => void;
  sampling: boolean;
}) {
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [mode, setMode] = useState<"test" | "batch" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv-large");
  const abortRef = useRef<AbortController | null>(null);

  // Le scanner propose une grille de départ ; il vit à côté du run, avec son
  // propre cycle (un seul appel, pas d'orchestration) et son propre message.
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanRationale, setScanRationale] = useState<string | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);

  // Un compte à rebours n'avance pas tout seul : sans ce tick, l'attente
  // imposée par le quota afficherait un chiffre figé, exactement l'inverse de
  // ce qu'on veut montrer.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (progress?.phase !== "waiting") return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [progress?.phase]);

  // Un run — ou un scan — en cours n'appartient pas à la page : si elle se
  // démonte, on coupe les deux.
  useEffect(() => () => {
    abortRef.current?.abort();
    scanAbortRef.current?.abort();
  }, []);

  /**
   * SCANNER — l'amorce du cold start. On tire un échantillon de la question, le
   * modèle en dégage une propriété et ses étiquettes, et on PRÉREMPLIT les deux
   * champs. C'est un point de départ, pas un verdict : l'utilisateur corrige
   * puis essaie comme d'habitude. On remplace le brouillon en cours sans
   * confirmation — proposer une grille alors qu'on en tapait une n'a de sens que
   * si on n'avait pas encore d'idée arrêtée, et l'essai reste le vrai garde-fou.
   */
  const scan = async () => {
    const ctrl = new AbortController();
    scanAbortRef.current = ctrl;
    setScanning(true);
    setScanError(null);
    setScanRationale(null);
    try {
      const sample = await fetchScanSample(q.survey_id, q.variable, questionTotal, SCAN_SAMPLE_SIZE, {
        signal: ctrl.signal,
      });
      if (sample.length === 0) {
        setScanError("Aucune réponse exploitable à scanner sur cette question.");
        return;
      }
      const result = await scanQuestion({
        questionText: q.display_label || q.question_text,
        items: sample.map((v) => ({ text: v.text })),
        signal: ctrl.signal,
      });
      update((s) => ({ ...s, property: result.property, optionsText: result.labels.join("\n") }));
      setScanRationale(result.rationale ?? null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof ScanRateLimitError) {
        setScanError("Quota du modèle atteint — réessaie dans une minute.");
      } else {
        setScanError(err instanceof Error ? err.message : "Scan échoué");
      }
    } finally {
      scanAbortRef.current = null;
      setScanning(false);
    }
  };

  const options = parseOptions(session.optionsText);
  const labels = effectiveLabels(options);
  const signature = specSignature(session.property, options);
  const specReady = session.property.trim().length > 0 && options.length >= 2;
  const testFresh = session.test != null && session.test.signature === signature;
  const running = mode != null;

  const spec = { property: session.property, options, questionText: q.display_label || q.question_text };

  const start = async (kind: "test" | "batch") => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setMode(kind);
    setError(null);
    setConfirming(false);
    setTruncated(false);

    const commit = (slot: "test" | "batch") => (batch: Record<string, Annotation>) =>
      update((s) => {
        const slice = s[slot];
        if (!slice) return s;
        const annotations = new Map(slice.annotations);
        for (const [id, a] of Object.entries(batch)) annotations.set(id, a);
        return { ...s, [slot]: { ...slice, annotations } };
      });

    try {
      let items: Verbatim[];
      if (kind === "test") {
        items = selection;
        update((s) => ({
          ...s,
          test: { annotations: new Map(), rows: items, failed: 0, signature, ranAt: Date.now() },
        }));
      } else {
        setProgress({ phase: "fetching", done: 0, total: 0, failed: 0 });
        const universe = await fetchUniverse(q.survey_id, q.variable, {
          signal: ctrl.signal,
          onPage: (fetched, total) => setProgress({ phase: "fetching", done: fetched, total, failed: 0 }),
        });
        items = universe.rows;
        setTruncated(universe.truncated);
        // Un nouveau batch remplace le précédent — et redevient « non
        // téléchargé », sinon l'avertissement mentirait.
        update((s) => ({
          ...s,
          batch: { annotations: new Map(), rows: items, failed: 0, signature, ranAt: Date.now() },
          downloaded: false,
        }));
      }

      const outcome = await runAnnotation({
        items,
        spec,
        withReason: kind === "test", // justification en essai seulement : sur un batch elle triplerait les tokens de sortie
        signal: ctrl.signal,
        onAnnotations: commit(kind),
        onProgress: setProgress,
      });

      update((s) => {
        const slice = s[kind];
        return slice ? { ...s, [kind]: { ...slice, failed: outcome.failed } } : s;
      });
      if (outcome.annotated === 0 && !outcome.aborted) {
        setError("Aucune réponse n'a pu être annotée. Réessaie dans un instant.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annotation échouée");
    } finally {
      abortRef.current = null;
      setMode(null);
      setProgress(null);
    }
  };

  /**
   * Le run le plus récent — c'est LUI qu'on affiche. Après un batch, relancer
   * un essai doit montrer l'essai : on itère sur la consigne, et lui opposer le
   * batch précédent donnait l'illusion que rien ne s'était passé.
   */
  const latest = [session.batch, session.test]
    .filter((s): s is NonNullable<typeof s> => s != null)
    .sort((a, b) => b.ranAt - a.ranAt)[0];

  /**
   * Ce qu'on télécharge, en revanche, reste le BATCH quand il existe : c'est le
   * livrable, et repartir avec dix lignes d'essai en croyant tenir le run
   * complet serait une perte silencieuse. Le bouton annonce donc son effectif.
   */
  const downloadable = session.batch ?? session.test;

  const download = () => {
    const slice = downloadable;
    if (!slice) return;
    exportAnnotations(
      {
        property: session.property,
        options: labels,
        model: MODEL_LABEL,
        rows: slice.rows,
        annotations: slice.annotations,
      },
      q,
      format,
    );
    update((s) => ({ ...s, downloaded: true }));
  };

  const batchDone = session.batch != null && !running;
  const dist = distribution(latest?.annotations ?? new Map(), labels);

  return (
    <div className="op-card" id="op-annotate-card">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Wand2 size={15} strokeWidth={1.75} /> Annoter les réponses
      </h3>

      {/* --- Scanner : proposer une grille quand on ne sait pas quoi annoter --- */}
      {/* Amorce du cold start. Facultatif : qui a déjà sa grille en tête écrit
          directement dans les champs. On ne l'offre pas pendant un run (mêmes
          champs verrouillés) ni sur une question vide. */}
      <button
        type="button"
        className="btn btn-ghost btn-sm mb-1 w-full gap-1.5"
        disabled={running || scanning || questionTotal === 0}
        onClick={scan}
      >
        {scanning ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <ScanSearch size={14} strokeWidth={2} />
        )}
        {scanning ? "Analyse d'un échantillon…" : "Proposer une annotation (scanner)"}
      </button>
      <p className="mb-2 text-xs text-base-content/45">
        Analyse {SCAN_SAMPLE_SIZE} réponses au hasard et propose une propriété à distinguer et ses
        étiquettes. À corriger avant l'essai — c'est un point de départ.
      </p>
      {scanError && <p className="mb-2 text-xs text-error">{scanError}</p>}
      {scanRationale && !scanError && (
        <p className="mb-2 rounded-lg bg-info/10 p-2 text-xs leading-snug text-info-content">
          <span className="font-medium">Angle proposé — </span>
          {scanRationale}
        </p>
      )}

      <label className="mb-1 block text-xs font-medium text-base-content/60" htmlFor="op-annot-prop">
        Ce que tu veux distinguer
      </label>
      <textarea
        id="op-annot-prop"
        value={session.property}
        onChange={(e) => update((s) => ({ ...s, property: e.target.value }))}
        placeholder="ex. est-ce que la personne exprime de la peur, ou de l'optimisme, face à l'avenir ?"
        className="textarea textarea-bordered mb-2 min-h-20 w-full text-sm leading-snug"
        disabled={running}
      />

      <label className="mb-1 block text-xs font-medium text-base-content/60" htmlFor="op-annot-opts">
        Étiquettes — une par ligne
      </label>
      <textarea
        id="op-annot-opts"
        value={session.optionsText}
        onChange={(e) => update((s) => ({ ...s, optionsText: e.target.value }))}
        placeholder={"peur\noptimiste"}
        className="textarea textarea-bordered mb-1 min-h-16 w-full font-mono text-sm leading-snug"
        disabled={running}
      />
      <p className="mb-3 text-xs text-base-content/45">
        « non classable » est ajoutée d'office : sans porte de sortie, le modèle range de force les
        réponses vides ou hors-sujet dans une de tes étiquettes.
      </p>

      {/* --- Étape 2 : l'essai, avant tout batch --- */}
      {/* Tirer au sort plutôt que cocher : sur une question de plusieurs
          centaines de réponses, choisir soi-même son échantillon revient à
          régler la consigne sur les cas qu'on avait déjà en tête. */}
      <button
        type="button"
        className="btn btn-ghost btn-sm mb-1 w-full gap-1.5"
        disabled={running || sampling || questionTotal === 0}
        onClick={() => onSampleRandom(10)}
      >
        {sampling ? <span className="loading loading-spinner loading-xs" /> : <Shuffle size={14} strokeWidth={2} />}
        Tirer 10 réponses au hasard
      </button>
      <button
        type="button"
        className="btn btn-outline btn-sm w-full gap-1.5"
        disabled={!specReady || selection.length === 0 || running}
        onClick={() => start("test")}
      >
        {mode === "test" ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Play size={14} strokeWidth={2} />
        )}
        Essayer sur {selection.length || "la"} sélection{selection.length > 1 ? "s" : ""}
      </button>
      {selection.length === 0 && (
        <p className="mt-1 text-xs text-base-content/45">
          Tire un échantillon au hasard, ou coche des réponses dans la liste. Les étiquettes et leurs
          justifications s'affichent dans « Sélection », plus bas.
        </p>
      )}
      {session.test && !testFresh && (
        <p className="mt-1 text-xs text-warning">
          La consigne a changé depuis l'essai — refais un essai avant de lancer le batch.
        </p>
      )}

      {/* --- Étape 3 : le batch --- */}
      {!running && (
        <div className="mt-2">
          {!confirming ? (
            <button
              type="button"
              className="btn btn-primary btn-sm w-full gap-1.5"
              disabled={!specReady || !testFresh}
              onClick={() => setConfirming(true)}
            >
              Lancer sur les {Math.min(questionTotal, MAX_RUN_ITEMS).toLocaleString("fr-CA")} réponses
            </button>
          ) : (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
              <p className="mb-2 text-xs leading-snug">
                {Math.min(questionTotal, MAX_RUN_ITEMS).toLocaleString("fr-CA")} réponses seront annotées
                — toute la question, pas seulement ce qui est affiché. Compte environ{" "}
                {estimateMinutes(Math.min(questionTotal, MAX_RUN_ITEMS))} min, onglet ouvert.
                {questionTotal > MAX_RUN_ITEMS &&
                  ` La question en compte ${questionTotal.toLocaleString("fr-CA")} : le run est plafonné.`}
              </p>
              <div className="flex gap-1.5">
                <button type="button" className="btn btn-primary btn-xs flex-1" onClick={() => start("batch")}>
                  Lancer
                </button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setConfirming(false)}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Progression RÉELLE : done/total effectifs, jamais une animation --- */}
      {progress && (
        <div className="mt-3 rounded-lg bg-base-200/60 p-2" aria-live="polite">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium">
              {progress.phase === "fetching"
                ? "Récupération des réponses…"
                : progress.phase === "waiting"
                  ? `Quota du modèle atteint — reprise dans ${Math.max(
                      0,
                      Math.ceil(((progress.waitUntil ?? Date.now()) - Date.now()) / 1000),
                    )} s`
                  : "Annotation en cours…"}
            </span>
            <span className="tabular-nums text-base-content/50">
              {progress.done.toLocaleString("fr-CA")}
              {progress.total > 0 ? ` / ${progress.total.toLocaleString("fr-CA")}` : ""}
            </span>
          </div>
          <progress
            className="progress progress-primary w-full"
            value={progress.done}
            max={progress.total || 1}
          />
          {progress.failed > 0 && (
            <p className="mt-1 text-xs text-warning">{progress.failed} réponses non classées</p>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-xs mt-1 w-full gap-1"
            onClick={() => abortRef.current?.abort()}
          >
            <Square size={12} /> Arrêter — les réponses déjà annotées sont gardées
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      {truncated && (
        <p className="mt-2 text-xs text-warning">
          Question plafonnée à {MAX_RUN_ITEMS.toLocaleString("fr-CA")} réponses par run.
        </p>
      )}

      {/* --- Résultat --- */}
      {dist.length > 0 && (
        <div className="mt-3 border-t border-base-300 pt-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="text-xs font-semibold">
              {latest === session.batch ? "Résultat" : "Essai"} · {latest!.annotations.size} réponses
            </h4>
            {latest!.failed > 0 && <span className="text-xs text-warning">{latest!.failed} en échec</span>}
          </div>
          <ul className="mb-3 space-y-1">
            {dist.map((d) => {
              const n = latest!.annotations.size;
              return (
                <li key={d.label} className="flex items-center gap-2 text-xs">
                  <span className={`badge badge-sm ${labelBadgeClass(d.label, labels)}`}>{d.label}</span>
                  <span className="ml-auto tabular-nums text-base-content/60">
                    {d.n} · {Math.round((d.n / n) * 100)} %
                  </span>
                </li>
              );
            })}
          </ul>

          {batchDone && !session.downloaded && (
            <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-warning/10 p-2 text-xs leading-snug text-warning-content">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Ces annotations ne sont conservées nulle part. Télécharge-les avant de fermer l'onglet.
            </p>
          )}

          <select
            className="select select-bordered select-sm mb-2 w-full"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
          >
            <option value="csv-large">Format : CSV</option>
            <option value="json">Format : JSON</option>
          </select>
          <button
            className={`btn btn-sm w-full gap-1.5 ${session.downloaded ? "btn-outline" : "btn-primary"}`}
            onClick={download}
            disabled={running}
          >
            <Download size={15} strokeWidth={1.75} />
            {session.downloaded ? "Télécharger à nouveau" : "Télécharger"} les{" "}
            {downloadable!.annotations.size} annotations
          </button>
          {/* Le pont vers le croisement, depuis l'endroit où on vient de le
              rendre possible : après un batch, le geste suivant est de croiser,
              mais le dashboard vit dans l'autre colonne. Ce bouton l'y amène
              plutôt que de compter sur le lien de l'en-tête, plus loin. */}
          {batchDone && (
            <button
              type="button"
              className="btn btn-primary btn-sm mt-2 w-full gap-1.5"
              onClick={() =>
                document.getElementById("op-crosstab")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <GitCompare size={15} strokeWidth={1.75} /> Croiser ces annotations
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-xs mt-1 w-full"
            disabled={running}
            onClick={() => reset()}
          >
            Effacer l'annotation
          </button>
        </div>
      )}
    </div>
  );
}
