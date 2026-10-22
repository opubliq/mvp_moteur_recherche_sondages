"""Noyau Python persistant d'une session (processus enfant du serveur).

Un seul noyau par conteneur (= par identifiant de session ACA). L'état
(`globals()`) persiste entre les exécutions, comme le code interpreter
PythonLTS. Le serveur le tue et le relance si une exécution dépasse son
timeout (l'état est alors perdu, comme un redémarrage de noyau Jupyter).

Protocole (multiprocessing.Connection) : reçoit {"code": str}, renvoie
{"status", "stdout", "stderr", "result"} où `result` est la valeur de la
dernière expression : une `str` est renvoyée telle quelle (comme PythonLTS),
sinon son `repr`, `""` si None / pas d'expression finale.
"""

from __future__ import annotations

import ast
import contextlib
import io
import os
import traceback

DATA_DIR = os.environ.get("SANDBOX_DATA_DIR", "/mnt/data")


def _warm_imports() -> None:
    # Imports lourds faits une fois au démarrage du noyau (pas dans la requête).
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot  # noqa: F401
        import numpy  # noqa: F401
        import pandas  # noqa: F401
        import pyarrow.parquet  # noqa: F401
        import scipy.stats  # noqa: F401
    except Exception:  # pragma: no cover - diagnostic seulement
        traceback.print_exc()


def run_cell(code: str, ns: dict) -> dict:
    out, err = io.StringIO(), io.StringIO()
    status, result = "Success", ""
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            tree = ast.parse(code, "<cell>")
            last = None
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                last = ast.Expression(tree.body.pop().value)
            exec(compile(tree, "<cell>", "exec"), ns)
            if last is not None:
                value = eval(compile(last, "<cell>", "eval"), ns)
                if isinstance(value, str):
                    result = value
                elif value is not None:
                    result = repr(value)
        except BaseException as e:  # noqa: BLE001 - SystemExit inclus : le noyau survit
            status = "Failed"
            # Saute la frame de run_cell : le traceback commence dans <cell>.
            traceback.print_exception(type(e), e, e.__traceback__.tb_next if e.__traceback__ else None)
    return {"status": status, "stdout": out.getvalue(), "stderr": err.getvalue(), "result": result}


def main(conn) -> None:  # conn : multiprocessing.connection.Connection
    os.makedirs(DATA_DIR, exist_ok=True)
    os.chdir(DATA_DIR)
    _warm_imports()
    ns: dict = {"__name__": "__main__"}
    conn.send({"ready": True})
    while True:
        try:
            msg = conn.recv()
        except EOFError:
            return
        conn.send(run_cell(msg.get("code", ""), ns))
