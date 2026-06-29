import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

/** Barre de recherche : champ + bouton, soumission au submit. */
export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState("");

  return (
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
        placeholder="Rechercher un concept, un thème, une question…"
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
          "Rechercher"
        )}
      </button>
    </form>
  );
}
