/**
 * Annotations éphémères des réponses libres (bead jsu.6).
 *
 * DÉCISION DU BEAD : rien n'est persisté. Les annotations vivent en mémoire, le
 * temps de la session ; pour les garder, l'utilisateur les télécharge. C'est ce
 * qui préserve le contrat RAW-FIRST de v33 — une annotation est de la donnée
 * dérivée et n'a rien à faire dans les Parquet, régénérés idempotemment depuis
 * les `.sav`.
 *
 * POURQUOI UN CONTEXTE À LA RACINE, ET PAS UN `useState` DANS LA PAGE. « Ne pas
 * persister » ne veut pas dire « détruire au premier clic ». `VerbatimsPage`
 * monte son espace de travail avec `key={survey_id}/{variable}` : changer de
 * question via le sélecteur de l'en-tête remet tout à zéro, et un aller-retour
 * vers l'onglet Recherche démonte la page entière. Anodin quand l'état se
 * limitait à une recherche et une sélection ; destructeur dès qu'il contient
 * quatre minutes d'appels LLM. En hissant l'état au-dessus des deux, changer de
 * question n'est plus un piège : on peut revenir, l'annotation est encore là.
 *
 * Reste une seule vraie sortie : fermer ou recharger l'onglet. Celle-là est
 * gardée par un `beforeunload` (cf. `useUnloadGuard`), le seul moment où
 * avertir a du sens.
 *
 * PAS de sessionStorage : l'univers annoté d'une grosse question (2 730
 * réponses avec leur texte et leur sociodémo) approche le mégaoctet, et un
 * quota dépassé échouerait silencieusement — pire que ne rien promettre.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Annotation } from "../logic/annotate";
import type { Verbatim } from "../types";

/** Clé de session : une question ouverte. */
export const annotationKey = (surveyId: string, variable: string) => `${surveyId}::${variable}`;

/** Le résultat d'un run — test ou batch. */
export interface RunSlice {
  /** id de réponse → verdict du modèle. */
  annotations: Map<string, Annotation>;
  /** Les réponses annotées, gardées pour l'export (texte + sociodémo). */
  rows: Verbatim[];
  /** Réponses que le modèle n'a pas classées malgré les reprises. */
  failed: number;
  /** Signature de la consigne ayant produit ce run (cf. `specSignature`). */
  signature: string;
}

export interface AnnotationSession {
  /** Brouillon de la propriété, tel que saisi. */
  property: string;
  /** Brouillon des étiquettes, une par ligne. */
  optionsText: string;
  /** Dernier essai sur la sélection — sert à régler la consigne avant le batch. */
  test: RunSlice | null;
  /** Dernier run complet sur la question. */
  batch: RunSlice | null;
  /** Le batch a-t-il été téléchargé ? Pilote l'avertissement de sortie. */
  downloaded: boolean;
}

export const emptySession = (): AnnotationSession => ({
  property: "",
  optionsText: "",
  test: null,
  batch: null,
  downloaded: false,
});

/**
 * Signature d'une consigne : deux runs comparables si et seulement si elle est
 * identique. C'est ce qui interdit de lancer un batch sur une consigne modifiée
 * depuis l'essai — sinon l'utilisateur valide un prompt et en exécute un autre.
 */
export const specSignature = (property: string, options: string[]) =>
  JSON.stringify([property.trim(), options.map((o) => o.trim().toLowerCase())]);

interface AnnotationContextValue {
  get: (key: string) => AnnotationSession;
  update: (key: string, updater: (prev: AnnotationSession) => AnnotationSession) => void;
  reset: (key: string) => void;
  /** Au moins un batch annoté n'a pas été téléchargé. */
  hasUndownloaded: boolean;
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Map<string, AnnotationSession>>(new Map());

  const value = useMemo<AnnotationContextValue>(
    () => ({
      get: (key) => sessions.get(key) ?? emptySession(),
      update: (key, updater) =>
        setSessions((prev) => {
          const next = new Map(prev);
          next.set(key, updater(prev.get(key) ?? emptySession()));
          return next;
        }),
      reset: (key) =>
        setSessions((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        }),
      hasUndownloaded: [...sessions.values()].some(
        (s) => s.batch != null && s.batch.annotations.size > 0 && !s.downloaded,
      ),
    }),
    [sessions],
  );

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>;
}

export function useAnnotations(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error("useAnnotations doit être utilisé dans <AnnotationProvider>");
  return ctx;
}

/**
 * Avertit avant de fermer/recharger l'onglet avec un batch non téléchargé.
 *
 * Perdre quatre minutes d'annotation en changeant d'onglet est le risque
 * produit n°1 de la décision « éphémère ». Le navigateur impose son propre
 * libellé : on ne contrôle que le fait d'armer le garde-fou, et on ne l'arme
 * QUE dans ce cas — un dialogue qui apparaît à tort est un dialogue qu'on
 * apprend à écarter sans lire.
 */
export function useUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
