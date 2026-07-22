import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Search, LayoutGrid, Sparkles, MessageSquare, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchAllSurveys } from "../api";
import { useAnnotations, useUnloadGuard } from "../context/AnnotationContext";
import { useCart } from "../context/CartContext";
import ExportDrawer from "./ExportDrawer";

interface ModeDef {
  key: string;
  Ico: LucideIcon;
  label: string;
  to: string;
  soon?: boolean;
}

const MODES: ModeDef[] = [
  { key: "recherche", Ico: Search, label: "Recherche", to: "/recherche" },
  { key: "corpus", Ico: LayoutGrid, label: "Exploration corpus", to: "/corpus" },
  { key: "agent", Ico: Sparkles, label: "Agent analytique", to: "/agent", soon: true },
  { key: "questions-ouvertes", Ico: MessageSquare, label: "Réponses libres", to: "/questions-ouvertes" },
];

export default function AppShell() {
  const { size } = useCart();
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
            <span>Moteur de sondages</span>
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
              <span>{m.label}</span>
              {m.soon && <span className="soon-tag">bientôt</span>}
            </NavLink>
          ))}
        </nav>

        {stats && (
          <div className="rail-foot">
            <div className="rail-stat">
              <span>Sondages</span>
              <b>{stats.surveys}</b>
            </div>
            <div className="rail-stat">
              <span>Questions</span>
              <b>{stats.questions.toLocaleString("fr-CA")}</b>
            </div>
          </div>
        )}
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="flex-1" />
          <button className="btn btn-ghost btn-sm gap-1.5" onClick={() => setDrawerOpen(true)}>
            <ShoppingCart size={16} strokeWidth={1.75} /> Export {size > 0 && <span className="cart-count">{size}</span>}
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
