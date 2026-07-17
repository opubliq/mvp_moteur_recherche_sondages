import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Plus, Download } from "lucide-react";
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
            <h1 className="text-xl font-semibold leading-snug">{q.question_text}</h1>
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
            <VerbatimsStub />
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
          <div className="op-card">
            <h3 className="mb-2 text-sm font-semibold">Autres questions du sondage</h3>
            {questions
              .filter((x) => x.variable !== q.variable)
              .slice(0, 6)
              .map((x) => (
                <Link
                  key={x.variable}
                  to={`/sondage/${x.survey_id}/q/${encodeURIComponent(x.variable)}`}
                  className="block py-1.5 text-sm leading-snug hover:text-primary"
                >
                  {x.question_text.slice(0, 70)}{x.question_text.length > 70 ? "…" : ""}
                </Link>
              ))}
          </div>
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

      {kind === "continuous" ? (
        <Histogram rows={dist} mean={stat?.mean} />
      ) : (
        <DistributionBars rows={dist} options={q.response_options} ordinal={q.is_ordinal || kind === "scale"} />
      )}

      <p className="mt-3 text-xs text-base-content/45">
        Base : {formatN(totalRaw)} répondants · pondéré
        {kind === "continuous" && refusal.length > 0 ? " · refus/NSP exclus" : ""}
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
  const [cross, setCross] = useState<CrosstabRow[] | null>(null);
  const [means, setMeans] = useState<MeanByGroupRow[] | null>(null);
  const [domain, setDomain] = useState<{ min: number; max: number; overall?: number } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const numeric = kind === "scale" || kind === "continuous";
  const dimQ = useMemo(() => dims.find((d) => d.variable === dimVar), [dims, dimVar]);
  // continuous : moyenne uniquement (empilé 100% d'un continu n'a pas de sens).
  const effMode: "mean" | "stacked" = kind === "continuous" ? "mean" : mode;
  const refusal = useMemo(() => refusalCodes(q.response_options), [q]);
  // Refus/NSP EXCLUS par défaut (moyenne comme empilé) ; toggle pour les inclure.
  const exclude = useMemo(
    () => (includeRefusal ? [] : refusal),
    [includeRefusal, refusal],
  );

  useEffect(() => {
    if (!dimVar) return;
    let cancelled = false;
    setState("loading");
    setCross(null);
    setMeans(null);

    const useMean = numeric && effMode === "mean";
    if (useMean) {
      Promise.all([
        fetchMicrodata<MeanByGroupRow>({ surveyId: q.survey_id, target: q.variable, dim: dimVar, agg: "mean", exclude }),
        fetchMicrodata<MeanRow>({ surveyId: q.survey_id, target: q.variable, agg: "mean", exclude }),
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
      fetchMicrodata<CrosstabRow>({ surveyId: q.survey_id, target: q.variable, dim: dimVar, exclude })
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
  }, [q, dimVar, effMode, numeric, exclude]);

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
        {numeric && kind === "scale" && (
          <div className="join">
            <button className={`btn join-item btn-xs ${effMode === "mean" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("mean")}>Moyenne</button>
            <button className={`btn join-item btn-xs ${effMode === "stacked" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("stacked")}>Distribution</button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DimSelect socioDims={socioDims} otherDims={otherDims} value={dimVar} onChange={setDimVar} />
        {refusal.length > 0 && (
          <label className="label cursor-pointer gap-2 text-xs">
            <input type="checkbox" className="checkbox checkbox-xs" checked={includeRefusal} onChange={(e) => setIncludeRefusal(e.target.checked)} />
            inclure refus/NSP
          </label>
        )}
      </div>

      {state === "loading" && <div className="py-8 text-center"><span className="loading loading-spinner" /></div>}
      {state === "error" && <p className="text-sm text-error">Échec du croisement.</p>}
      {state === "ok" && dimQ && (() => {
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
        const shortTarget = clip(q.display_label || q.question_text, 64);
        const shortDim = clip(dimQ.display_label || dimQ.question_text, 52);
        return (
          <>
            {numeric && effMode === "mean" && means && domain ? (
              <MeanByGroup rows={means} dimOptions={dimQ.response_options} domainMin={domain.min} domainMax={domain.max} overallMean={domain.overall} targetName={shortTarget} dimName={shortDim} />
            ) : cross && numeric ? (
              // Cible scale/continuous en mode « Distribution » : ridgeline (une
              // densité par sous-groupe sur un axe X commun) plutôt qu'un empilé
              // 100 % qui n'exprime pas la forme d'une échelle.
              <RidgePlot rows={cross} dimOptions={dimQ.response_options} targetName={shortTarget} dimName={shortDim} />
            ) : cross ? (
              <StackedBars100 rows={cross} targetOptions={q.response_options} dimOptions={dimQ.response_options} ordinal={q.is_ordinal || kind === "scale"} targetName={shortTarget} dimName={shortDim} />
            ) : null}
            <p className="mt-2 text-xs text-base-content/45">
              {numeric && effMode === "stacked"
                ? "Densité pondérée par sous-groupe (axe commun)."
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
function VerbatimsStub() {
  return (
    <div className="op-card">
      <h3 className="mb-3 font-semibold">
        Analyse des verbatims <span className="op-badge op-badge-plain">à venir</span>
      </h3>
      <p className="text-sm text-base-content/50">
        Question ouverte : les réponses libres alimenteront ce panneau (nuage de thèmes + citations).
      </p>
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
