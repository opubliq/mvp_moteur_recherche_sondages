/**
 * Une réponse libre dans la liste de l'espace « Réponses libres ».
 *
 * Extraite de `VerbatimsPage` (bead jsu.6), où la liste portait déjà onze props.
 *
 * LA LISTE RESTE NUE : pas d'étiquette d'annotation ici. On y parcourt et on y
 * choisit du matériau ; le verdict du modèle s'examine dans le panneau
 * « Sélection », en face de la consigne qui l'a produit. Mêler les deux
 * couvrait la liste de puces sur les seules lignes annotées, au hasard du
 * défilement, et rendait le parcours illisible.
 */

import { useState } from "react";
import { Check, Copy, Wand2 } from "lucide-react";
import { FALLBACK_LABEL } from "../logic/annotate";
import type { Verbatim } from "../types";

/**
 * Les 3 repères sociodémo affichés sous chaque réponse : genre, âge, région.
 *
 * Une citation sans son locuteur n'est pas utilisable en rapport — mais le doc
 * en porte 7, et les afficher tous noierait le texte de la réponse. Ce trio est
 * le plus court et le plus lu ; le reste part quand même dans l'export.
 * `income`, `education` et `occupation` ont en prime des libellés à rallonge
 * (« College or CEGEP certificate or diploma ») qui casseraient la ligne.
 */
export function shortSociodemo(v: Verbatim): string[] {
  const s = v.sociodemo;
  if (!s) return [];
  return [s.gender, s.age, s.region].filter((x): x is string => Boolean(x && x.trim()));
}

/**
 * Couleur d'une étiquette : stable pour une consigne donnée, dérivée de la
 * POSITION de l'étiquette dans la liste de l'utilisateur. Deux runs successifs
 * gardent donc les mêmes couleurs, et « non classable » reste toujours neutre —
 * ce n'est pas une catégorie de plus, c'est l'absence de verdict.
 */
const LABEL_COLORS = [
  "badge-primary",
  "badge-secondary",
  "badge-accent",
  "badge-info",
  "badge-success",
  "badge-warning",
];

export function labelBadgeClass(label: string, labels: string[]): string {
  if (label.toLowerCase() === FALLBACK_LABEL) return "badge-ghost";
  const i = labels.findIndex((l) => l.toLowerCase() === label.toLowerCase());
  return i < 0 ? "badge-ghost" : LABEL_COLORS[i % LABEL_COLORS.length];
}

export default function VerbatimRow({
  v,
  selected,
  onToggle,
  onSeed,
}: {
  v: Verbatim;
  selected: boolean;
  onToggle: () => void;
  /** « Partir de cette réponse » : pré-remplit la consigne d'annotation. */
  onSeed?: (v: Verbatim) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(v.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers refusé (contexte non sécurisé) : on ne casse rien */
    }
  };

  return (
    <li
      className={`flex gap-2 rounded-lg border p-2.5 ${
        selected ? "border-primary/40 bg-primary/5" : "border-base-300"
      }`}
    >
      <input
        type="checkbox"
        className="checkbox checkbox-sm mt-0.5 shrink-0"
        checked={selected}
        onChange={onToggle}
        aria-label="Sélectionner cette citation"
      />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm leading-snug">{v.text}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/40">
          <span className="font-mono">répondant {v.respondent_id}</span>
          {shortSociodemo(v).map((s) => (
            <span key={s} className="badge badge-ghost badge-xs whitespace-nowrap">
              {s}
            </span>
          ))}
          {v.score_pertinence != null && (
            <span className="tabular-nums" title="Score de pertinence Cohere (0-100, absolu)">
              · {v.score_pertinence}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {onSeed && (
              <button
                type="button"
                className="flex items-center gap-1 hover:text-primary"
                onClick={() => onSeed(v)}
                title="Partir de cette réponse pour définir une propriété à annoter"
              >
                <Wand2 size={13} /> annoter à partir d'ici
              </button>
            )}
            <button type="button" className="flex items-center gap-1 hover:text-primary" onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "copié" : "copier"}
            </button>
          </span>
        </div>
      </div>
    </li>
  );
}
