/**
 * FONCTIONS SPÉCIALES — p-values à FORME CLOSE pour les primitives inférentielles.
 *
 * Aucune dépendance externe, aucun runtime numérique itératif de modèle : ce
 * module ne contient que des fonctions spéciales standard (fonction bêta
 * incomplète régularisée par fraction continue de Lentz — Numerical Recipes),
 * dont dérivent les fonctions de répartition de Student-t et de Fisher-F. C'est
 * exactement ce que `scipy.stats` calcule sous le capot ; on le reproduit ici
 * pour rester déterministe et sans dépendance, PAS pour ajuster un modèle.
 *
 * La frontière de l'epic (équation close OK / algèbre matricielle-itératif HORS
 * scope) porte sur l'ESTIMATION (ajustement de modèle), pas sur l'évaluation
 * d'une loi de probabilité tabulée : une CDF est une primitive mathématique
 * fermée, au même titre que `sqrt` ou `exp`.
 */

/** ln Γ(x) — approximation de Lanczos (précision ~1e-15 sur x > 0). */
export function lgamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // Réflexion : Γ(x)Γ(1−x) = π / sin(πx)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Fonction bêta incomplète régularisée I_x(a,b) — fraction continue de Lentz
 * modifiée (Numerical Recipes §6.4). Domaine x ∈ [0,1].
 */
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a + b) - lgamma(a) - lgamma(b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b + lbeta);
  // La fraction continue converge vite pour x < (a+1)/(a+b+2) ; sinon, symétrie.
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betacf(a, b, x)) / a;
  }
  return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a + lbeta) * betacf(b, a, 1 - x)) / b;
}

/** Fraction continue de la bêta incomplète (algorithme de Lentz). */
function betacf(a: number, b: number, x: number): number {
  const TINY = 1e-30;
  const EPS = 3e-12;
  const MAXIT = 300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/**
 * p-value BILATÉRALE d'une statistique de Student : P(|T_df| > |t|).
 * = I_{df/(df+t²)}(df/2, 1/2). Renvoie NaN si df ≤ 0 ou t non fini.
 */
export function studentTTwoSided(t: number, df: number): number {
  if (!Number.isFinite(t) || !(df > 0)) return NaN;
  return betai(df / 2, 0.5, df / (df + t * t));
}

/**
 * p-value (queue supérieure) d'une statistique de Fisher : P(F_{d1,d2} > f).
 * = I_{d2/(d2+d1·f)}(d2/2, d1/2). Renvoie NaN si paramètres invalides.
 */
export function fSurvival(f: number, d1: number, d2: number): number {
  if (!Number.isFinite(f) || f < 0 || !(d1 > 0) || !(d2 > 0)) return NaN;
  return betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}
