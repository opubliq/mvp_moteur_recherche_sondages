import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ResponseOption, SearchResult } from "../types";

/** Une question dans le panier d'export : le minimum requis pour l'export. */
export interface CartItem {
  survey_id: string;
  survey_name: string;
  survey_year: number | null;
  pollster: string | null;
  variable: string;
  question_text: string;
  response_options: ResponseOption[];
}

/** Clé unique d'une question dans le panier. */
export const cartKey = (surveyId: string, variable: string) => `${surveyId}::${variable}`;

/** Convertit un résultat de recherche / question de sondage en item de panier. */
export function toCartItem(q: SearchResult): CartItem {
  return {
    survey_id: q.survey_id,
    survey_name: q.survey_name,
    survey_year: q.survey_year,
    pollster: q.pollster,
    variable: q.variable,
    question_text: q.question_text,
    response_options: q.response_options,
  };
}

interface CartContextValue {
  items: CartItem[];
  size: number;
  has: (surveyId: string, variable: string) => boolean;
  add: (item: CartItem) => void;
  toggle: (item: CartItem) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "opubliq.cart.v1";

function loadInitial(): Map<string, CartItem> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as CartItem[];
    return new Map(arr.map((it) => [cartKey(it.survey_id, it.variable), it]));
  } catch {
    return new Map();
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<Map<string, CartItem>>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...map.values()]));
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [map]);

  const value = useMemo<CartContextValue>(() => {
    const has = (surveyId: string, variable: string) => map.has(cartKey(surveyId, variable));
    return {
      items: [...map.values()],
      size: map.size,
      has,
      add: (item) =>
        setMap((prev) => {
          const next = new Map(prev);
          next.set(cartKey(item.survey_id, item.variable), item);
          return next;
        }),
      toggle: (item) =>
        setMap((prev) => {
          const next = new Map(prev);
          const k = cartKey(item.survey_id, item.variable);
          if (next.has(k)) next.delete(k);
          else next.set(k, item);
          return next;
        }),
      remove: (key) =>
        setMap((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        }),
      clear: () => setMap(new Map()),
    };
  }, [map]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
