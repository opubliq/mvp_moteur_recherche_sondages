import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Globe } from "lucide-react";
import type { SearchResult } from "../types";
import QuestionCard from "./QuestionCard";
import ScoreMiniDist from "./ScoreMiniDist";

export interface SurveyGroupData {
  survey_id: string;
  survey_name: string;
  survey_year: number | null;
  pollster: string | null;
  is_private?: boolean;
  questions: SearchResult[];
}

/** Un sondage = un en-tête + ses questions correspondantes. */
export default function SurveyGroup({ group }: { group: SurveyGroupData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const meta = [
    group.pollster,
    group.survey_year != null ? String(group.survey_year) : null,
  ].filter(Boolean);

  // Le résumé d'un sondage est sa mini-distribution (bead 9gf.16) : elle montre
  // déjà où se situe le meilleur score, donc le badge « meilleur score » qui
  // vivait ici faisait doublon.
  const scores = group.questions
    .map((q) => q.score_pertinence)
    .filter((s): s is number => s !== undefined);

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
        {group.is_private === true && (
          <span
            className="op-badge op-badge-exclusive shrink-0"
            title="Exclusif — issu de l'index de votre compte, invisible aux autres clients"
          >
            <Sparkles size={11} strokeWidth={2.5} /> Exclusif
          </span>
        )}
        {group.is_private === false && (
          <span
            className="op-badge op-badge-public shrink-0"
            title="Public — issu du corpus partagé, visible par tous les comptes"
          >
            <Globe size={11} strokeWidth={2.5} /> Public
          </span>
        )}

        <div className="ml-auto mr-2 flex items-center gap-2">
          <ScoreMiniDist scores={scores} />
          <span className="ml-1 text-xs text-base-content/40">
            ({group.questions.length})
          </span>
        </div>

        <Link
          to={`/sondage/${group.survey_id}`}
          className="btn btn-outline btn-xs relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          Voir le sondage
        </Link>
      </div>

      <div className="collapse-content !px-0 !pb-0">
        <div className="border-t border-base-content/10">
          {group.questions.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </div>
      </div>
    </section>
  );
}
