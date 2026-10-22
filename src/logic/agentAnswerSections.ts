/**
 * Découpe pure d'une réponse agent en paires "constat" + "preuve" (cf.
 * SYSTEM_PROMPT, règle « CONSTATS PUIS PREUVE » dans agent.ts) : pour une
 * réponse d'ANALYSE, le modèle écrit, pour CHAQUE constat distinct, la ligne
 * littérale `<!--CONSTAT-->` SEULE sur sa ligne, puis le texte du constat,
 * puis la ligne littérale `<!--PREUVE-->` SEULE sur sa ligne, puis le détail
 * propre à CE constat (méthode/chiffres/tableau/sources) — répété autant de
 * fois qu'il y a de constats (3, 8, 15 : pas de nombre fixe).
 *
 * Les marqueurs sont TOUJOURS ces chaînes exactes (jamais traduites) : c'est
 * ce qui permet au frontend de séparer les paires sans dépendre de la langue
 * de réponse. Pour une réponse de RECHERCHE (inventaire) ou sans constat
 * chiffré, le modèle n'émet AUCUN marqueur : `splitAnswerSections` renvoie
 * alors `null`, signal pour le frontend de rendre `content` tel quel
 * (fallback).
 *
 * Module SANS I/O, dans le même esprit que agentSteps.ts (testable en isolation).
 */

export interface AnswerSection {
  /** Le texte du constat (markdown, ex. "**43% de X** — courte proposition."). */
  summary: string;
  /** Le détail propre à CE constat (markdown : méthode, chiffres, tableau, sources). */
  detail: string;
}

/** Ligne composée uniquement du marqueur, espaces de bordure tolérés. */
const CONSTAT_MARKER_RE = /^[ \t]*<!--CONSTAT-->[ \t]*$/m;
const PREUVE_MARKER_RE = /^[ \t]*<!--PREUVE-->[ \t]*$/m;

/**
 * Sépare `content` en une liste de paires `{ summary, detail }`, une par
 * constat. Si aucun `<!--CONSTAT-->` n'apparaît seul sur sa ligne dans
 * `content`, renvoie `null` : c'est le signal de repli pour le frontend
 * (rendre `content` sans découpage, cas RECHERCHE/inventaire).
 *
 * Tout texte avant le premier `<!--CONSTAT-->` est ignoré silencieusement (le
 * modèle ne devrait rien écrire là, mais on ne plante pas si c'est le cas).
 * Dans chaque segment délimité par deux `<!--CONSTAT-->` consécutifs (ou le
 * dernier jusqu'à la fin), le texte avant le premier `<!--PREUVE-->` devient
 * `summary` (trimmé) et le texte après devient `detail` (trimmé). Un segment
 * sans `<!--PREUVE-->` est tout de même inclus, avec `detail: ""`.
 */
export function splitAnswerSections(content: string): AnswerSection[] | null {
  if (!CONSTAT_MARKER_RE.test(content)) return null;

  // Découpe sur chaque ligne-marqueur `<!--CONSTAT-->`, en gardant les
  // segments qui suivent chaque occurrence (le texte avant la première est
  // jeté — cf. doc ci-dessus).
  const parts = content.split(/^[ \t]*<!--CONSTAT-->[ \t]*$/m);
  // parts[0] = texte avant le premier marqueur (jeté) ; parts[1..] = un
  // segment par constat.
  const segments = parts.slice(1);

  const sections: AnswerSection[] = [];
  for (const segment of segments) {
    const preuveMatch = PREUVE_MARKER_RE.exec(segment);
    if (!preuveMatch) {
      sections.push({ summary: segment.trim(), detail: "" });
      continue;
    }
    const summary = segment.slice(0, preuveMatch.index).trim();
    const detail = segment.slice(preuveMatch.index + preuveMatch[0].length).trim();
    sections.push({ summary, detail });
  }

  return sections;
}
