/**
 * Test unitaire de la résolution du tenant (ticket 97r.5).
 *
 * Vérifie les deux sources d'identité disponibles au stade actuel (header
 * explicite `x-client-id`, puis nom d'utilisateur du Basic Auth global), la
 * normalisation, et le fallback `"unknown"` — qui ne doit JAMAIS lever.
 *
 * Placé sous `netlify/functions/` : seul répertoire découvert par vitest.
 */
import { describe, expect, it } from "vitest";
import { resolveClientId, usageIdentity, UNKNOWN_CLIENT_ID } from "../../../src/logic/costlog";

/** Encode un couple Basic Auth comme le ferait un navigateur. */
function basic(user: string, password = "pw"): string {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

describe("resolveClientId (97r.5)", () => {
  it("prend x-client-id quand il est présent (Headers, fonction v2)", () => {
    const headers = new Headers({ "x-client-id": "acme", authorization: basic("shared") });
    expect(resolveClientId(headers)).toBe("acme");
  });

  it("prend x-client-id depuis le dictionnaire d'en-têtes (fonction v1)", () => {
    expect(resolveClientId({ "x-client-id": "acme" })).toBe("acme");
    // Netlify minuscule les clés, mais un appel direct peut varier la casse.
    expect(resolveClientId({ "X-Client-Id": "acme" })).toBe("acme");
  });

  it("retombe sur l'utilisateur du Basic Auth global si pas de header explicite", () => {
    expect(resolveClientId({ authorization: basic("ville-de-quebec") })).toBe("ville-de-quebec");
  });

  it("normalise : minuscules, charset sûr, borné à 64 caractères", () => {
    expect(resolveClientId({ "x-client-id": "  ACME Inc.  " })).toBe("acme-inc.");
    // Pas de guillemet ni de saut de ligne injectable dans le JSON Lines.
    expect(resolveClientId({ "x-client-id": 'a"\nb' })).toBe("a--b");
    expect(resolveClientId({ "x-client-id": "x".repeat(200) })).toHaveLength(64);
  });

  it('retombe sur "unknown" — jamais d\'exception', () => {
    expect(resolveClientId(undefined)).toBe(UNKNOWN_CLIENT_ID);
    expect(resolveClientId({})).toBe(UNKNOWN_CLIENT_ID);
    expect(resolveClientId({ "x-client-id": "   " })).toBe(UNKNOWN_CLIENT_ID);
    expect(resolveClientId({ authorization: "Bearer xyz" })).toBe(UNKNOWN_CLIENT_ID);
    // Base64 illisible : décodage absorbé.
    expect(resolveClientId({ authorization: "Basic !!!not-base64!!!" })).toBe(UNKNOWN_CLIENT_ID);
  });

  it("deux identités distinctes produisent deux client_id distincts", () => {
    const a = resolveClientId({ "x-client-id": "client-a" });
    const b = resolveClientId({ authorization: basic("client-b") });
    expect(a).not.toBe(b);
    expect([a, b]).toEqual(["client-a", "client-b"]);
  });
});

describe("usageIdentity (97r.5)", () => {
  it("propage le contexte fourni tel quel", () => {
    expect(usageIdentity({ clientId: "acme", requestId: "req-1" })).toEqual({
      client_id: "acme",
      request_id: "req-1",
    });
  });

  it("comble les manques : client_id unknown + request_id généré", () => {
    const id = usageIdentity(undefined);
    expect(id.client_id).toBe(UNKNOWN_CLIENT_ID);
    expect(id.request_id.length).toBeGreaterThan(0);

    const partial = usageIdentity({ requestId: "req-2" });
    expect(partial).toEqual({ client_id: UNKNOWN_CLIENT_ID, request_id: "req-2" });
  });
});
