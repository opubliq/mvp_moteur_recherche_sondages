import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Plus, Download } from "lucide-react";
import { fetchSurvey } from "../api";
import type { SearchResult, SurveyParent } from "../types";
import { useCart, toCartItem } from "../context/CartContext";
import { mockDistribution, mockCrossTab } from "../lib/mockDist";

const SOCIODEMO_FILTERS: Record<string, string[]> = {
  Âge: ["18-34", "35-54", "55+"],
  Genre: ["Femme", "Homme"],
  Région: ["Centre", "Banlieue", "Rural"],
  Revenu: ["< 50k", "50-100k", "100k+"],
  Scolarité: ["Sec.", "Collég.", "Univ."],
};

function isOpen(q: SearchResult): boolean {
  return q.is_open === true || q.response_options.length === 0;
}

export default function QuestionDashboard() {
  const { surveyId, variable } = useParams<{ surveyId: string; variable: string }>();
  const { has, toggle } = useCart();

  const [survey, setSurvey] = useState<SurveyParent | null>(null);
  const [questions, setQuestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crossVar, setCrossVar] = useState<string | null>(null);

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
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const q = useMemo(() => questions.find((x) => x.variable === variable), [questions, variable]);

  // Questions croisables : fermées, autres que la question courante.
  const crossable = useMemo(
    () => questions.filter((x) => x.variable !== variable && x.response_options.length > 0),
    [questions, variable],
  );
  const crossQ = useMemo(
    () => crossable.find((x) => x.variable === crossVar) ?? crossable[0] ?? null,
    [crossable, crossVar],
  );

  if (loading) {
    return (
      <div className="py-20 text-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  if (error) return <div className="alert alert-error"><span>{error}</span></div>;
  if (!q) return <p>Question introuvable.</p>;

  const surveyName = survey?.survey_name ?? surveyId;
  const inCart = has(q.survey_id, q.variable);
  const open = isOpen(q);

  const dist = open ? [] : mockDistribution(q.variable, q.response_options.length);
  const maxPct = Math.max(1, ...dist);

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
              {/* Pas de badge de pertinence ici : cette vue vient de /survey,
                  qui ne reranke pas — il n'y a donc aucun score Cohere à montrer. */}
              {open && <span className="op-badge op-badge-plain">question ouverte</span>}
            </div>
            <h1 className="text-xl font-semibold leading-snug">{q.question_text}</h1>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              className={`btn btn-sm gap-1.5 ${inCart ? "btn-outline" : "btn-primary"}`}
              onClick={() => toggle(toCartItem(q))}
            >
              {inCart ? <><Check size={16} strokeWidth={2} /> Dans l'export</> : <><Plus size={16} strokeWidth={2} /> Ajouter à l'export</>}
            </button>
            <button className="btn btn-outline btn-sm gap-1.5" disabled>
              <Download size={16} strokeWidth={1.75} /> Données brutes
            </button>
          </div>
        </div>
      </header>

      <div className="grid-dash">
        <div className="space-y-4">
          {open ? (
            <div className="op-card">
              <h3 className="mb-3 font-semibold">
                Analyse des verbatims <span className="op-badge op-badge-plain">à venir</span>
              </h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {["eau (42)", "déchets (31)", "circulation (28)", "espaces verts (19)"].map((t) => (
                  <span key={t} className="op-badge op-badge-plain">{t}</span>
                ))}
              </div>
              <p className="text-sm text-base-content/50">
                Les réponses libres alimenteront ce panneau (nuage de thèmes + citations).
              </p>
            </div>
          ) : (
            <>
              <div className="op-card">
                <h3 className="mb-3 font-semibold">Distribution des réponses</h3>
                {q.response_options.map((o, i) => (
                  <div key={o.code} className="dist-row">
                    <span className="leading-snug">{o.label}</span>
                    <div className="dist-track">
                      <div className="dist-fill" style={{ width: `${(dist[i] / maxPct) * 100}%` }} />
                    </div>
                    <span className="dist-pct">{dist[i]}%</span>
                  </div>
                ))}
                <p className="mt-3 text-xs text-base-content/40">
                  {survey?.n_respondents != null ? `Base : ${survey.n_respondents.toLocaleString("fr-CA")} répondants · ` : ""}
                  données illustratives
                </p>
              </div>

              <div className="op-card">
                <h3 className="mb-2 font-semibold">Croiser avec une autre question</h3>
                {crossable.length === 0 ? (
                  <p className="text-sm text-base-content/60">Aucune question croisable dans ce sondage.</p>
                ) : (
                  <>
                    <select
                      className="select select-bordered select-sm mb-3 w-full max-w-xl"
                      value={crossQ?.variable ?? ""}
                      onChange={(e) => setCrossVar(e.target.value)}
                    >
                      {crossable.map((x) => (
                        <option key={x.variable} value={x.variable}>
                          {x.question_text.slice(0, 80)}
                        </option>
                      ))}
                    </select>
                    {crossQ && (
                      <CrossTab rowQ={q} colQ={crossQ} />
                    )}
                    <p className="mt-2 text-xs text-base-content/40">Répartition en ligne (%) · données illustratives</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="op-card">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-content/55">
              Filtres sociodémo
            </h3>
            {Object.entries(SOCIODEMO_FILTERS).map(([label, opts]) => (
              <div key={label} className="mb-3">
                <div className="facet-h">{label}</div>
                <div className="flex flex-wrap gap-1">
                  {opts.map((o) => (
                    <span key={o} className="op-badge op-badge-plain cursor-pointer">{o}</span>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn btn-primary btn-sm mt-1 w-full" disabled>Appliquer les filtres</button>
          </div>

          <div className="op-card">
            <h3 className="mb-2 text-sm font-semibold">Autres questions du sondage</h3>
            {questions
              .filter((x) => x.variable !== q.variable)
              .slice(0, 5)
              .map((x) => (
                <Link
                  key={x.variable}
                  to={`/sondage/${x.survey_id}/q/${encodeURIComponent(x.variable)}`}
                  className="block py-1.5 text-sm leading-snug hover:text-primary"
                >
                  {x.question_text.slice(0, 70)}
                  {x.question_text.length > 70 ? "…" : ""}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Heatmap illustrative rows(q) × cols(other). */
function CrossTab({ rowQ, colQ }: { rowQ: SearchResult; colQ: SearchResult }) {
  const rows = rowQ.response_options;
  const cols = colQ.response_options;
  const matrix = mockCrossTab(rowQ.variable, colQ.variable, rows.length, cols.length);

  return (
    <div className="overflow-x-auto">
      <table className="xtab">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c.code}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.code}>
              <td className="rowh">{r.label}</td>
              {cols.map((c, ci) => {
                const v = matrix[ri][ci];
                const alpha = Math.round((v / 60) * 55);
                return (
                  <td
                    key={c.code}
                    className="cell"
                    style={{ background: `color-mix(in oklch, var(--color-primary) ${alpha}%, white)` }}
                  >
                    {v}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
