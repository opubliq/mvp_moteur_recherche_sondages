import { useEffect, useState } from "react";
import { fetchAllSurveys } from "../api";
import type { SurveyParent } from "../types";

interface ExplorationViewProps {
  onOpenSurvey: (id: string) => void;
}

export default function ExplorationView({ onOpenSurvey }: ExplorationViewProps) {
  const [surveys, setSurveys] = useState<SurveyParent[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllSurveys();
        setSurveys(data.surveys);
        setTotalQuestions(data.total_questions || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="stats shadow bg-base-100 w-full">
        <div className="stat">
          <div className="stat-title">Sondages</div>
          <div className="stat-value text-primary">{surveys.length}</div>
          <div className="stat-desc">Disponibles dans le corpus</div>
        </div>
        <div className="stat">
          <div className="stat-title">Questions</div>
          <div className="stat-value text-secondary">{totalQuestions.toLocaleString()}</div>
          <div className="stat-desc">Indexées et cherchables</div>
        </div>
      </div>

      {/* Liste des sondages */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-1">Chronologie des sondages</h2>
        <div className="grid gap-4">
          {surveys.map((s) => (
            <div
              key={s.id}
              className="card card-side bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onOpenSurvey(s.survey_id)}
            >
              <div className="bg-primary text-primary-content flex flex-col items-center justify-center w-20 rounded-l-2xl font-bold">
                <span className="text-xs opacity-80 uppercase tracking-wider">Année</span>
                <span className="text-xl">{s.survey_year || "???"}</span>
              </div>
              <div className="card-body py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="card-title text-base leading-tight">{s.survey_name}</h3>
                    <p className="text-sm opacity-60 mt-1">
                      {s.pollster} {s.language ? `· ${s.language.toUpperCase()}` : ""}
                    </p>
                  </div>
                  {s.n_respondents && (
                    <div className="badge badge-ghost whitespace-nowrap">
                      N = {s.n_respondents.toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="card-actions justify-end mt-2">
                   {s.tags?.map(tag => (
                     <span key={tag} className="badge badge-outline badge-xs opacity-50">{tag}</span>
                   ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
