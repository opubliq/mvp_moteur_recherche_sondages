import { describe, expect, it } from "vitest";
import { splitAnswerSections } from "./agentAnswerSections";

describe("splitAnswerSections", () => {
  it("pas de marqueur CONSTAT → null (repli RECHERCHE)", () => {
    const content = "| Sondage | Variable |\n| --- | --- |\n| ces_2025 | q1 |";
    expect(splitAnswerSections(content)).toBeNull();
  });

  it("une seule paire constat/preuve : summary et detail corrects, trimmés", () => {
    const content = [
      "<!--CONSTAT-->",
      "**42 % des 18-34 ans** appuient le projet.",
      "<!--PREUVE-->",
      "## Méthode",
      "Crosstab pondéré sur ces_2025, cible q1, dim age_grp.",
    ].join("\n");

    const result = splitAnswerSections(content);
    expect(result).toEqual([
      {
        summary: "**42 % des 18-34 ans** appuient le projet.",
        detail: "## Méthode\nCrosstab pondéré sur ces_2025, cible q1, dim age_grp.",
      },
    ]);
  });

  it("3 paires : chacune isolée correctement, sans fuite entre voisines", () => {
    const content = [
      "<!--CONSTAT-->",
      "Constat 1",
      "<!--PREUVE-->",
      "Preuve 1",
      "<!--CONSTAT-->",
      "Constat 2",
      "<!--PREUVE-->",
      "Preuve 2",
      "<!--CONSTAT-->",
      "Constat 3",
      "<!--PREUVE-->",
      "Preuve 3",
    ].join("\n");

    const result = splitAnswerSections(content);
    expect(result).toEqual([
      { summary: "Constat 1", detail: "Preuve 1" },
      { summary: "Constat 2", detail: "Preuve 2" },
      { summary: "Constat 3", detail: "Preuve 3" },
    ]);
  });

  it("8 paires : pas de plafond codé en dur", () => {
    const n = 8;
    const parts: string[] = [];
    for (let i = 1; i <= n; i++) {
      parts.push("<!--CONSTAT-->", `Constat ${i}`, "<!--PREUVE-->", `Preuve ${i}`);
    }
    const content = parts.join("\n");

    const result = splitAnswerSections(content);
    expect(result).toHaveLength(n);
    for (let i = 1; i <= n; i++) {
      expect(result?.[i - 1]).toEqual({ summary: `Constat ${i}`, detail: `Preuve ${i}` });
    }
  });

  it("marqueurs entourés de lignes vides et d'espaces : toujours détectés", () => {
    const content = [
      "   <!--CONSTAT-->   ",
      "",
      "**50 %** d'accord.",
      "",
      "  <!--PREUVE-->  ",
      "",
      "Détail complet ici.",
      "",
    ].join("\n");

    const result = splitAnswerSections(content);
    expect(result).toEqual([{ summary: "**50 %** d'accord.", detail: "Détail complet ici." }]);
  });

  it("segment sans PREUVE : inclus quand même, detail vide", () => {
    const content = ["<!--CONSTAT-->", "Constat orphelin sans preuve."].join("\n");

    const result = splitAnswerSections(content);
    expect(result).toEqual([{ summary: "Constat orphelin sans preuve.", detail: "" }]);
  });

  it("texte avant le premier CONSTAT est jeté, n'apparaît nulle part dans le résultat", () => {
    const content = [
      "Un préambule qui ne devrait pas être là.",
      "<!--CONSTAT-->",
      "Seul vrai constat.",
      "<!--PREUVE-->",
      "Seul vrai détail.",
    ].join("\n");

    const result = splitAnswerSections(content);
    expect(result).toEqual([{ summary: "Seul vrai constat.", detail: "Seul vrai détail." }]);
    expect(JSON.stringify(result)).not.toContain("préambule");
  });

  it("detail contenant un tableau markdown : préservé verbatim, non altéré", () => {
    const table = ["| Région | % |", "| --- | --- |", "| QC | 42 |", "| ON | 38 |"].join("\n");
    const content = ["<!--CONSTAT-->", "Écart régional notable.", "<!--PREUVE-->", table].join("\n");

    const result = splitAnswerSections(content);
    expect(result).toEqual([{ summary: "Écart régional notable.", detail: table }]);
  });
});
