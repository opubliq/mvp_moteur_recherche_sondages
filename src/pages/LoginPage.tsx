import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthError, useAuth } from "../context/AuthContext";

function errorMessage(err: unknown): string {
  if (err instanceof AuthError) {
    if (err.code === "invalid_credentials") return "Email ou mot de passe incorrect.";
    return err.code; // messages de validation déjà en français côté serveur
  }
  return "Connexion impossible pour le moment.";
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/recherche";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full py-12">
      <form className="op-card w-full max-w-sm p-6" onSubmit={handleSubmit}>
        <h1 className="text-lg font-semibold mb-4">Connexion</h1>

        <label className="form-control mb-3">
          <span className="label-text mb-1">Email</span>
          <input
            type="email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="form-control mb-4">
          <span className="label-text mb-1">Mot de passe</span>
          <input
            type="password"
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="text-error text-sm mb-3">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>

        <p className="text-sm mt-4 text-center opacity-70">
          Pas de compte ? <Link to="/inscription" className="link">Créer un compte</Link>
        </p>
      </form>
    </div>
  );
}
