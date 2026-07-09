import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { SearchFilters, SearchFacets } from "../types";

interface FacetsProps {
  facets: SearchFacets | null;
  /** Facettes globales du corpus (tous les sondeurs, toutes les années). */
  globalFacets: SearchFacets | null;
  /** Thèmes extraits des résultats courants (client). */
  themes: string[];
  filters: SearchFilters;
  onFilterChange: (next: SearchFilters) => void;
}

const LANG_LABELS: Record<string, string> = { fr: "Français", en: "Anglais" };

/**
 * Panneau de facettes avancé :
 * - Période (Range année min/max)
 * - Sondeurs (Recherche + Multi-sélection)
 * - Langues (Multi-sélection)
 * - Thèmes (Multi-sélection sur les résultats)
 */
export default function Facets({
  facets,
  globalFacets,
  themes,
  filters,
  onFilterChange,
}: FacetsProps) {
  const [pollsterQuery, setPollsterQuery] = useState("");

  const pollsterOptions = useMemo(() => {
    if (!globalFacets?.pollsters) return [];
    // On prend tous les sondeurs du corpus
    return globalFacets.pollsters.map(gp => {
      // On cherche si on a un compte dans les résultats de recherche actuels
      const match = facets?.pollsters.find(p => p.value === gp.value);
      return {
        value: gp.value,
        count: match ? match.count : 0
      };
    }).filter((p) =>
      p.value.toLowerCase().includes(pollsterQuery.toLowerCase())
    );
  }, [globalFacets?.pollsters, facets?.pollsters, pollsterQuery]);

  const yearOptions = useMemo(() => {
    if (!globalFacets?.years) return [];
    return globalFacets.years;
  }, [globalFacets?.years]);

  const toggleItem = (field: keyof SearchFilters, value: string) => {
    const current = (filters[field] as string[]) || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({
      ...filters,
      [field]: next.length > 0 ? (next as any) : undefined,
    });
  };

  const handleYearChange = (field: "year_min" | "year_max", value: string) => {
    onFilterChange({
      ...filters,
      [field]: value ? Number(value) : undefined,
    });
  };

  const hasAnyFilter = Object.keys(filters).length > 0;

  if (!facets && themes.length === 0) return null;

  return (
    <aside className="op-card flex flex-col gap-6 self-start w-64 sticky top-4">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/55">
            Filtres
          </h2>
          {hasAnyFilter && (
            <button
              onClick={() => onFilterChange({})}
              className="text-[10px] font-bold uppercase text-primary hover:text-primary-focus transition cursor-pointer"
            >
              Effacer tout
            </button>
          )}
        </div>

        {/* ANNÉES */}
        <div className="mb-6">
          <h3 className="text-xs font-bold mb-2 flex items-center justify-between">
            Période
            {(filters.year_min || filters.year_max) && (
                <X 
                  className="w-3 h-3 cursor-pointer text-base-content/30 hover:text-error" 
                  onClick={() => onFilterChange({ ...filters, year_min: undefined, year_max: undefined })}
                />
            )}
          </h3>
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-xs w-full font-normal"
              value={filters.year_min ?? ""}
              onChange={(e) => handleYearChange("year_min", e.target.value)}
            >
              <option value="">De</option>
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.value}
                </option>
              ))}
            </select>
            <span className="text-base-content/30">—</span>
            <select
              className="select select-bordered select-xs w-full font-normal"
              value={filters.year_max ?? ""}
              onChange={(e) => handleYearChange("year_max", e.target.value)}
            >
              <option value="">À</option>
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SONDEURS */}
        {pollsterOptions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold mb-2 flex items-center justify-between">
              Sondeurs
              {filters.pollsters && (
                  <X 
                    className="w-3 h-3 cursor-pointer text-base-content/30 hover:text-error" 
                    onClick={() => onFilterChange({ ...filters, pollsters: undefined })}
                  />
              )}
            </h3>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="input input-bordered input-xs w-full pl-8"
                value={pollsterQuery}
                onChange={(e) => setPollsterQuery(e.target.value)}
              />
              {pollsterQuery && (
                <button
                  onClick={() => setPollsterQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3 h-3 text-base-content/40 hover:text-error" />
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
              {pollsterOptions.map((p) => (
                <label
                  key={p.value}
                  className={`flex items-center gap-2 cursor-pointer hover:bg-base-200/50 p-1 rounded transition ${p.count === 0 ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-xs rounded-sm"
                    checked={filters.pollsters?.includes(p.value) || false}
                    onChange={() => toggleItem("pollsters", p.value)}
                  />
                  <span className="text-[11px] truncate flex-1" title={p.value}>
                    {p.value}
                  </span>
                  <span className="text-[9px] font-mono text-base-content/30">
                    {p.count}
                  </span>
                </label>
              ))}
              {pollsterOptions.length === 0 && (
                <p className="text-[10px] text-base-content/40 text-center py-4 italic">
                  Aucun sondeur trouvé
                </p>
              )}
            </div>
          </div>
        )}

        {/* LANGUES */}
        {facets?.languages && facets.languages.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold mb-2">Langues</h3>
            <div className="flex flex-wrap gap-1.5">
              {facets.languages.map((l) => {
                const active = filters.languages?.includes(l.value);
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => toggleItem("languages", l.value)}
                    className={`badge badge-sm py-2.5 px-2 cursor-pointer transition border-none text-[10px] font-medium ${
                      active
                        ? "badge-primary"
                        : "bg-base-200 text-base-content/70 hover:bg-base-300"
                    }`}
                  >
                    {LANG_LABELS[l.value] || l.value}
                    <span className={`ml-1 opacity-50 ${active ? "text-primary-content" : ""}`}>
                      ({l.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* THÈMES */}
        {themes.length > 0 && (
          <div>
            <h3 className="text-xs font-bold mb-2">Thèmes détectés</h3>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t) => {
                const active = filters.themes?.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleItem("themes", t)}
                    className={`badge badge-sm py-2.5 px-2 cursor-pointer transition border-none text-[10px] font-medium ${
                      active
                        ? "badge-secondary"
                        : "bg-base-200 text-base-content/70 hover:bg-base-300"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
