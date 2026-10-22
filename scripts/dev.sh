#!/usr/bin/env bash
# Lance la stack de dev complète en une commande : Azurite (storage requis par
# AzureWebJobsStorage) + Azure Functions (func start, :7071) + Vite (:5173,
# proxy /search /auth /agent /... vers 7071, cf. vite.config.ts).
#
# Depuis f3i.19/f3i.20, il n'y a plus de fallback Basic Auth : toute route API
# exige une session valide même en local. Si aucun compte n'existe encore,
# utilise scripts/create-local-account.sh pour t'en créer un.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNCTIONS_DIR="$ROOT_DIR/azure-functions"
AZURITE_DIR="$ROOT_DIR/.azurite"

mkdir -p "$AZURITE_DIR"

if [ ! -f "$FUNCTIONS_DIR/local.settings.json" ]; then
  echo "Erreur : azure-functions/local.settings.json manquant." >&2
  echo "Copie azure-functions/local.settings.json.example et remplis les clés (voir .env)." >&2
  exit 1
fi

if ! command -v azurite >/dev/null 2>&1; then
  echo "Erreur : 'azurite' introuvable (npm install -g azurite)." >&2
  exit 1
fi
if ! command -v func >/dev/null 2>&1; then
  echo "Erreur : 'func' (Azure Functions Core Tools) introuvable (npm install -g azure-functions-core-tools@4)." >&2
  exit 1
fi

PIDS=()
cleanup() {
  echo ""
  echo "Arrêt de la stack de dev..."
  # `func start` et `azurite` génèrent des processus enfants (core-tools,
  # worker node) non rattachés au PID direct : pkill par pattern plutôt que
  # de compter sur la propagation du signal au PID du wrapper.
  pkill -TERM -f "azurite --silent.*$AZURITE_DIR" >/dev/null 2>&1 || true
  pkill -TERM -f "azure-functions-core-tools" >/dev/null 2>&1 || true
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done
  wait >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "==> Azurite (log: .azurite/azurite.log)"
azurite --silent --location "$AZURITE_DIR" --debug "$AZURITE_DIR/debug.log" >"$AZURITE_DIR/azurite.log" 2>&1 &
PIDS+=($!)

for i in $(seq 1 20); do
  if curl -s -o /dev/null "http://127.0.0.1:10002/devstoreaccount1"; then
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "Erreur : Azurite (port 10002) n'a pas démarré. Voir .azurite/azurite.log" >&2
    exit 1
  fi
  sleep 0.5
done
echo "    Azurite prêt."

echo "==> Azure Functions build + func start (log: .azurite/func.log)"
(cd "$FUNCTIONS_DIR" && npm run build >"$AZURITE_DIR/func-build.log" 2>&1) || {
  echo "Erreur : build azure-functions a échoué. Voir .azurite/func-build.log" >&2
  exit 1
}
(cd "$FUNCTIONS_DIR" && func start >"$AZURITE_DIR/func.log" 2>&1) &
PIDS+=($!)

for i in $(seq 1 40); do
  if curl -s -o /dev/null -w '' "http://127.0.0.1:7071/surveys" 2>/dev/null; then
    break
  fi
  if [ "$i" -eq 40 ]; then
    echo "Erreur : func start (port 7071) n'a pas démarré à temps. Voir .azurite/func.log" >&2
    exit 1
  fi
  sleep 0.5
done
echo "    Azure Functions prêtes sur http://localhost:7071"

echo "==> Vite (http://localhost:5173) — Ctrl+C pour tout arrêter"
cd "$ROOT_DIR" && npm run dev
