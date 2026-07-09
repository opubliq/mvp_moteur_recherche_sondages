/** Placeholder de l'analyse qualitative des questions ouvertes (EPIC Verbatims). */
export default function VerbatimsPage() {
  return (
    <>
      <p className="op-kicker mb-3">Analyse qualitative · à venir</p>
      <h2 className="text-xl font-semibold tracking-tight">Questions ouvertes du corpus</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-base-content/60">
        Explore les réponses libres par thématique émergente. Chaque question ouvrira son dashboard de verbatims
        (nuage de thèmes, citations représentatives, filtrage sociodémo).
      </p>

      <div className="op-card max-w-2xl">
        <div className="flex flex-wrap gap-2">
          {["eau (42)", "déchets (31)", "circulation (28)", "espaces verts (19)", "bruit (12)"].map((t) => (
            <span key={t} className="op-badge op-badge-plain">
              {t}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-base-content/50">
          L'ingestion des données brutes (réponses libres) alimentera cette vue.
        </p>
      </div>
    </>
  );
}
