import type { SearchPhase } from "../context/SearchContext";
import type { Concept } from "../types";

interface SearchProgressProps {
  phase: SearchPhase;
  /** Concepts déjà extraits — permet d'afficher le RÉSULTAT de l'étape 1, pas juste sa fin. */
  concepts: Concept[];
}

interface Step {
  key: SearchPhase;
  label: string;
  /** Ce que fait l'étape, en clair. Affiché seulement quand l'étape est active. */
  detail: string;
}

/**
 * Les deux seules étapes réellement observables depuis le client (voir
 * `SearchPhase`). La récupération Azure et le rerank Cohere sont volontairement
 * fondus dans une seule ligne : ils partagent le même fetch `/search`, et les
 * annoncer séparément afficherait une progression inventée.
 */
const STEPS: Step[] = [
  {
    key: "decompose",
    label: "Analyse de la requête",
    detail: "Décomposition en concepts et reformulation pour le classement",
  },
  {
    key: "retrieve",
    label: "Recherche et classement",
    detail: "Récupération dans le corpus, puis classement par pertinence",
  },
];

export default function SearchProgress({ phase, concepts }: SearchProgressProps) {
  if (phase === "idle") return null;

  const activeIndex = STEPS.findIndex((s) => s.key === phase);

  return (
    <div className="op-card" aria-live="polite">
      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;

          return (
            <li key={step.key} className="flex gap-3">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {done ? (
                  <span className="text-success text-sm leading-none">✓</span>
                ) : active ? (
                  <span className="loading loading-spinner loading-xs text-primary" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-base-content/20" />
                )}
              </span>

              <div className="min-w-0">
                <p
                  className={
                    active
                      ? "text-sm font-medium"
                      : done
                        ? "text-sm text-base-content/60"
                        : "text-sm text-base-content/30"
                  }
                >
                  {step.label}
                </p>

                {active && <p className="mt-0.5 text-xs text-base-content/50">{step.detail}</p>}

                {/* L'étape 1 terminée a quelque chose de concret à montrer : ce
                    qu'elle a trouvé. C'est plus utile qu'un simple « fait ». */}
                {done && step.key === "decompose" && concepts.length > 0 && (
                  <p className="mt-0.5 text-xs text-base-content/50">
                    {concepts.length} concept{concepts.length > 1 ? "s" : ""} :{" "}
                    {concepts.map((c) => c.orig).join(", ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
