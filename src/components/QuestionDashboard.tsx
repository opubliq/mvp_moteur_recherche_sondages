import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Plus, Download, ArrowLeftRight, MessageSquare } from "lucide-react";
import { fetchSurvey, fetchMicrodata, NoMicrodataError } from "../api";
import type {
  CrosstabRow,
  DistributionRow,
  MeanByGroupRow,
  MeanRow,
  SearchResult,
  SurveyParent,
} from "../types";
import { useCart, toCartItem } from "../context/CartContext";
import { formatMean, formatN, refusalCodes } from "../lib/microdataFormat";
import { isVerbatim } from "../lib/verbatims";
import DistributionBars from "./microdata/DistributionBars";
import Histogram from "./microdata/Histogram";
import StackedBars100 from "./microdata/StackedBars100";
import RidgePlot from "./microdata/RidgePlot";
import MeanByGroup from "./microdata/MeanByGroup";
import DimSelect from "./microdata/DimSelect";

type Kind = "single" | "scale" | "continuous" | "open" | "multiple";

/** Au-delà, une dimension de croisement est trop granulaire pour un graphe lisible. */
const MAX_GROUPS = 25;

/** Type effectif pilotant le graphe. Repli : sans options → ouvert ; sinon single. */
function kindOf(q: SearchResult): Kind {
  const vt = q.var_type as Kind | null;
  if (vt && ["single", "scale", "continuous", "open", "multiple"].includes(vt)) return vt;
  return q.response_options.length === 0 ? "open" : "single";
}

export default function QuestionDashboard() {
  const { surveyId, variable } = useParams<{ surveyId: string; variable: string }>();
  const { has, toggle } = useCart();

  const [survey, setSurvey] = useState<SurveyParent | null>(null);
  const [questions, setQuestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSurvey(surveyId)
      .then((res) => {
        if (cancelled) return;
        setSurvey(res.survey);
        setQuestions(res.questions);
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Erreur inconnue"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const q = useMemo(() => questions.find((x) => x.variable === variable), [questions, variable]);

  // Dimensions de croisement : TOUTES les variables fermées du sondage autres que
  // la question courante, mais sociodémo (dimensions comparables) séparées des
  // autres questions dans le menu. Classées par qualité : une variable à <2
  // modalités cataloguées cache des valeurs brutes (ex. année de naissance → 76
  // valeurs) et fait un mauvais défaut ; >20 modalités = trop granulaire. On
  // privilégie la bande utile [2,20], puis un ordre de type sociodémo lisible.
  const { socioDims, otherDims } = useMemo(() => {
    const closed = questions.filter((x) => x.variable !== variable && x.response_options.length > 0);
    const TYPE_ORDER = ["age", "gender", "region", "education", "income", "language", "occupation"];
    const score = (x: SearchResult): [number, number, number] => {
      const n = x.response_options.length;
      const band = n < 2 ? 2 : n > 20 ? 1 : 0; // 0 = bande utile
      const ti = x.sociodemo_type ? TYPE_ORDER.indexOf(x.sociodemo_type) : -1;
      return [band, ti === -1 ? TYPE_ORDER.length : ti, n];
    };
    const byScore = (a: SearchResult, b: SearchResult) => {
      const sa = score(a);
      const sb = score(b);
      return sa[0] - sb[0] || sa[1] - sb[1] || sa[2] - sb[2];
    };
    return {
      socioDims: closed.filter((x) => x.is_sociodemo).sort(byScore),
      otherDims: closed.filter((x) => !x.is_sociodemo).sort(byScore),
    };
  }, [questions, variable]);

  if (loading) return <div className="py-20 text-center"><span className="loading loading-spinner loading-lg" /></div>;
  if (error) return <div className="alert alert-error"><span>{error}</span></div>;
  if (!q) return <p>Question introuvable.</p>;

  const surveyName = survey?.survey_name ?? surveyId;
  const inCart = has(q.survey_id, q.variable);
  const kind = kindOf(q);

  return (
    <div className="space-y-4">
      <div className="crumbs">
        <Link to="/recherche">Recherche</Link>
        <span className="sep">/</span>
        <Link to={`/sondage/${q.survey_id}`}>{surveyName}</Link>
        <span className="sep">/</span>
        <span className="text-base-content/60">{q.variable}</span>
      </div>

      <header className="op-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="op-badge op-badge-plain font-mono">{q.variable}</span>
              {q.var_type && <span className="op-badge op-badge-plain">{q.var_type}</span>}
            </div>
            <h1 className="text-xl font-semibold leading-snug">{q.display_label || q.question_text}</h1>
            {q.display_label && q.display_label !== q.question_text && (
              <p className="mt-1 text-sm leading-snug text-base-content/55">{q.question_text}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button className={`btn btn-sm gap-1.5 ${inCart ? "btn-outline" : "btn-primary"}`} onClick={() => toggle(toCartItem(q))}>
              {inCart ? <><Check size={16} /> Dans l'export</> : <><Plus size={16} /> Ajouter à l'export</>}
            </button>
            <button className="btn btn-outline btn-sm gap-1.5" disabled>
              <Download size={16} /> Données brutes
            </button>
          </div>
        </div>
      </header>

      <div className="grid-dash">
        <div className="space-y-4">
          {kind === "open" ? (
            <OpenTextPanel q={q} />
          ) : kind === "multiple" ? (
            <MultipleNotice />
          ) : (
            <>
              <Univariate q={q} kind={kind} />
              <Crossing q={q} kind={kind} socioDims={socioDims} otherDims={otherDims} />
            </>
          )}
        </div>

        <div className="space-y-4">
          <SurveyContext survey={survey} />
          <SurveyQuestionsNav questions={questions} currentVariable={q.variable} surveyId={q.survey_id} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Univarié — bon graphe selon le type
 * ------------------------------------------------------------------------ */
function Univariate({ q, kind }: { q: SearchResult; kind: Kind }) {
  const [dist, setDist] = useState<DistributionRow[] | null>(null);
  const [stat, setStat] = useState<MeanRow | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none" | "error">("loading");

  const numeric = kind === "scale" || kind === "continuous";
  const refusal = useMemo(() => refusalCodes(q.response_options), [q]);
  // Refus/NSP EXCLUS par défaut partout ; toggle « inclure refus/NSP » pour les
  // remettre. Continu : toujours exclus du binning (sinon l'axe se dilate).
  const [includeRefusal, setIncludeRefusal] = useState(false);
  const canToggleRefusal = kind !== "continuous" && refusal.length > 0;

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setDist(null);
    setStat(null);
    const distExclude = kind === "continuous" ? refusal : includeRefusal ? [] : refusal;
    const jobs: Promise<unknown>[] = [
      fetchMicrodata<DistributionRow>({ surveyId: q.survey_id, target: q.variable, exclude: distExclude }).then(
        (r) => !cancelled && setDist(r.rows),
      ),
    ];
    if (numeric) {
      // La moyenne exclut TOUJOURS les refus (sinon un 99 la fait exploser).
      jobs.push(
        fetchMicrodata<MeanRow>({ surveyId: q.survey_id, target: q.variable, agg: "mean", exclude: refusal }).then(
          (r) => !cancelled && setStat(r.rows[0] ?? null),
        ),
      );
    }
    Promise.all(jobs)
      .then(() => !cancelled && setState("ok"))
      .catch((err: unknown) => {
        if (cancelled) return;
        setState(err instanceof NoMicrodataError ? "none" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [q, kind, numeric, refusal, includeRefusal]);

  if (state === "none") return <NoMicrodata />;
  if (state === "error") return <div className="op-card"><p className="text-sm text-error">Échec du chargement des microdonnées.</p></div>;
  if (state === "loading" || !dist) return <div className="op-card py-10 text-center"><span className="loading loading-spinner" /></div>;

  const totalRaw = dist.reduce((s, r) => s + r.raw_n, 0);
  // Une échelle à trop de niveaux (ex. thermomètre 0–100) se lit mieux en
  // histogramme qu'en une longue liste de barres. Seuil : > 12 niveaux distincts.
  const asHistogram = kind === "continuous" || (kind === "scale" && dist.length > 12);

  return (
    <div className="op-card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-semibold">Distribution des réponses</h3>
        <div className="flex items-center gap-3">
          {canToggleRefusal && (
            <label className="label cursor-pointer gap-1.5 text-xs">
              <input type="checkbox" className="checkbox checkbox-xs" checked={includeRefusal} onChange={(e) => setIncludeRefusal(e.target.checked)} />
              inclure refus/NSP
            </label>
          )}
          {stat && (
            <span className="text-sm text-base-content/70">
              moyenne <b className="text-base-content">{formatMean(stat.mean)}</b>
              <span className="text-base-content/45"> · {stat.min}–{stat.max}</span>
            </span>
          )}
        </div>
      </div>

      {asHistogram ? (
        <Histogram rows={dist} mean={stat?.mean} />
      ) : (
        <DistributionBars rows={dist} options={q.response_options} ordinal={q.is_ordinal || kind === "scale"} />
      )}

      <p className="mt-3 text-xs text-base-content/45">
        Base : {formatN(totalRaw)} répondants · pondéré
        {asHistogram && refusal.length > 0 ? " · refus/NSP exclus" : ""}
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Bivarié — croisement par dimension sociodémo
 * ------------------------------------------------------------------------ */
function Crossing({
  q,
  kind,
  socioDims,
  otherDims,
}: {
  q: SearchResult;
  kind: Kind;
  socioDims: SearchResult[];
  otherDims: SearchResult[];
}) {
  const dims = useMemo(() => [...socioDims, ...otherDims], [socioDims, otherDims]);
  const [dimVar, setDimVar] = useState<string>(dims[0]?.variable ?? "");
  const [mode, setMode] = useState<"mean" | "stacked">("mean");
  const [includeRefusal, setIncludeRefusal] = useState(false); // défaut : refus exclus
  // Swap cible↔dimension : ne vaut QUE pour cette vue de croisement (la cible
  // de la page reste q partout ailleurs — header, univarié, breadcrumb…).
  const [swapped, setSwapped] = useState(false);
  const [cross, setCross] = useState<CrosstabRow[] | null>(null);
  const [means, setMeans] = useState<MeanByGroupRow[] | null>(null);
  const [domain, setDomain] = useState<{ min: number; max: number; overall?: number } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const dimQ = useMemo(() => dims.find((d) => d.variable === dimVar), [dims, dimVar]);
  // Cible/dimension EFFECTIVES de la vue croisée après swap éventuel.
  const targetQ = swapped ? dimQ : q;
  const otherQ = swapped ? q : dimQ;
  const targetVar = swapped ? dimVar : q.variable;
  const otherVar = swapped ? q.variable : dimVar;
  const effKind: Kind = swapped && dimQ ? kindOf(dimQ) : kind;

  const numeric = effKind === "scale" || effKind === "continuous";
  // continuous : moyenne uniquement (empilé 100% d'un continu n'a pas de sens).
  const effMode: "mean" | "stacked" = effKind === "continuous" ? "mean" : mode;
  const refusal = useMemo(() => refusalCodes(targetQ?.response_options ?? q.response_options), [targetQ, q]);
  // Refus/NSP EXCLUS par défaut (moyenne comme empilé) ; toggle pour les inclure.
  const exclude = useMemo(
    () => (includeRefusal ? [] : refusal),
    [includeRefusal, refusal],
  );

  useEffect(() => {
    if (!dimVar || !targetQ || !otherVar) return;
    let cancelled = false;
    setState("loading");
    setCross(null);
    setMeans(null);

    const useMean = numeric && effMode === "mean";
    if (useMean) {
      Promise.all([
        fetchMicrodata<MeanByGroupRow>({ surveyId: q.survey_id, target: targetVar, dim: otherVar, agg: "mean", exclude }),
        fetchMicrodata<MeanRow>({ surveyId: q.survey_id, target: targetVar, agg: "mean", exclude }),
      ])
        .then(([g, overall]) => {
          if (cancelled) return;
          setMeans(g.rows);
          const o = overall.rows[0];
          setDomain(o ? { min: o.min, max: o.max, overall: o.mean } : null);
          setState("ok");
        })
        .catch(() => !cancelled && setState("error"));
    } else {
      fetchMicrodata<CrosstabRow>({ surveyId: q.survey_id, target: targetVar, dim: otherVar, exclude })
        .then((r) => {
          if (cancelled) return;
          setCross(r.rows);
          setState("ok");
        })
        .catch(() => !cancelled && setState("error"));
    }
    return () => {
      cancelled = true;
    };
  }, [q, targetVar, otherVar, targetQ, effMode, numeric, exclude]);

  if (dims.length === 0) {
    return (
      <div className="op-card">
        <h3 className="mb-2 font-semibold">Croiser avec une dimension</h3>
        <p className="text-sm text-base-content/60">Aucune dimension croisable dans ce sondage.</p>
      </div>
    );
  }

  return (
    <div className="op-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Croiser par sous-groupe</h3>
        {numeric && effKind === "scale" && (
          <div className="join">
            <button className={`btn join-item btn-xs ${effMode === "mean" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("mean")}>Moyenne</button>
            <button className={`btn join-item btn-xs ${effMode === "stacked" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("stacked")}>Distribution</button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DimSelect socioDims={socioDims} otherDims={otherDims} value={dimVar} onChange={setDimVar} />
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1.5"
          title="Inverser cible et dimension du croisement"
          disabled={!dimQ}
          onClick={() => setSwapped((s) => !s)}
        >
          <ArrowLeftRight size={15} />
          Inverser
        </button>
        {refusal.length > 0 && (
          <label className="label cursor-pointer gap-2 text-xs">
            <input type="checkbox" className="checkbox checkbox-xs" checked={includeRefusal} onChange={(e) => setIncludeRefusal(e.target.checked)} />
            inclure refus/NSP
          </label>
        )}
      </div>

      {state === "loading" && <div className="py-8 text-center"><span className="loading loading-spinner" /></div>}
      {state === "error" && <p className="text-sm text-error">Échec du croisement.</p>}
      {state === "ok" && targetQ && otherQ && (() => {
        const groupCount =
          numeric && effMode === "mean" && means
            ? means.length
            : cross
              ? new Set(cross.map((r) => String(r.dim_code))).size
              : 0;
        // Dimension trop granulaire (ex. année de naissance brute) : le binning
        // des dimensions numériques viendra plus tard. On évite un graphe à 90 lignes.
        if (groupCount > MAX_GROUPS) {
          return (
            <p className="text-sm text-base-content/60">
              Dimension trop granulaire ({groupCount} sous-groupes) — le regroupement en
              tranches des dimensions numériques est prévu ultérieurement. Choisis une
              dimension catégorielle (genre, région, scolarité…).
            </p>
          );
        }
        const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
        const shortTarget = clip(targetQ.display_label || targetQ.question_text, 64);
        const shortDim = clip(otherQ.display_label || otherQ.question_text, 52);
        return (
          <>
            {numeric && effMode === "mean" && means && domain ? (
              <MeanByGroup rows={means} dimOptions={otherQ.response_options} dimOrdinal={otherQ.is_ordinal} domainMin={domain.min} domainMax={domain.max} overallMean={domain.overall} targetName={shortTarget} dimName={shortDim} />
            ) : cross && numeric ? (
              // Cible scale/continuous en mode « Distribution » : ridgeline (une
              // densité par sous-groupe sur un axe X commun) plutôt qu'un empilé
              // 100 % qui n'exprime pas la forme d'une échelle.
              <RidgePlot rows={cross} dimOptions={otherQ.response_options} dimOrdinal={otherQ.is_ordinal} targetName={shortTarget} dimName={shortDim} />
            ) : cross ? (
              <StackedBars100 rows={cross} targetOptions={targetQ.response_options} dimOptions={otherQ.response_options} ordinal={targetQ.is_ordinal || effKind === "scale"} dimOrdinal={otherQ.is_ordinal} targetName={shortTarget} dimName={shortDim} />
            ) : null}
            <p className="mt-2 text-xs text-base-content/45">
              {numeric && effMode === "stacked"
                ? "Densité pondérée par sous-groupe (axe commun). La ligne verticale marque la médiane du sous-groupe."
                : "% pondéré par sous-groupe."}
            </p>
          </>
        );
      })()}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Panneaux d'état
 * ------------------------------------------------------------------------ */
/**
 * Question texte : aucune distribution à tracer. Si c'est de la vraie prose,
 * on renvoie vers l'espace verbatims ; sinon (`short`/`empty`) on le dit, il
 * n'y a rien à y analyser.
 */
function OpenTextPanel({ q }: { q: SearchResult }) {
  if (!isVerbatim(q)) {
    return (
      <div className="op-card">
        <h3 className="mb-2 font-semibold">Question à réponse texte</h3>
        <p className="text-sm text-base-content/50">
          Les réponses sont du texte libre trop court pour une analyse qualitative
          {q.text_kind === "empty" ? " (colonne vide)" : ""} — ni distribution ni analyse qualitative.
        </p>
      </div>
    );
  }
  return (
    <div className="op-card">
      <h3 className="mb-2 font-semibold">Question ouverte</h3>
      <p className="mb-3 text-sm text-base-content/60">
        Les réponses sont en texte libre : pas de distribution à tracer. L'espace des réponses
        libres permet d'y chercher des citations.
      </p>
      <Link
        to={`/questions-ouvertes/${q.survey_id}/${encodeURIComponent(q.variable)}`}
        className="btn btn-primary btn-sm gap-1.5"
      >
        <MessageSquare size={16} /> Lire les réponses
      </Link>
    </div>
  );
}

function MultipleNotice() {
  return (
    <div className="op-card">
      <h3 className="mb-3 font-semibold">
        Question à choix multiple <span className="op-badge op-badge-plain">graphe à venir</span>
      </h3>
      <p className="text-sm text-base-content/50">
        Cette question autorise plusieurs réponses par répondant (stockées en colonnes de
        mention). Le graphe « % ayant coché chaque option » nécessite une agrégation
        multi-mentions dédiée, prévue dans une prochaine itération.
      </p>
    </div>
  );
}

function NoMicrodata() {
  return (
    <div className="op-card">
      <h3 className="mb-2 font-semibold">Microdonnées non disponibles</h3>
      <p className="text-sm text-base-content/50">Ce sondage n'a pas encore de données répondant ingérées.</p>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Colonne droite — contexte du sondage
 *
 * DÉCISION PRODUIT (v33.12) : la colonne droite montrait les 6 premières
 * questions du sondage sans logique (ordre arbitraire de l'index). Deux
 * pistes existaient : (a) contexte du sondage (SurveyParent) + navigation
 * cadrée vers les autres questions, ou (b) questions sémantiquement proches
 * (embeddings/recherche vectorielle). On retient (a) : elle ne demande
 * aucune infra backend nouvelle (SurveyParent est déjà renvoyé par
 * /survey), est robuste (pas de similarité floue à valider) et répond
 * directement à la remarque de plot_issues.md #1 (« on pourrait ajouter
 * des infos sur le sondage »). La liste des questions reste utile comme
 * navigation, mais on affiche l'ensemble (scrollable, question courante
 * mise en évidence) plutôt qu'une tranche arbitraire des 6 premières.
 * ------------------------------------------------------------------------ */
const LANG_LABELS: Record<string, string> = { fr: "Français", en: "Anglais" };

function SurveyContext({ survey }: { survey: SurveyParent | null }) {
  if (!survey) return null;
  const meta = [
    survey.pollster,
    survey.survey_year != null ? String(survey.survey_year) : null,
    survey.language ? LANG_LABELS[survey.language] ?? survey.language : null,
    survey.n_respondents != null ? `N = ${survey.n_respondents.toLocaleString("fr-CA")}` : null,
  ].filter(Boolean);

  return (
    <div className="op-card">
      <h3 className="mb-1 text-sm font-semibold">À propos de ce sondage</h3>
      {meta.length > 0 && <p className="mb-2 text-xs text-base-content/60">{meta.join(" · ")}</p>}
      {survey.survey_description && (
        <p className="text-sm leading-snug text-base-content/70">{survey.survey_description}</p>
      )}
      {survey.top_concepts && survey.top_concepts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {survey.top_concepts.slice(0, 8).map((c) => (
            <span key={c.value} className="badge badge-ghost badge-sm">
              {c.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SurveyQuestionsNav({
  questions,
  currentVariable,
  surveyId,
}: {
  questions: SearchResult[];
  currentVariable: string;
  surveyId: string;
}) {
  const [filter, setFilter] = useState("");

  const { shown, invalidRegex } = useMemo(() => {
    const q = filter.trim();
    if (!q) return { shown: questions, invalidRegex: false };
    let re: RegExp | null = null;
    try {
      re = new RegExp(q, "i");
    } catch {
      re = null;
    }
    const test = re
      ? (s: string) => re!.test(s)
      : (s: string) => s.toLowerCase().includes(q.toLowerCase());
    return {
      shown: questions.filter(
        (x) => test(x.variable) || test(x.display_label || "") || test(x.question_text || ""),
      ),
      invalidRegex: re === null,
    };
  }, [questions, filter]);

  if (questions.length === 0) return null;
  return (
    <div className="op-card">
      <h3 className="mb-2 text-sm font-semibold">
        Questions du sondage{" "}
        <span className="font-normal text-base-content/45">
          ({filter.trim() ? `${shown.length}/${questions.length}` : questions.length})
        </span>
      </h3>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer (regex)…"
        className={`input input-sm input-bordered mb-2 w-full text-sm ${invalidRegex ? "input-error" : ""}`}
      />
      <div className="max-h-96 space-y-0.5 overflow-y-auto pr-1">
        {shown.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-base-content/50">Aucune question ne correspond.</p>
        )}
        {shown.map((x) => {
          const active = x.variable === currentVariable;
          return (
            <Link
              key={x.variable}
              to={`/sondage/${surveyId}/q/${encodeURIComponent(x.variable)}`}
              className={`block rounded-lg px-2 py-1.5 text-sm leading-snug ${
                active ? "bg-primary/10 font-medium text-primary" : "hover:bg-base-200 hover:text-primary"
              }`}
            >
              <span className="mr-1.5 font-mono text-xs text-base-content/40">{x.variable}</span>
              {(() => {
                const label = x.display_label || x.question_text;
                return label.slice(0, 60) + (label.length > 60 ? "…" : "");
              })()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
