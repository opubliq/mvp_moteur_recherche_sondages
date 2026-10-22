"""Serveur d'exécution du pool custom (Azure Container Apps dynamic sessions).

Un pool `CustomContainer` relaie chaque requête `<poolManagementEndpoint>/<chemin>?identifier=<id>`
vers le conteneur dédié à cet identifiant (port cible), après avoir validé le
jeton Entra (audience https://dynamicsessions.io, rôle Session Executor). Ce
serveur réimplémente le sous-ensemble de l'API code interpreter PythonLTS dont
se sert `AcaSessionsExecutor` (src/logic/pythonSandbox.ts), pour que le côté
TypeScript ne change que d'endpoint :

  2024-02-02-preview  POST /code/execute   GET /files   POST /files/upload
  2025-10-02-preview  POST /executions     GET /files   POST /files
  + GET /files/content/{name}, GET /health

Les paramètres de requête (`api-version`, `identifier`) sont ignorés : un
conteneur = une session. L'état Python persiste entre appels (noyau enfant,
kernel.py) ; une exécution qui dépasse son timeout tue et relance le noyau.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import multiprocessing as mp
import os
import tempfile
import time
from datetime import datetime, timezone

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse, PlainTextResponse
from starlette.routing import Route

import kernel

DATA_DIR = os.environ.get("SANDBOX_DATA_DIR", "/mnt/data")
DEFAULT_TIMEOUT = float(os.environ.get("SANDBOX_DEFAULT_TIMEOUT_SECONDS", "60"))
MAX_TIMEOUT = float(os.environ.get("SANDBOX_MAX_TIMEOUT_SECONDS", "220"))
MAX_UPLOAD_BYTES = int(os.environ.get("SANDBOX_MAX_UPLOAD_BYTES", str(128 * 1024 * 1024)))

log = logging.getLogger("sandbox")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


class Kernel:
    """Noyau persistant unique ; exécutions sérialisées."""

    def __init__(self) -> None:
        self._ctx = mp.get_context("spawn")
        self._proc = None
        self._conn = None
        self._lock = asyncio.Lock()

    def _start(self) -> None:
        parent, child = self._ctx.Pipe()
        proc = self._ctx.Process(target=kernel.main, args=(child,), daemon=True)
        proc.start()
        child.close()
        self._proc, self._conn = proc, parent

    def _kill(self) -> None:
        if self._proc is not None:
            with contextlib.suppress(Exception):
                self._proc.kill()
                self._proc.join(5)
        if self._conn is not None:
            with contextlib.suppress(Exception):
                self._conn.close()
        self._proc = self._conn = None

    async def _ensure(self) -> None:
        if self._proc is not None and self._proc.is_alive():
            return
        self._kill()
        self._start()
        # Attend le signal "ready" (imports de chauffe) — borné.
        if not await asyncio.to_thread(self._conn.poll, 120):
            self._kill()
            raise RuntimeError("le noyau n'a pas démarré")
        self._conn.recv()

    async def warm(self) -> None:
        async with self._lock:
            with contextlib.suppress(Exception):
                await self._ensure()

    async def execute(self, code: str, timeout: float) -> dict:
        async with self._lock:
            t0 = time.monotonic()
            await self._ensure()
            self._conn.send({"code": code})
            ready = await asyncio.to_thread(self._conn.poll, timeout)
            if not ready:
                self._kill()
                return {
                    "status": "Failed",
                    "stdout": "",
                    "stderr": f"TimeoutError: exécution interrompue après {timeout:.0f} s (noyau redémarré, état perdu)\n",
                    "result": "",
                    "ms": int((time.monotonic() - t0) * 1000),
                }
            try:
                res = self._conn.recv()
            except (EOFError, OSError):
                code_ = self._proc.exitcode if self._proc else None
                self._kill()
                res = {
                    "status": "Failed",
                    "stdout": "",
                    "stderr": f"KernelDied: noyau Python arrêté (exit {code_}, mémoire ?) ; état perdu\n",
                    "result": "",
                }
            res["ms"] = int((time.monotonic() - t0) * 1000)
            return res


KERNEL = Kernel()


def _timeout(v) -> float:
    try:
        t = float(v)
    except (TypeError, ValueError):
        t = DEFAULT_TIMEOUT
    return min(max(1.0, t), MAX_TIMEOUT)


async def _read_exec_body(request: Request) -> tuple[str, float]:
    body = await request.json()
    props = body.get("properties", body) if isinstance(body, dict) else {}
    code = props.get("code", "")
    if not isinstance(code, str):
        code = ""
    return code, _timeout(props.get("timeoutInSeconds"))


async def code_execute(request: Request):
    """Forme 2024-02-02-preview."""
    code, timeout = await _read_exec_body(request)
    r = await KERNEL.execute(code, timeout)
    return JSONResponse(
        {
            "properties": {
                "status": r["status"],
                "stdout": r["stdout"],
                "stderr": r["stderr"],
                "result": r["result"],
                "executionTimeInMilliseconds": r["ms"],
            }
        }
    )


async def executions(request: Request):
    """Forme 2025-10-02-preview."""
    code, timeout = await _read_exec_body(request)
    r = await KERNEL.execute(code, timeout)
    return JSONResponse(
        {
            "status": "Succeeded" if r["status"] == "Success" else "Failed",
            "result": {
                "stdout": r["stdout"],
                "stderr": r["stderr"],
                "executionResult": r["result"],
                "executionTimeInMilliseconds": r["ms"],
            },
        }
    )


def _safe_name(name: str | None) -> str | None:
    if not name:
        return None
    base = os.path.basename(name.replace("\\", "/"))
    if base in ("", ".", "..") or base.startswith("."):
        return None
    return base


def _file_entry(name: str) -> dict:
    st = os.stat(os.path.join(DATA_DIR, name))
    mtime = datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat()
    props = {"filename": name, "size": st.st_size, "lastModifiedTime": mtime}
    return {"properties": props, **props}


async def list_files(request: Request):
    os.makedirs(DATA_DIR, exist_ok=True)
    names = sorted(n for n in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, n)))
    return JSONResponse({"value": [_file_entry(n) for n in names]})


async def upload_files(request: Request):
    clen = request.headers.get("content-length")
    if clen and clen.isdigit() and int(clen) > MAX_UPLOAD_BYTES + 1024 * 1024:
        return PlainTextResponse("fichier trop volumineux", status_code=413)
    form = await request.form(max_files=10)
    saved = []
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        for _, value in form.multi_items():
            if not hasattr(value, "filename"):
                continue
            name = _safe_name(value.filename)
            if name is None:
                return PlainTextResponse("nom de fichier invalide", status_code=400)
            fd, tmp = tempfile.mkstemp(dir=DATA_DIR, prefix=".upload-")
            size = 0
            with os.fdopen(fd, "wb") as out:
                while chunk := await value.read(1024 * 1024):
                    size += len(chunk)
                    if size > MAX_UPLOAD_BYTES:
                        out.close()
                        os.unlink(tmp)
                        return PlainTextResponse("fichier trop volumineux", status_code=413)
                    out.write(chunk)
            os.replace(tmp, os.path.join(DATA_DIR, name))
            saved.append(_file_entry(name))
    finally:
        await form.close()
    if not saved:
        return PlainTextResponse("aucun fichier (champ multipart `file`)", status_code=400)
    return JSONResponse({"value": saved})


async def file_content(request: Request):
    name = _safe_name(request.path_params["name"])
    path = os.path.join(DATA_DIR, name) if name else None
    if not path or not os.path.isfile(path):
        return PlainTextResponse("introuvable", status_code=404)
    return FileResponse(path, filename=name)


async def health(request: Request):
    return PlainTextResponse("ok")


@contextlib.asynccontextmanager
async def lifespan(app):
    # Chauffe le noyau en arrière-plan : la sonde de santé répond tout de suite.
    task = asyncio.create_task(KERNEL.warm())
    yield
    task.cancel()


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/code/execute", code_execute, methods=["POST"]),
        Route("/executions", executions, methods=["POST"]),
        Route("/files", list_files, methods=["GET"]),
        Route("/files", upload_files, methods=["POST"]),
        Route("/files/upload", upload_files, methods=["POST"]),
        Route("/files/content/{name}", file_content, methods=["GET"]),
    ],
    lifespan=lifespan,
)


if __name__ == "__main__":
    import uvicorn

    os.makedirs(DATA_DIR, exist_ok=True)
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), log_level="info")
