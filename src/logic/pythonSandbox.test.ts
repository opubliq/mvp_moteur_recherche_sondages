import { describe, expect, it, vi } from "vitest";
import {
  AcaSessionsExecutor,
  createRunPythonTool,
  managedIdentityTokenProvider,
  OUTPUT_SENTINEL,
  parseExecutionResponse,
  RUN_PYTHON_TOOL_DEF,
  SandboxError,
  sessionIdentifier,
  toModelPayload,
  wrapCode,
  DEFAULT_RUN_PYTHON_LIMITS,
  type RawExecution,
  type RunPythonResult,
  type SandboxExecutor,
} from "./pythonSandbox";

const POOL = "https://canadaeast.dynamicsessions.io/subscriptions/s/resourceGroups/rg/sessionPools/pool";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function sentinel(payload: Record<string, unknown>): string {
  return `\n${OUTPUT_SENTINEL}${JSON.stringify({ error: null, figures: [], tables: [], ...payload })}\n`;
}

/** Exécuteur en mémoire. */
function fakeExecutor(stdout = "hello" + sentinel({}), stderr = ""): SandboxExecutor & {
  files: Set<string>;
  uploads: string[];
  codes: string[];
} {
  const files = new Set<string>();
  const uploads: string[] = [];
  const codes: string[] = [];
  return {
    files,
    uploads,
    codes,
    async listFiles() {
      return [...files];
    },
    async uploadFile(_sid, filename) {
      files.add(filename);
      uploads.push(filename);
    },
    async execute(_sid, code): Promise<RawExecution> {
      codes.push(code);
      return { status: "Success", stdout, stderr };
    },
  };
}

describe("RUN_PYTHON_TOOL_DEF", () => {
  it("expose run_python avec code requis", () => {
    expect(RUN_PYTHON_TOOL_DEF.function.name).toBe("run_python");
    expect(RUN_PYTHON_TOOL_DEF.function.parameters.required).toEqual(["code"]);
  });
});

describe("AcaSessionsExecutor (HTTP mocké)", () => {
  it("execute : POST code/execute, Bearer, identifier, timeout borné à 220 s", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      jsonResponse({ properties: { status: "Success", stdout: "42\n", stderr: "", result: null } }),
    );
    const ex = new AcaSessionsExecutor({
      poolManagementEndpoint: POOL + "/",
      getToken: async () => "tok",
      fetch: fetchMock as unknown as typeof fetch,
    });
    const out = await ex.execute("sess-1234", "print(42)", 999);
    expect(out).toEqual({ status: "Success", stdout: "42\n", stderr: "" });
    const [url, init] = fetchMock.mock.calls[0];
    const u = new URL(String(url));
    expect(u.pathname.endsWith("/sessionPools/pool/code/execute")).toBe(true);
    expect(u.searchParams.get("identifier")).toBe("sess-1234");
    expect(u.searchParams.get("api-version")).toBe("2024-02-02-preview");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const body = JSON.parse(String(init!.body));
    expect(body.properties).toMatchObject({ codeInputType: "inline", executionType: "synchronous", code: "print(42)" });
    expect(body.properties.timeoutInSeconds).toBe(220);
  });

  it("profil 2025-10-02-preview : /executions et /files", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/executions")) {
        return jsonResponse({ status: "Succeeded", result: { stdout: "ok", stderr: "w" } });
      }
      return jsonResponse({}, 200);
    });
    const ex = new AcaSessionsExecutor({
      poolManagementEndpoint: POOL,
      getToken: async () => "t",
      apiVersion: "2025-10-02-preview",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await ex.execute("sess", "x", 10)).toEqual({ status: "Succeeded", stdout: "ok", stderr: "w" });
    await ex.uploadFile("sess", "a.parquet", new Uint8Array([1, 2, 3]));
    const uploadUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(uploadUrl.pathname.endsWith("/sessionPools/pool/files")).toBe(true);
  });

  it("uploadFile : multipart champ `file` avec nom de fichier", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => jsonResponse({}));
    const ex = new AcaSessionsExecutor({
      poolManagementEndpoint: POOL,
      getToken: async () => "t",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await ex.uploadFile("sess", "eeq_2014.parquet", new Uint8Array([80, 65, 82, 49]));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/files/upload?");
    const form = init!.body as FormData;
    const file = form.get("file") as File;
    expect(file.name).toBe("eeq_2014.parquet");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([80, 65, 82, 49]));
  });

  it("listFiles : lit value[].properties.filename", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ value: [{ properties: { filename: "a.parquet" } }, { properties: { filename: "b.csv" } }] }),
    );
    const ex = new AcaSessionsExecutor({
      poolManagementEndpoint: POOL,
      getToken: async () => "t",
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(await ex.listFiles("sess")).toEqual(["a.parquet", "b.csv"]);
  });

  it("HTTP non-2xx → SandboxError avec le statut", async () => {
    const fetchMock = vi.fn(async () => new Response("forbidden", { status: 403 }));
    const ex = new AcaSessionsExecutor({
      poolManagementEndpoint: POOL,
      getToken: async () => "t",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(ex.listFiles("sess")).rejects.toMatchObject({ name: "SandboxError", status: 403 });
  });

  it("refuse un endpoint non https", () => {
    expect(() => new AcaSessionsExecutor({ poolManagementEndpoint: "http://x", getToken: async () => "t" })).toThrow();
  });
});

describe("parseExecutionResponse", () => {
  it("tolère une réponse vide", () => {
    expect(parseExecutionResponse(null)).toEqual({ status: "Unknown", stdout: "", stderr: "" });
  });
});

describe("managedIdentityTokenProvider", () => {
  it("demande l'audience dynamicsessions et met en cache jusqu'à expiration", async () => {
    let t = 1_000_000_000_000;
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      jsonResponse({ access_token: "mi-token", expires_on: String(Math.floor(t / 1000) + 3600) }),
    );
    const get = managedIdentityTokenProvider({
      identityEndpoint: "http://localhost:4141/msi/token",
      identityHeader: "secret-header",
      fetch: fetchMock as unknown as typeof fetch,
      now: () => t,
    });
    expect(await get()).toBe("mi-token");
    expect(await get()).toBe("mi-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const u = new URL(String(fetchMock.mock.calls[0][0]));
    expect(u.searchParams.get("resource")).toBe("https://dynamicsessions.io");
    expect((fetchMock.mock.calls[0][1]!.headers as Record<string, string>)["X-IDENTITY-HEADER"]).toBe("secret-header");
    t += 3600 * 1000; // expiré
    await get();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("sessionIdentifier", () => {
  it("déterministe, 64 hex, dépend du secret, de l'usager et de la conversation", async () => {
    const a = await sessionIdentifier("s", "u1", "c1");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await sessionIdentifier("s", "u1", "c1")).toBe(a);
    expect(await sessionIdentifier("s", "u2", "c1")).not.toBe(a);
    expect(await sessionIdentifier("s", "u1", "c2")).not.toBe(a);
    expect(await sessionIdentifier("t", "u1", "c1")).not.toBe(a);
  });
  it("exige un secret", async () => {
    await expect(sessionIdentifier("", "u", "c")).rejects.toThrow();
  });
});

describe("wrapCode", () => {
  it("transmet le code en base64 (aucun échappement fragile) et finit par la sentinelle", () => {
    const code = 'print("é\\"\'""" 🎉")';
    const wrapped = wrapCode(code, DEFAULT_RUN_PYTHON_LIMITS);
    const b64 = /b64decode\("([A-Za-z0-9+/=]+)"\)/.exec(wrapped)![1];
    expect(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))).toBe(code);
    expect(wrapped).not.toContain(code);
    expect(wrapped).toContain(OUTPUT_SENTINEL);
  });
});

describe("createRunPythonTool", () => {
  const parquet = new Uint8Array([1, 2, 3]);

  it("téléverse les Parquet manquants seulement, puis exécute", async () => {
    const ex = fakeExecutor();
    ex.files.add("a.parquet");
    const fetchParquet = vi.fn(async () => parquet);
    const tool = createRunPythonTool({ executor: ex, sessionId: "sess", fetchParquet });
    const r = (await tool.run({ code: "print(1)", survey_ids: ["a", "b", "b"] })) as RunPythonResult;
    expect(r.ok).toBe(true);
    expect(r.stdout).toBe("hello");
    expect(r.loaded_surveys).toEqual(["a", "b"]);
    expect(fetchParquet).toHaveBeenCalledTimes(1);
    expect(fetchParquet).toHaveBeenCalledWith("b");
    expect(ex.uploads).toEqual(["b.parquet"]);
    expect(ex.codes[0]).toContain(OUTPUT_SENTINEL);
  });

  it("refus d'accès (fetchParquet lève) → { error } sans exécution", async () => {
    const ex = fakeExecutor();
    const tool = createRunPythonTool({
      executor: ex,
      sessionId: "sess",
      fetchParquet: async () => {
        throw new Error("Survey not found");
      },
    });
    const r = await tool.run({ code: "1", survey_ids: ["secret"] });
    expect(r).toEqual({ error: expect.stringContaining("Survey not found") });
    expect(ex.codes).toHaveLength(0);
  });

  it("valide les entrées", async () => {
    const tool = createRunPythonTool({ executor: fakeExecutor(), sessionId: "s", fetchParquet: async () => parquet });
    expect(await tool.run({})).toEqual({ error: "code est requis" });
    expect(await tool.run({ code: "1", survey_ids: "a" })).toMatchObject({ error: expect.any(String) });
    expect(await tool.run({ code: "1", survey_ids: ["../etc"] })).toMatchObject({ error: expect.stringContaining("invalide") });
    expect(await tool.run({ code: "x".repeat(DEFAULT_RUN_PYTHON_LIMITS.maxCodeChars + 1) })).toMatchObject({
      error: expect.stringContaining("trop long"),
    });
    expect(tool.callsMade).toBe(0);
  });

  it("plafond d'appels par requête", async () => {
    const tool = createRunPythonTool({
      executor: fakeExecutor(),
      sessionId: "s",
      fetchParquet: async () => parquet,
      limits: { maxCallsPerRequest: 2 },
    });
    await tool.run({ code: "1" });
    await tool.run({ code: "1" });
    expect(await tool.run({ code: "1" })).toMatchObject({ error: expect.stringContaining("plafond") });
    expect(tool.callsMade).toBe(2);
  });

  it("refuse un Parquet trop volumineux", async () => {
    const tool = createRunPythonTool({
      executor: fakeExecutor(),
      sessionId: "s",
      fetchParquet: async () => new Uint8Array(11),
      limits: { maxUploadBytes: 10 },
    });
    expect(await tool.run({ code: "1", survey_ids: ["a"] })).toMatchObject({ error: expect.stringContaining("volumineux") });
  });

  it("extrait figures et tableaux, tronque stdout (tête) et stderr (queue)", async () => {
    const out =
      "x".repeat(50) +
      sentinel({
        figures: ["iVBORw0KGgo=", "", "A".repeat(100)],
        tables: [{ title: "T", columns: ["a", "b"], rows: [[1, 2]], truncated: false }],
      });
    const tool = createRunPythonTool({
      executor: fakeExecutor(out, "line1\n" + "e".repeat(40) + "\nValueError: boom"),
      sessionId: "s",
      fetchParquet: async () => parquet,
      limits: { maxStdoutChars: 20, maxStderrChars: 16, maxFigureBase64Chars: 50 },
    });
    const r = (await tool.run({ code: "1" })) as RunPythonResult;
    expect(r.stdout_truncated).toBe(true);
    expect(r.stdout.startsWith("x".repeat(20))).toBe(true);
    expect(r.stderr_truncated).toBe(true);
    expect(r.stderr.endsWith("ValueError: boom")).toBe(true);
    expect(r.figures).toEqual([{ id: "fig-1", mime: "image/png", base64: "iVBORw0KGgo=" }]);
    expect(r.tables).toEqual([{ title: "T", columns: ["a", "b"], rows: [[1, 2]], truncated: false }]);

    const forModel = toModelPayload(r) as { figures: unknown[] };
    expect(JSON.stringify(forModel)).not.toContain("iVBORw0KGgo=");
    expect(forModel.figures).toEqual([{ id: "fig-1", mime: "image/png" }]);
  });

  it("erreur Python remontée via la sentinelle", async () => {
    const tool = createRunPythonTool({
      executor: fakeExecutor(sentinel({ error: "KeyError: 'q1'" }), "Traceback..."),
      sessionId: "s",
      fetchParquet: async () => parquet,
    });
    expect(await tool.run({ code: "1" })).toMatchObject({ ok: false, error: "KeyError: 'q1'" });
  });

  it("sentinelle absente (timeout / noyau mort) → erreur", async () => {
    const tool = createRunPythonTool({
      executor: fakeExecutor("partial", ""),
      sessionId: "s",
      fetchParquet: async () => parquet,
    });
    expect(await tool.run({ code: "1" })).toMatchObject({ ok: false, error: expect.stringContaining("interrompue") });
  });

  it("SandboxError de l'exécuteur → { error }, ne lève pas", async () => {
    const ex = fakeExecutor();
    ex.execute = async () => {
      throw new SandboxError(504, "Bac à sable : délai HTTP dépassé");
    };
    const tool = createRunPythonTool({ executor: ex, sessionId: "s", fetchParquet: async () => parquet });
    expect(await tool.run({ code: "1" })).toEqual({ error: "Bac à sable : délai HTTP dépassé" });
  });
});
