import { useEffect, useState } from "react";
import { fetchSurvey } from "../api";
import type { SearchResult, SurveyParent } from "../types";
import QuestionCard from "./QuestionCard";

interface SurveyDetailProps {
  surveyId: string;
  /** Métadonnées déjà connues depuis la recherche (fallback d'en-tête). */
  fallbackName?: string;
  onBack: () => void;
}

const LANG_LABELS: Record<string, string> = { fr: "Français", en: "Anglais" };

/** Vue détail d'un sondage : en-tête + liste exhaustive de ses questions. */
export default function SurveyDetail({
  surveyId,
  fallbackName,
  onBack,
}: SurveyDetailProps) {
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

  const title = survey?.survey_name ?? fallbackName ?? surveyId;
  const meta = survey
    ? [
        survey.pollster,
        survey.survey_year != null ? String(survey.survey_year) : null,
        survey.language ? (LANG_LABELS[survey.language] ?? survey.language) : null,
        survey.n_respondents != null ? `n = ${survey.n_respondents}` : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        ← Retour à la recherche
      </button>

      <header className="space-y-2 border-b border-base-300 pb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {meta.length > 0 && (
          <p className="text-sm opacity-60">{meta.join(" · ")}</p>
        )}
        {survey && survey.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {survey.tags.map((t) => (
              <span key={t} className="badge badge-ghost badge-sm">
                {t}
              </span>
            ))}
          </div>
        )}
        {!loading && !error && (
          <p className="text-sm opacity-60">
            {questions.length} question{questions.length > 1 ? "s" : ""}
          </p>
        )}
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
        <div className="grid gap-3 md:grid-cols-2">
          {questions.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}
