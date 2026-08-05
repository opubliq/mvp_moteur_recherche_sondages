/**
 * Test unitaire de la résolution des index accessibles par client (f3i.11).
 *
 * Point critique : le header `x-client-id` (falsifiable, cf. costlog.ts) ne
 * doit JAMAIS élargir l'accès à un index privé — seul le username du Basic
 * Auth compte. Placé sous `netlify/functions/` : seul répertoire découvert
 * par vitest.
 */
import { describe, expect, it } from "vitest";
import {
  PUBLIC_QUESTIONS_INDEX,
  PUBLIC_VERBATIMS_INDEX,
  isMicrodataSurveyAccessible,
  resolveAccessibleQuestionIndexes,
  resolveAccessibleVerbatimIndexes,
  resolveAuthorizedTenant,
} from "../../../src/logic/tenancy";

function basic(user: string, password = "pw"): string {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

describe("resolveAuthorizedTenant (f3i.11)", () => {
  it("reconnaît un tenant connu via le Basic Auth", () => {
    expect(resolveAuthorizedTenant({ authorization: basic("opubliq") })).toBe("opubliq");
  });

  it("ignore un username Basic Auth inconnu", () => {
    expect(resolveAuthorizedTenant({ authorization: basic("quelquun-dautre") })).toBeUndefined();
  });

  it("IGNORE le header x-client-id — falsifiable, ne doit jamais élargir l'accès", () => {
    expect(resolveAuthorizedTenant({ "x-client-id": "opubliq" })).toBeUndefined();
    expect(
      resolveAuthorizedTenant({ "x-client-id": "opubliq", authorization: basic("quelquun-dautre") }),
    ).toBeUndefined();
  });

  it("aucune exception sur une entrée absente ou malformée", () => {
    expect(resolveAuthorizedTenant(undefined)).toBeUndefined();
    expect(resolveAuthorizedTenant({})).toBeUndefined();
    expect(resolveAuthorizedTenant({ authorization: "Basic !!!not-base64!!!" })).toBeUndefined();
  });
});

describe("resolveAccessibleQuestionIndexes / resolveAccessibleVerbatimIndexes (f3i.11)", () => {
  it("public seul sans tenant authentifié", () => {
    expect(resolveAccessibleQuestionIndexes({})).toEqual([PUBLIC_QUESTIONS_INDEX]);
    expect(resolveAccessibleVerbatimIndexes({})).toEqual([PUBLIC_VERBATIMS_INDEX]);
  });

  it("public + privé pour un tenant authentifié connu", () => {
    const headers = { authorization: basic("opubliq") };
    expect(resolveAccessibleQuestionIndexes(headers)).toEqual([
      PUBLIC_QUESTIONS_INDEX,
      `${PUBLIC_QUESTIONS_INDEX}-opubliq`,
    ]);
    expect(resolveAccessibleVerbatimIndexes(headers)).toEqual([
      PUBLIC_VERBATIMS_INDEX,
      `${PUBLIC_VERBATIMS_INDEX}-opubliq`,
    ]);
  });
});

describe("isMicrodataSurveyAccessible (f3i.14)", () => {
  // Régression : `medaillon_organismes_qualitatif` (privé opubliq) était
  // interrogeable via /microdata, /microdata-manifest et l'outil micro-données
  // de l'agent par N'IMPORTE QUEL compte Basic Auth valide — le rail
  // micro-données (Parquet/Blob) ne consultait jamais la résolution de tenant,
  // contrairement au catalogue AI Search. Fuite confirmée empiriquement avant
  // correctif (le sondage est bien présent dans le `_manifest.json` réel).

  it("un sondage public est accessible sans authentification", () => {
    expect(isMicrodataSurveyAccessible({}, "eeq_2014")).toBe(true);
  });

  it("un sondage privé n'est PAS accessible sans authentification", () => {
    expect(isMicrodataSurveyAccessible({}, "medaillon_organismes_qualitatif")).toBe(false);
  });

  it("un sondage privé n'est PAS accessible à un tenant authentifié tiers", () => {
    const headers = { authorization: basic("quelquun-dautre") };
    expect(isMicrodataSurveyAccessible(headers, "medaillon_organismes_qualitatif")).toBe(false);
  });

  it("le header x-client-id falsifiable n'élargit jamais l'accès", () => {
    expect(
      isMicrodataSurveyAccessible({ "x-client-id": "opubliq" }, "medaillon_organismes_qualitatif"),
    ).toBe(false);
  });

  it("un sondage privé EST accessible à son propriétaire authentifié", () => {
    const headers = { authorization: basic("opubliq") };
    expect(isMicrodataSurveyAccessible(headers, "medaillon_organismes_qualitatif")).toBe(true);
  });
});
