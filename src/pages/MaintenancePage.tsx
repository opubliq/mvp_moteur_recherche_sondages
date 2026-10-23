import { useState, type FormEvent } from "react";
import { apiUrl } from "../api";

type Status = "idle" | "busy" | "done" | "error";

/**
 * Page affichée sur toutes les routes quand le build a VITE_MAINTENANCE=1
 * (infra Search/LLM coupée faute de crédits Azure, 2026-10-23).
 */
export default function MaintenancePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("busy");
    try {
      const res = await fetch(apiUrl("/waitlist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12">
      <div className="op-card w-full max-w-md p-8 text-center">
        <img src="/opubliq-symbole.png" alt="Opubliq" className="h-12 mx-auto mb-6" />
        <h1 className="text-xl font-semibold mb-3">Le moteur de recherche de sondages est en pause</h1>
        <p className="opacity-80 mb-6">
          Notre outil pour explorer des milliers de questions de sondages canadiens revient bientôt.
          Laissez votre courriel pour être avisé de son retour.
        </p>

        {status === "done" ? (
          <p className="text-success font-medium mb-6">Merci! On vous écrit dès que c'est de retour.</p>
        ) : (
          <form className="flex flex-col gap-3 mb-6" onSubmit={handleSubmit}>
            <input
              type="email"
              className="input input-bordered w-full"
              placeholder="votre@courriel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <button type="submit" className="btn btn-primary w-full" disabled={status === "busy"}>
              {status === "busy" ? "Envoi…" : "M'aviser du retour"}
            </button>
            {status === "error" && (
              <p className="text-error text-sm">
                Erreur d'envoi. Écrivez-nous à <a className="link" href="mailto:info@opubliq.com">info@opubliq.com</a>.
              </p>
            )}
          </form>
        )}

        <a href="https://opubliq.com" className="link link-primary">
          Découvrir Opubliq →
        </a>
      </div>
    </div>
  );
}
