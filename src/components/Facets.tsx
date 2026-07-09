import type { SearchFilters } from "../types";

export interface FacetOptions {
  years: number[];
  pollsters: string[];
  languages: string[];
  themes: string[];
}

interface FacetsProps {
  options: FacetOptions;
  /** Filtres envoyés au serveur (année, sondeur, langue). */
  filters: SearchFilters;
  onFilterChange: (next: SearchFilters) => void;
  /** Filtre thème, appliqué côté client (champ collection non filtrable côté serveur). */
  themeFilter: string | null;
  onThemeChange: (theme: string | null) => void;
}

const LANG_LABELS: Record<string, string> = { fr: "Français", en: "Anglais" };

/** Panneau de facettes : année, sondeur, langue (serveur) + thèmes (client). */
export default function Facets({
  options,
  filters,
  onFilterChange,
  themeFilter,
  onThemeChange,
}: FacetsProps) {
  const hasAny =
    options.years.length ||
    options.pollsters.length ||
    options.languages.length ||
    options.themes.length;

  if (!hasAny) return null;

  return (
    <aside className="op-card flex flex-col gap-4 self-start">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/55">
          Filtres
        </h2>

        {options.years.length > 0 && (
          <label className="form-control">
            <span className="label-text mb-1">Année</span>
            <select
              className="select select-bordered select-sm"
              value={filters.survey_year ?? ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  survey_year: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <option value="">Toutes</option>
              {options.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}

        {options.pollsters.length > 0 && (
          <label className="form-control">
            <span className="label-text mb-1">Sondeur</span>
            <select
              className="select select-bordered select-sm"
              value={filters.pollster ?? ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  pollster: e.target.value || undefined,
                })
              }
            >
              <option value="">Tous</option>
              {options.pollsters.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}

        {options.languages.length > 0 && (
          <label className="form-control">
            <span className="label-text mb-1">Langue</span>
            <select
              className="select select-bordered select-sm"
              value={filters.language ?? ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  language: e.target.value || undefined,
                })
              }
            >
              <option value="">Toutes</option>
              {options.languages.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l] ?? l}
                </option>
              ))}
            </select>
          </label>
        )}

        {options.themes.length > 0 && (
          <div className="form-control">
            <span className="label-text mb-1">Thèmes</span>
            <div className="flex flex-wrap gap-1.5">
              {options.themes.map((t) => {
                const active = themeFilter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`badge badge-sm ${active ? "badge-primary" : "badge-outline"}`}
                    onClick={() => onThemeChange(active ? null : t)}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}
    </aside>
  );
}
