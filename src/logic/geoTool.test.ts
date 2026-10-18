import { describe, expect, it, vi } from "vitest";
import {
  assertAllowedPath,
  compactDonationIndex,
  compactGeoLookup,
  compactGeoProfile,
  createGeoTool,
  GeoForbiddenPathError,
  GEO_ALLOWED_PATHS,
  isGeoDonationsAllowed,
} from "./geoTool";

/**
 * Outil géo (recensement, bead 9ou.5) — garde-fou anti-`dons` (Loi 25) et
 * compaction des réponses pour le modèle. Pas de réseau réel : `fetch` est
 * injecté (même esprit que les autres outils de agent.ts).
 */

describe("assertAllowedPath : liste blanche census/geo (jamais /dons/*)", () => {
  it("accepte les routes census/geo connues", () => {
    for (const p of [
      "/ad/profile",
      "/ad/variables",
      "/ad/24560123",
      "/niveaux",
      "/geo/cp/G1V0A6",
      "/profil/municipalite",
      "/profil/municipalite/levis",
      "/profil/code_postal/G1V0A6",
    ]) {
      expect(() => assertAllowedPath(p)).not.toThrow();
    }
  });

  it("refuse toute route /dons/*, même déguisée", () => {
    for (const p of ["/dons/indice", "/DONS/indice", "/profil/dons/indice", "/ad/dons"]) {
      expect(() => assertAllowedPath(p)).toThrow(GeoForbiddenPathError);
    }
  });

  it("refuse une route hors liste blanche (POST /ad/segments, racine, inconnue)", () => {
    for (const p of ["/ad/segments", "/", "/profil", "/autre-chose"]) {
      expect(() => assertAllowedPath(p)).toThrow(GeoForbiddenPathError);
    }
  });

  it("GEO_ALLOWED_PATHS ne contient aucune entrée qui matche 'dons'", () => {
    for (const re of GEO_ALLOWED_PATHS) {
      expect(re.test("/dons/indice")).toBe(false);
    }
  });
});

describe("isGeoDonationsAllowed : flag + allowlist exacte", () => {
  it("exige le flag exact et le courriel exact, sans joker de domaine", () => {
    const list = "info@opubliq.com, interne@opubliq.com";
    expect(isGeoDonationsAllowed("Info@Opubliq.com", "true", list)).toBe(true);
    expect(isGeoDonationsAllowed("autre@opubliq.com", "true", list)).toBe(false);
    expect(isGeoDonationsAllowed("info@opubliq.com", "false", list)).toBe(false);
    expect(isGeoDonationsAllowed("info@opubliq.com", "TRUE", list)).toBe(false);
  });
});

describe("compactGeoProfile / compactGeoLookup : sortie compacte, source citée", () => {
  it("compacte un profil /profil/{niveau}/{code} : variables en lignes var=val, nombres arrondis", () => {
    const profil = {
      niveau: "circonscription_2026",
      code: "25213",
      nom: "Rosemont",
      population: 68421.4,
      menages: 33120.0,
      n_ad: 142,
      precision: "bonne",
      variables: {
        revenu_median_apres_impot_menage: 52345.678,
        pct_francais: 78.234,
        pct_universitaire: null,
      },
      couverture: { revenu_median_apres_impot_menage: 0.97, pct_francais: 0.99 },
      methode: { approximations: ["revenu_median_apres_impot_menage_approx"] },
      notes: ["couverture < 90% sur une variable"],
    };
    const out = compactGeoProfile(profil) as Record<string, unknown>;
    expect(out.source).toMatch(/Recensement 2021.*StatCan/);
    expect(out.niveau).toBe("circonscription_2026");
    expect(out.nom).toBe("Rosemont");
    expect(out.population).toBe(68421); // arrondi (>=10)
    expect(out.variables).toEqual(
      expect.arrayContaining(["revenu_median_apres_impot_menage=52346", "pct_francais=78.23"]),
    );
    // pas de variable null
    expect((out.variables as string[]).some((l) => l.startsWith("pct_universitaire"))).toBe(false);
    expect(out.notes).toEqual(["couverture < 90% sur une variable"]);
    expect(out.couverture_moyenne).toBeCloseTo(0.98, 2);
    // methode brut n'est pas renvoyé (compaction)
    expect(out.methode).toBeUndefined();
  });

  it("compacte une réponse /geo/cp/{code}", () => {
    const r = {
      code_postal: "G1V0A6",
      rta: "G1V",
      dauid: "24230123",
      municipalites: [{ co_mun: "23027", nom_mun: "Québec", part: 1 }],
      co_cep_2026: "2502",
      circonscription_2026: "Rosemont",
      statut: "actif",
    };
    const out = compactGeoLookup(r) as Record<string, unknown>;
    expect(out.code_postal).toBe("G1V0A6");
    expect(out.municipalites).toEqual(["Québec (100%)"]);
    expect(out.circonscription_2026).toBe("Rosemont");
    expect(out.statut).toBeUndefined(); // "actif" omis (bruit)
  });
});

describe("compactDonationIndex : sortie interne désidentifiée et bornée", () => {
  const raw = {
    resultats: [
      { code_postal: "H2G1A1", indice: 0.2 },
      { code_postal: "H2G1A2", indice: 0.8 },
      { code_postal: "H2G1A3", indice: 0.5 },
    ],
    test_sensibilite: { variation_max: 0.07123, conforme: true },
  };

  it("résume une municipalité avec top/bottom sans champs bruts", () => {
    const out = compactDonationIndex(raw, { topN: 1, explicitCodes: false });
    expect(out.source).toMatch(/DGEQ 2018.*interne/);
    expect(out.n_codes).toBe(3);
    expect(out.distribution).toEqual({ minimum: 0.2, moyenne: 0.5, mediane: 0.5, maximum: 0.8 });
    expect(out.plus_eleves).toEqual([{ code_postal: "H2G1A2", indice: 0.8 }]);
    expect(out.plus_faibles).toEqual([{ code_postal: "H2G1A1", indice: 0.2 }]);
    expect(JSON.stringify(out)).not.toMatch(/montant|n_dons|parti|donateur/);
  });

  it("retourne tous les codes explicitement demandés", () => {
    const out = compactDonationIndex(raw, { topN: 1, explicitCodes: true });
    expect(out.resultats).toHaveLength(3);
    expect(out.plus_eleves).toBeUndefined();
  });
});

function fakeFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  });
}

describe("createGeoTool : profile() / lookup() (dispatch HTTP, pas de réseau réel)", () => {
  it("profile({postal_code}) appelle /profil/code_postal/{cp} et compacte", async () => {
    const fetchMock = fakeFetch((url) => {
      expect(url).toContain("/profil/code_postal/G1V0A6");
      return { status: 200, body: { niveau: "code_postal", code: "G1V0A6", population: 1200, variables: {} } };
    });
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: fetchMock as unknown as typeof fetch });
    const r = (await tool.profile({ postal_code: "G1V 0A6" })) as Record<string, unknown>;
    expect(r.code).toBe("G1V0A6");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("profile({niveau, code}) appelle /profil/{niveau}/{code}", async () => {
    const fetchMock = fakeFetch((url) => {
      expect(url).toContain("/profil/municipalite/L%C3%A9vis");
      return { status: 200, body: { niveau: "municipalite", code: "23027", nom: "Lévis", population: 149683, variables: {} } };
    });
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: fetchMock as unknown as typeof fetch });
    const r = (await tool.profile({ niveau: "municipalite", code: "Lévis" })) as Record<string, unknown>;
    expect(r.nom).toBe("Lévis");
  });

  it("profile({lat, lon}) appelle /ad/profile?lat=&lng=", async () => {
    const fetchMock = fakeFetch((url) => {
      expect(url).toContain("/ad/profile?lat=46.8&lng=-71.2");
      return { status: 200, body: { dauid: "24230123", variables: { pct_francais: 80 } } };
    });
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: fetchMock as unknown as typeof fetch });
    const r = (await tool.profile({ lat: 46.8, lon: -71.2 })) as Record<string, unknown>;
    expect(r.code).toBe("24230123");
    expect(r.niveau).toBe("ad");
  });

  it("profile() rejette un niveau inconnu sans appeler fetch", async () => {
    const fetchMock = vi.fn();
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: fetchMock as unknown as typeof fetch });
    const r = (await tool.profile({ niveau: "dons", code: "x" })) as { error: string };
    expect(r.error).toMatch(/niveau inconnu/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("profile() rejette un code postal mal formé sans appeler fetch", async () => {
    const fetchMock = vi.fn();
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: fetchMock as unknown as typeof fetch });
    const r = (await tool.profile({ postal_code: "pas-un-cp" })) as { error: string };
    expect(r.error).toMatch(/invalide/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lookup({postal_code}) appelle /geo/cp/{cp}", async () => {
    const fetchMock = fakeFetch((url) => {
      expect(url).toContain("/geo/cp/G1V0A6");
      return {
        status: 200,
        body: { code_postal: "G1V0A6", rta: "G1V", dauid: "d", municipalites: [], circonscription_2026: "Rosemont" },
      };
    });
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: fetchMock as unknown as typeof fetch });
    const r = (await tool.lookup({ postal_code: "G1V0A6" })) as Record<string, unknown>;
    expect(r.circonscription_2026).toBe("Rosemont");
  });

  it("envoie Authorization: Bearer <token> quand getToken est fourni", async () => {
    const seen: Record<string, string> = {};
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      Object.assign(seen, init?.headers as Record<string, string>);
      return { ok: true, status: 200, json: async () => ({}), text: async () => "{}" } as unknown as Response;
    });
    const tool = createGeoTool({
      baseUrl: "http://localhost:8000",
      fetch: fetchMock as unknown as typeof fetch,
      getToken: async () => "abc123",
    });
    await tool.lookup({ postal_code: "G1V0A6" });
    expect(seen.Authorization).toBe("Bearer abc123");
  });

  it("une 404 de l'API devient une erreur lisible, pas une exception non gérée", async () => {
    const fetchMock = fakeFetch(() => ({ status: 404, body: { detail: "introuvable" } }));
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: fetchMock as unknown as typeof fetch });
    await expect(tool.lookup({ postal_code: "G1V0A6" })).rejects.toThrow(/HTTP 404/);
  });

  it("n'expose aucune méthode dons par défaut", () => {
    const tool = createGeoTool({ baseUrl: "http://localhost:8000", fetch: vi.fn() as unknown as typeof fetch });
    expect(tool.donationIndex).toBeUndefined();
  });

  it("POSTe uniquement /dons/indice quand l'accès interne est accordé et compacte la réponse", async () => {
    let seenBody: unknown;
    const fetchMock = fakeFetch((url, init) => {
      expect(url).toBe("http://localhost:8000/dons/indice");
      expect(init?.method).toBe("POST");
      seenBody = JSON.parse(String(init?.body));
      return {
        status: 200,
        body: {
          resultats: [
            { code_postal: "H2G1A1", indice: 0.31 },
            { code_postal: "H2G1A2", indice: 0.72 },
          ],
          test_sensibilite: { variation_max: 0.05, conforme: true },
        },
      };
    });
    const tool = createGeoTool({
      baseUrl: "http://localhost:8000",
      fetch: fetchMock as unknown as typeof fetch,
      getToken: async () => "mi-token",
      allowDonations: true,
    });
    const out = (await tool.donationIndex?.({ municipalite: "Montréal", poids_annees: { "2025": 1, "*": 0 } })) as Record<string, unknown>;
    expect(seenBody).toEqual({
      territoire: { municipalite: "Montréal" },
      ponderation: { annees: { "2025": 1, "*": 0 } },
    });
    expect(out.n_codes).toBe(2);
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer mi-token" });
  });

  it("valide territoire, codes et pondérations avant tout appel", async () => {
    const fetchMock = vi.fn();
    const tool = createGeoTool({
      baseUrl: "http://localhost:8000",
      fetch: fetchMock as unknown as typeof fetch,
      allowDonations: true,
    });
    expect(await tool.donationIndex?.({})).toMatchObject({ error: expect.stringMatching(/exactement/) });
    expect(await tool.donationIndex?.({ municipalite: "Lévis", codes_postaux: ["G6V1A1"] })).toMatchObject({ error: expect.any(String) });
    expect(await tool.donationIndex?.({ codes_postaux: ["invalide"] })).toMatchObject({ error: expect.stringMatching(/invalide/) });
    expect(await tool.donationIndex?.({ municipalite: "Lévis", poids_annees: { "2025": -1 } })).toMatchObject({ error: expect.stringMatching(/Poids invalide/) });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
