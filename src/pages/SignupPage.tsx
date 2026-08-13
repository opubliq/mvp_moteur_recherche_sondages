import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthError, useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/fr";

function errorMessage(err: unknown, t: (key: TranslationKey) => string): string {
  if (err instanceof AuthError) {
    if (err.code === "invalid_email") return t("auth.signup.invalidEmail");
    if (err.code === "email_taken") return t("auth.signup.emailTaken");
    return err.code; // messages de validation mot de passe déjà en français côté serveur — hors scope f3i.16 (backend)
  }
  return t("auth.signup.genericError");
}

export default function SignupPage() {
  const { t } = useLanguage();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup(email, password);
      navigate("/recherche", { replace: true });
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full py-12">
      <form className="op-card w-full max-w-sm p-6" onSubmit={handleSubmit}>
        <h1 className="text-lg font-semibold mb-4">{t("auth.signup.title")}</h1>

        <label className="form-control mb-3">
          <span className="label-text mb-1">{t("auth.email")}</span>
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
          <span className="label-text mb-1">{t("auth.password")}</span>
          <input
            type="password"
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="label-text-alt mt-1 opacity-60">{t("auth.signup.passwordHint")}</span>
        </label>

        {error && <p className="text-error text-sm mb-3">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </button>

        <p className="text-sm mt-4 text-center opacity-70">
          {t("auth.signup.hasAccount")} <Link to="/connexion" className="link">{t("auth.signup.loginLink")}</Link>
        </p>
      </form>
    </div>
  );
}
