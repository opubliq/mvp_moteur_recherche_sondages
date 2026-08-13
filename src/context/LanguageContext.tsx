import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import fr, { type TranslationKey } from "../i18n/fr";
import en from "../i18n/en";

export type Lang = "fr" | "en";

const DICTS: Record<Lang, Record<TranslationKey, string>> = { fr, en };
const STORAGE_KEY = "opubliq.lang.v1";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en") return stored;
  } catch {
    /* quota / mode privé : on retombe sur le défaut */
  }
  return "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* pas persisté, tant pis pour ce rechargement */
    }
  };

  const value = useMemo<LanguageContextValue>(() => {
    const dict = DICTS[lang];
    const t: LanguageContextValue["t"] = (key, vars) => {
      let text = dict[key] ?? fr[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{{${k}}}`, String(v));
        }
      }
      return text;
    };
    return { lang, setLang, t };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
