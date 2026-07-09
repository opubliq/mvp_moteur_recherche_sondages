// Générateur de distributions/croisements ILLUSTRATIFS et déterministes.
// Le backend n'expose pas encore de données de répondants ; ces valeurs servent
// uniquement à démontrer le layout du dashboard. À remplacer par de vraies
// agrégations quand le pipeline de données brutes (EPIC Verbatims) sera branché.

/** Hash déterministe d'une chaîne (xfnv1a) → seed. */
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG mulberry32 : suite pseudo-aléatoire reproductible à partir d'un seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distribution (%) sur `n` options, déterministe pour une clé donnée, somme = 100. */
export function mockDistribution(key: string, n: number): number[] {
  if (n <= 0) return [];
  const rnd = mulberry32(seedFrom(key));
  const raw = Array.from({ length: n }, () => rnd() + 0.15);
  const total = raw.reduce((a, b) => a + b, 0);
  const pct = raw.map((v) => Math.round((v / total) * 100));
  // Corrige l'arrondi pour garantir une somme de 100.
  const drift = 100 - pct.reduce((a, b) => a + b, 0);
  pct[pct.indexOf(Math.max(...pct))] += drift;
  return pct;
}

/**
 * Croisement illustratif : matrice rows×cols de pourcentages en ligne
 * (chaque ligne somme à 100), déterministe pour la paire de variables.
 */
export function mockCrossTab(keyRow: string, keyCol: string, rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, (_, r) => mockDistribution(`${keyRow}#${r}#${keyCol}`, cols));
}
