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
export default function SurveyGroup({ group }: { group: SurveyGroupData }) {
  const meta = [
    group.pollster,
    group.survey_year != null ? String(group.survey_year) : null,
  ].filter(Boolean);

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-base-300 pb-2">
        <h3 className="text-lg font-semibold">{group.survey_name}</h3>
        {meta.length > 0 && (
          <span className="text-sm opacity-60">{meta.join(" · ")}</span>
        )}
        <span className="badge badge-sm ml-auto">
          {group.questions.length} question
          {group.questions.length > 1 ? "s" : ""}
        </span>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {group.questions.map((q) => (
          <QuestionCard key={q.id} q={q} />
        ))}
      </div>
    </section>
  );
}
