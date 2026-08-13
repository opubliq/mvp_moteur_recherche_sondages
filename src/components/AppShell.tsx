import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Search, LayoutGrid, Sparkles, MessageSquare, ShoppingCart, FileSpreadsheet, LogOut, Languages } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchAllSurveys } from "../api";
import { useAnnotations, useUnloadGuard } from "../context/AnnotationContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import type { TranslationKey } from "../i18n/fr";
import ExportDrawer from "./ExportDrawer";

interface ModeDef {
  key: string;
  Ico: LucideIcon;
  labelKey: TranslationKey;
  to: string;
  soon?: boolean;
}

const MODES: ModeDef[] = [
  { key: "recherche", Ico: Search, labelKey: "nav.search", to: "/recherche" },
  { key: "corpus", Ico: LayoutGrid, labelKey: "nav.corpus", to: "/corpus" },
  { key: "agent", Ico: Sparkles, labelKey: "nav.agent", to: "/agent", soon: true },
  { key: "questions-ouvertes", Ico: MessageSquare, labelKey: "nav.openQuestions", to: "/questions-ouvertes" },
  { key: "exportation-avancee", Ico: FileSpreadsheet, labelKey: "nav.advancedExport", to: "/exportation-avancee" },
];

export default function AppShell() {
  const { size } = useCart();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  // Garde-fou de sortie au niveau de la coquille, pas de l'espace d'annotation :
  // un run non téléchargé reste en mémoire quand on part explorer un autre
  // onglet, et c'est de LÀ qu'on ferme la fenêtre par distraction.
  const { hasUndownloaded } = useAnnotations();
  useUnloadGuard(hasUndownloaded);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<{ surveys: number; questions: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllSurveys()
      .then((d) => {
        if (!cancelled) setStats({ surveys: d.surveys.length, questions: d.total_questions || 0 });
      })
      .catch(() => {
        /* corpus indisponible : on masque les stats */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="rail-brand">
          <img className="rail-logo" src="/opubliq-symbole.png" alt="Opubliq" />
          <div>
            <b>Opubliq</b>
            <span>{t("app.brand.tagline")}</span>
          </div>
        </div>

        <nav className="rail-nav">
          {MODES.map((m) => (
            <NavLink
              key={m.key}
              to={m.to}
              className={({ isActive }) => `rail-item ${isActive ? "active" : ""} ${m.soon ? "soon" : ""}`}
            >
              <span className="ico"><m.Ico size={18} strokeWidth={1.75} /></span>
              <span>{t(m.labelKey)}</span>
              {m.soon && <span className="soon-tag">{t("nav.soon")}</span>}
            </NavLink>
          ))}
        </nav>

        {stats && (
          <div className="rail-foot">
            <div className="rail-stat">
              <span>{t("app.stats.surveys")}</span>
              <b>{stats.surveys}</b>
            </div>
            <div className="rail-stat">
              <span>{t("app.stats.questions")}</span>
              <b>{stats.questions.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")}</b>
            </div>
          </div>
        )}
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="flex-1" />
          <button
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            title={lang === "fr" ? "Switch to English" : "Passer au français"}
          >
            <Languages size={16} strokeWidth={1.75} /> {lang === "fr" ? "EN" : "FR"}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-70">{user.email}</span>
              <button
                className="btn btn-ghost btn-sm gap-1.5"
                onClick={() => logout().then(() => navigate("/connexion"))}
              >
                <LogOut size={16} strokeWidth={1.75} /> {t("topbar.logout")}
              </button>
            </div>
          ) : (
            <NavLink to="/connexion" className="btn btn-ghost btn-sm">
              {t("topbar.login")}
            </NavLink>
          )}
          <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setDrawerOpen(true)}>
            <ShoppingCart size={16} strokeWidth={1.75} /> {t("topbar.export")} {size > 0 && <span className="cart-count">{size}</span>}
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <ExportDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
