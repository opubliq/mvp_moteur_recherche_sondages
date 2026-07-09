/** Placeholder du futur agent analytique conversationnel (EPIC Agent). */
export default function AgentPage() {
  return (
    <>
      <p className="op-kicker mb-3">Agent analytique · à venir</p>
      <h2 className="text-xl font-semibold tracking-tight">Pose une question en langage naturel</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-base-content/60">
        L'agent trouve les questions pertinentes, exécute du code sur les données brutes et te retourne un court
        rapport structuré. (Maquette)
      </p>

      <div className="mb-5 flex max-w-3xl flex-col gap-3">
        <div className="chat-bubble chat-user">
          Montre l'évolution des attitudes envers l'environnement chez les 55 ans et plus.
        </div>
        <div className="chat-bubble chat-bot">
          J'ai trouvé <b>3 questions comparables</b> (2022, 2023, 2024). Chez les 55&nbsp;ans et plus, la satisfaction
          envers la qualité de l'eau passe de 61&nbsp;% à 75&nbsp;%…
          <div className="mt-2 flex gap-2">
            <span className="op-badge op-badge-exact">3 questions</span>
            <span className="op-badge op-badge-plain">rapport md</span>
          </div>
        </div>
      </div>

      <div className="op-card max-w-3xl">
        <div className="flex items-center gap-2">
          <input className="input input-bordered flex-1" placeholder="Écris ta question…" disabled />
          <button className="btn btn-primary" disabled>
            Envoyer
          </button>
        </div>
      </div>
    </>
  );
}
