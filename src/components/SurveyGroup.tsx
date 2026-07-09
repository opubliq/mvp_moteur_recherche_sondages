import { useState } from "react";
import type { SearchResult } from "../types";
import QuestionCard from "./QuestionCard";

export interface SurveyGroupData {
  survey_id: string;
  survey_name: string;
  survey_year: number | null;
  pollster: string | null;
  questions: SearchResult[];
}

/** Un sondage = un en-tête + ses questions correspondantes. */
export default function SurveyGroup({
  group,
  onOpenSurvey,
}: {
  group: SurveyGroupData;
  onOpenSurvey: (surveyId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const meta = [
    group.pollster,
    group.survey_year != null ? String(group.survey_year) : null,
  ].filter(Boolean);

  // Calcul des statistiques de pertinence pour ce groupe
  const stats = group.questions.reduce(
    (acc, q) => {
      if (q.pertinence) acc[q.pertinence] = (acc[q.pertinence] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <section className="collapse collapse-arrow rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
      <input
        type="checkbox"
        checked={isExpanded}
        onChange={() => setIsExpanded(!isExpanded)}
      />
      <div className="collapse-title !flex flex-wrap items-center gap-x-3 gap-y-1 pr-12">
        <span className="text-lg font-semibold">
          {group.survey_name}
        </span>
        {meta.length > 0 && (
          <span className="text-sm text-base-content/60">{meta.join(" · ")}</span>
        )}

        <div className="ml-auto mr-2 flex items-center gap-2">
          {stats["Exact"] > 0 && (
            <span className="op-badge op-badge-exact" title="Matches Exacts">
              {stats["Exact"]} Exact
            </span>
          )}
          {stats["Partiel"] > 0 && (
            <span className="op-badge op-badge-partiel" title="Matches Partiels">
              {stats["Partiel"]} Partiel
            </span>
          )}
          {stats["Faible"] > 0 && (
            <span className="op-badge op-badge-faible" title="Matches Faibles">
              {stats["Faible"]} Faible
            </span>
          )}
          <span className="ml-1 text-xs text-base-content/40">
            ({group.questions.length})
          </span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-xs relative z-10"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSurvey(group.survey_id);
          }}
        >
          Voir le sondage
        </button>
      </div>

      <div className="collapse-content">
        <div className="grid gap-3 pt-4 md:grid-cols-2">
          {group.questions.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </div>
      </div>
    </section>
  );
}
