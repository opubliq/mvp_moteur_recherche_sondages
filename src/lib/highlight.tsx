import type { ReactNode } from "react";
import type { Concept } from "../types";

/**
 * Surlignage LEXICAL des termes de la query expansion (`orig` + `syns` +
 * `qualifiers`) dans un texte de question — bead 9gf.19.
 *
 * Remplace l'ancien badge `matched_concepts` (retiré avec `scoring.ts` en
 * 9gf.12) : au lieu de dire QUE ça matche, on montre OÙ.
 *
 * GARDE-FOU : ceci est du pur affichage. Zéro appel API, zéro tri, zéro
 * score. Le classement appartient exclusivement à Cohere (`score_pertinence`).
 * Un document bien classé sans aucun terme surligné est normal (match
 * sémantique, pas lexical) — ce n'est jamais un signal à corriger.
 *
 * La logique de normalisation s'inspire de `eval/_baseline_scoring.ts`
 * (`normalizeText`), une baseline gelée qu'on NE réimporte PAS depuis ici.
 * Contrairement à cette baseline, on doit ici retrouver la position d'un
 * match dans le texte ORIGINAL (pour poser des spans React) — d'où la table
 * de correspondance normalisé -> original ci-dessous (piège 1 de la bead).
 */

/**
 * Normalise un seul caractère : minuscule, décomposition NFD + strip des
 * diacritiques, apostrophes courbes -> droites, espace insécable -> espace.
 * Peut renvoyer 0, 1 ou plusieurs caractères (ex: une marque combinante
 * isolée disparaît ; un caractère spécial pourrait s'étendre). C'est
 * pour ça qu'on mappe caractère-source -> caractères-normalisés un par un,
 * plutôt que de normaliser la chaîne entière puis chercher un offset : NFD
 * + strip n'est PAS garanti "net-preserving" en général, et un `.trim()`
 * global décalerait tout le début du texte.
 */
function normalizeChar(c: string): string {
  if (c === "‘" || c === "’") return "'";
  if (c === " ") return " ";
  return c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalise `text` tout en construisant `map`: pour chaque caractère de la
 * chaîne normalisée, l'index du caractère d'origine (dans `text`) dont il
 * provient. Permet de convertir un offset trouvé dans `normalized` vers un
 * offset exact dans `text`, y compris sur du texte accentué.
 */
function normalizeWithMap(text: string): { normalized: string; map: number[] } {
  let normalized = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const nc = normalizeChar(text[i]);
    for (const ch of nc) {
      normalized += ch;
      map.push(i);
    }
  }
  return { normalized, map };
}

function normalizeSimple(text: string): string {
  return normalizeWithMap(text).normalized;
}

/** Termes candidats au surlignage : orig + syns + qualifiers de tous les concepts, dédupliqués. */
function collectTerms(concepts: Concept[]): string[] {
  const terms = new Set<string>();
  for (const c of concepts) {
    if (c.orig) terms.add(c.orig);
    for (const s of c.syns || []) terms.add(s);
    for (const q of c.qualifiers || []) terms.add(q);
  }
  return [...terms];
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Découpe `text` en segments surlignés/non-surlignés selon les termes des
 * `concepts`. Matching en longest-first (implicite : on cherche tous les
 * termes puis on fusionne les spans qui se recouvrent — piège 2), positions
 * exactes sur texte accentué (piège 1). Ordre non garanti pertinent au-delà
 * de la fusion : l'union d'intervalles est indépendante de l'ordre d'entrée.
 */
export function computeHighlightSegments(text: string, concepts: Concept[]): HighlightSegment[] {
  if (!text) return [{ text, highlighted: false }];
  if (!concepts || concepts.length === 0) return [{ text, highlighted: false }];

  const terms = collectTerms(concepts)
    .map(normalizeSimple)
    .filter((t) => t.length >= 2); // termes d'1 caractère = bruit, pas un match utile

  if (terms.length === 0) return [{ text, highlighted: false }];

  const { normalized, map } = normalizeWithMap(text);
  if (!normalized) return [{ text, highlighted: false }];

  const spans: Array<[number, number]> = [];
  for (const term of terms) {
    let fromIndex = 0;
    while (fromIndex <= normalized.length) {
      const idx = normalized.indexOf(term, fromIndex);
      if (idx === -1) break;
      const normEnd = idx + term.length - 1;
      const origStart = map[idx];
      const origEnd = map[normEnd] + 1; // exclusif
      spans.push([origStart, origEnd]);
      fromIndex = idx + 1;
    }
  }

  if (spans.length === 0) return [{ text, highlighted: false }];

  // Fusion des spans chevauchants/contigus (piège 2 : 'vote' ⊂ 'intention de vote').
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push([...span]);
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), highlighted: false });
    segments.push({ text: text.slice(start, end), highlighted: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });

  return segments;
}

/**
 * Rendu React des segments — pas de `dangerouslySetInnerHTML`. Surlignage
 * NEUTRE (`.op-highlight`, voir src/App.css) : aucune couleur par concept,
 * pour ne pas entrer en collision avec le gradient de score coral->sarcelle
 * (bead 9gf.15).
 */
export function HighlightedText({ text, concepts }: { text: string; concepts: Concept[] }): ReactNode {
  const segments = computeHighlightSegments(text, concepts);
  if (segments.length === 1 && !segments[0].highlighted) return <>{text}</>;

  return (
    <>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark key={i} className="op-highlight">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
