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

  return (
    <section className="collapse collapse-arrow bg-base-100 shadow-sm border border-base-300">
      <input
        type="checkbox"
        checked={isExpanded}
        onChange={() => setIsExpanded(!isExpanded)}
      />
      <div className="collapse-title !flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-12">
        <span className="text-lg font-semibold">
          {group.survey_name}
        </span>
        {meta.length > 0 && (
          <span className="text-sm opacity-60">{meta.join(" · ")}</span>
        )}
        <span className="badge badge-sm ml-auto mr-2">
          {group.questions.length} question
          {group.questions.length > 1 ? "s" : ""}
        </span>
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
