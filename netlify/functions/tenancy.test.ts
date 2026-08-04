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
  resolveAccessibleQuestionIndexes,
  resolveAccessibleVerbatimIndexes,
  resolveAuthorizedTenant,
} from "../../src/logic/tenancy";

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
