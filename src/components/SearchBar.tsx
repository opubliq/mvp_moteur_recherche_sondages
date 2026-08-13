import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

/** Barre de recherche : champ + bouton, soumission au submit. */
export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");

  return (
    <div className="op-card">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSearch(value.trim());
        }}
      >
        <input
          type="search"
          className="input input-bordered flex-1"
          placeholder={t("search.bar.placeholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !value.trim()}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            t("search.bar.submit")
          )}
        </button>
      </form>
    </div>
  );
}
