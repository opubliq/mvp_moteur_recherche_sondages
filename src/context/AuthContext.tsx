import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AuthError,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  setAuthToken,
  signup as apiSignup,
  type AuthUser,
} from "../api";

interface AuthContextValue {
  user: AuthUser | null;
  /** `true` tant que la session initiale (token localStorage → /auth/me) n'est pas résolue. */
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Un token en localStorage ne garantit pas une session encore valide côté
  // serveur (expiration à 30 jours, logout depuis un autre onglet) — on ne
  // fait jamais confiance qu'à /auth/me pour peupler `user`.
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signup: async (email, password) => {
        const session = await apiSignup(email, password);
        setAuthToken(session.token);
        setUser(session.user);
      },
      login: async (email, password) => {
        const session = await apiLogin(email, password);
        setAuthToken(session.token);
        setUser(session.user);
      },
      logout: async () => {
        await apiLogout().catch(() => {
          /* déconnexion locale même si l'appel serveur échoue (token déjà expiré, réseau) */
        });
        setAuthToken(null);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}

export { AuthError };
