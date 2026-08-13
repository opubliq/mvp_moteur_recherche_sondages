import type { SearchPhase } from "../context/SearchContext";
import type { Concept } from "../types";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/fr";

interface SearchProgressProps {
  phase: SearchPhase;
  /** Concepts déjà extraits — permet d'afficher le RÉSULTAT de l'étape 1, pas juste sa fin. */
  concepts: Concept[];
}

interface Step {
  key: SearchPhase;
  labelKey: TranslationKey;
  /** Ce que fait l'étape, en clair. Affiché seulement quand l'étape est active. */
  detailKey: TranslationKey;
}

/**
 * Les deux seules étapes réellement observables depuis le client (voir
 * `SearchPhase`). La récupération Azure et le rerank Cohere sont volontairement
 * fondus dans une seule ligne : ils partagent le même fetch `/search`, et les
 * annoncer séparément afficherait une progression inventée.
 */
const STEPS: Step[] = [
  { key: "decompose", labelKey: "searchProgress.decompose.label", detailKey: "searchProgress.decompose.detail" },
  { key: "retrieve", labelKey: "searchProgress.retrieve.label", detailKey: "searchProgress.retrieve.detail" },
];

export default function SearchProgress({ phase, concepts }: SearchProgressProps) {
  const { t } = useLanguage();
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
                  {t(step.labelKey)}
                </p>

                {active && <p className="mt-0.5 text-xs text-base-content/50">{t(step.detailKey)}</p>}

                {/* L'étape 1 terminée a quelque chose de concret à montrer : ce
                    qu'elle a trouvé. C'est plus utile qu'un simple « fait ». */}
                {done && step.key === "decompose" && concepts.length > 0 && (
                  <p className="mt-0.5 text-xs text-base-content/50">
                    {concepts.length} {t(concepts.length > 1 ? "searchProgress.concepts" : "searchProgress.concept")} :{" "}
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
