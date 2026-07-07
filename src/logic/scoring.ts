import type { Concept, SearchResult, Pertinence } from '../types';

/**
 * Normalise le texte pour faciliter le matching (accents, apostrophes, casse).
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[\u2018\u2019]/g, "'") // Apostrophes courbes -> droites
    .replace(/\u00a0/g, " ")       // Espaces insécables -> normaux
    .trim();
}

/**
 * Calcule la couverture d'un concept sur un résultat donné.
 * Retourne un score entre 0 et 1.
 */
export function calculateConceptScore(concept: Concept, normalizedContent: string): number {
  const termsToMatch = [concept.orig, ...(concept.syns || [])].map(normalizeText);
  const baseMatch = termsToMatch.some(term => normalizedContent.includes(term));

  if (!baseMatch) return 0;

  // Si le concept a des qualifiers, on vérifie s'ils sont présents
  if (concept.qualifiers && concept.qualifiers.length > 0) {
    const normalizedQualifiers = concept.qualifiers.map(normalizeText);
    const qualifierMatch = normalizedQualifiers.some(q => normalizedContent.includes(q));
    
    // Si seule la base matche mais aucun qualifier, on réduit le score (ex: 0.5)
    if (!qualifierMatch) {
      return 0.5;
    }
  }

  return 1.0;
}

/**
 * Calcule le score de couverture total et détermine le palier de pertinence.
 */
export function scoreResult(concepts: Concept[], result: SearchResult): { score: number, pertinence: Pertinence, matched: string[] } {
  if (!concepts || concepts.length === 0) {
    return { score: 0, pertinence: 'Hors-sujet', matched: [] };
  }

  // On concatène les champs de texte pertinents pour la recherche
  const docConcepts = Array.isArray(result.concepts) ? result.concepts.join(' ') : '';
  const content = normalizeText(`${result.question_text} ${result.survey_name} ${docConcepts}`);
  
  let totalScore = 0;
  const matched: string[] = [];

  for (const concept of concepts) {
    const conceptScore = calculateConceptScore(concept, content);
    if (conceptScore > 0) {
      totalScore += concept.weight * conceptScore;
      matched.push(concept.orig);
    }
  }

  let pertinence: Pertinence = 'Hors-sujet';
  // On utilise un petit epsilon pour éviter les problèmes de précision flottante
  if (totalScore >= 0.99) { 
    pertinence = 'Exact';
  } else if (totalScore >= 0.5) {
    pertinence = 'Partiel';
  } else if (totalScore >= 0.1) {
    pertinence = 'Faible';
  }

  return { score: totalScore * 100, pertinence, matched };
}
