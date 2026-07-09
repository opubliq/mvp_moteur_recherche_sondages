import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import { fetchSurvey } from "../api";
import type { SearchResult, SurveyParent } from "../types";
import QuestionCard from "./QuestionCard";
import { useCart, toCartItem } from "../context/CartContext";
import { exportCart } from "../lib/exportCart";

const LANG_LABELS: Record<string, string> = { fr: "Français", en: "Anglais" };

/** Vue détail d'un sondage : en-tête + actions + liste exhaustive des questions. */
export default function SurveyDetail({ surveyId }: { surveyId: string }) {
  const { add } = useCart();
  const [survey, setSurvey] = useState<SurveyParent | null>(null);
  const [questions, setQuestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  const title = survey?.survey_name ?? surveyId;
  const meta = survey
    ? [
        survey.pollster,
        survey.survey_year != null ? String(survey.survey_year) : null,
        survey.language ? LANG_LABELS[survey.language] ?? survey.language : null,
        survey.n_respondents != null ? `N = ${survey.n_respondents.toLocaleString("fr-CA")}` : null,
      ].filter(Boolean)
    : [];

  const nonSociodemo = questions.filter((q) => !q.is_sociodemo);

  return (
    <div className="space-y-5">
      <div className="crumbs">
        <Link to="/recherche">Recherche</Link>
        <span className="sep">/</span>
        <span className="text-base-content/60">{title}</span>
      </div>

      <header className="op-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold leading-snug tracking-tight">{title}</h1>
            {meta.length > 0 && <p className="mt-2 text-sm text-base-content/60">{meta.join(" · ")}</p>}
            {survey?.survey_description && (
              <p className="mt-3 leading-snug text-base-content/70">{survey.survey_description}</p>
            )}
            {survey && survey.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {survey.tags.map((t) => (
                  <span key={t} className="badge badge-ghost badge-sm">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              className="btn btn-primary btn-sm gap-1.5"
              onClick={() => nonSociodemo.forEach((q) => add(toCartItem(q)))}
              disabled={nonSociodemo.length === 0}
            >
              <Plus size={16} strokeWidth={2} /> Tout ajouter à l'export
            </button>
            <button
              className="btn btn-outline btn-sm gap-1.5"
              onClick={() => exportCart(nonSociodemo.map(toCartItem), "csv-large")}
              disabled={nonSociodemo.length === 0}
            >
              <Download size={16} strokeWidth={1.75} /> Télécharger le sondage
            </button>
          </div>
        </div>
      </header>

      {loading && (
        <div className="py-20 text-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <h2 className="text-lg font-semibold">
            {questions.length} question{questions.length > 1 ? "s" : ""}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100">
            {questions.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
