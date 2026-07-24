/**
 * Fonctions spéciales — validées contre scipy (valeurs de référence en commentaire).
 * `scipy.stats.t.sf(t,df)*2` (bilatéral) et `scipy.stats.f.sf(F,d1,d2)`.
 */
import { describe, expect, it } from "vitest";
import { fSurvival, studentTTwoSided } from "./stats.js";

describe("studentTTwoSided", () => {
  const cases: Array<[number, number, number]> = [
    // [t, df, scipy 2*t.sf(|t|,df)]
    [2.0, 10, 0.07338803477074037],
    [2.848437706137194, 179.3085520089518, 0.00490707515703858],
    [7.821268546359597, 212, 2.430831287224721e-13],
    [0.5, 5, 0.6382988716409291],
    [1.96, 1000, 0.050273184955748736],
  ];
  it.each(cases)("t=%f df=%f", (t, df, expected) => {
    expect(studentTTwoSided(t, df)).toBeCloseTo(expected, 12);
  });
});

describe("fSurvival", () => {
  const cases: Array<[number, number, number, number]> = [
    // [F, d1, d2, scipy f.sf(F,d1,d2)]
    [69.62016917084375, 2, 225, 2.9132563857329574e-24],
    [3.0, 2, 100, 0.05428836181669085],
    [1.0, 5, 20, 0.44302518468487945],
  ];
  it.each(cases)("F=%f d1=%f d2=%f", (f, d1, d2, expected) => {
    const got = fSurvival(f, d1, d2);
    // Tolérance relative pour les très petites queues.
    if (expected < 1e-6) {
      expect(Math.abs(got - expected) / expected).toBeLessThan(1e-6);
    } else {
      expect(got).toBeCloseTo(expected, 10);
    }
  });
});
