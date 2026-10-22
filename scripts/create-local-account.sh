#!/usr/bin/env bash
# Crée (ou recrée) un compte d'essai P2 pour tester l'app en local.
# Le compte est écrit dans le VRAI Azure Table Storage (AZURE_STORAGE_ACCOUNT/KEY
# de local.settings.json) — pas Azurite, qui ne sert qu'à AzureWebJobsStorage.
# C'est le même mécanisme que la prod (cf. azure-functions/src/scripts/create-trial-account.ts).
#
# Usage: scripts/create-local-account.sh <email> <password> [jours=365]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNCTIONS_DIR="$ROOT_DIR/azure-functions"

EMAIL="${1:-}"
PASSWORD="${2:-}"
DAYS="${3:-365}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: scripts/create-local-account.sh <email> <password> [jours=365]" >&2
  exit 1
fi

if [ ! -f "$FUNCTIONS_DIR/local.settings.json" ]; then
  echo "Erreur : azure-functions/local.settings.json manquant." >&2
  exit 1
fi

eval "$(node -e "
const v = require('$FUNCTIONS_DIR/local.settings.json').Values;
for (const k of ['AZURE_STORAGE_ACCOUNT', 'AZURE_STORAGE_KEY', 'PASSWORD_PEPPER']) {
  if (v[k]) console.log(\`export \${k}=\${JSON.stringify(v[k])}\`);
}
")"

if [ -z "${AZURE_STORAGE_ACCOUNT:-}" ] || [ -z "${AZURE_STORAGE_KEY:-}" ]; then
  echo "Erreur : AZURE_STORAGE_ACCOUNT/AZURE_STORAGE_KEY absents de local.settings.json." >&2
  exit 1
fi

cd "$FUNCTIONS_DIR"
npm run build >/dev/null
node dist/azure-functions/src/scripts/create-trial-account.js "$EMAIL" "$PASSWORD" "$DAYS"
