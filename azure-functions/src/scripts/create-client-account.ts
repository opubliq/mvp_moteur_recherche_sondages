/**
 * Script d'admin ponctuel (f3i.10) : crée un compte client P2 permanent —
 * `tenant` fixé (accès à l'index privé du client en plus du corpus public,
 * cf. `resolveAccessibleQuestionIndexes` dans `src/logic/tenancy.ts`),
 * `trialExpiresAt` absent (contrairement à `create-trial-account.ts`, ce
 * compte n'expire jamais tout seul).
 *
 * Jamais exposé en HTTP — cf. commentaire sur `signup()` dans auth-store.ts.
 * Étape 5 du runbook `docs/CLIENT_PROVISIONING_RUNBOOK.md` : le `tenant`
 * fourni ici doit déjà être enregistré dans `KNOWN_TENANTS`
 * (`src/logic/tenancy.ts`) — sinon le compte existerait sans qu'aucune
 * requête ne puisse jamais accéder à son index privé, ce qui indique presque
 * toujours un onboarding fait dans le mauvais ordre.
 *
 * Usage (depuis azure-functions/, après `npm run build`, avec
 * AZURE_STORAGE_ACCOUNT/AZURE_STORAGE_KEY dans l'environnement — les
 * App Settings de prod, jamais Azurite pour un vrai client) :
 *
 *   node dist/azure-functions/src/scripts/create-client-account.js \
 *     andrew@environics.ca "mot-de-passe-temporaire" andrew
 */

import { createAccount } from "../logic/auth-store";
import { KNOWN_TENANTS } from "../../../src/logic/tenancy";

async function main(): Promise<void> {
  const [email, password, tenant] = process.argv.slice(2);
  if (!email || !password || !tenant) {
    console.error("Usage: create-client-account.js <email> <password> <tenant-slug>");
    process.exitCode = 1;
    return;
  }

  if (!KNOWN_TENANTS.has(tenant)) {
    console.error(
      `Tenant "${tenant}" absent de KNOWN_TENANTS (src/logic/tenancy.ts) — ` +
        "l'ajouter d'abord (voir docs/CLIENT_PROVISIONING_RUNBOOK.md, étape 1).",
    );
    process.exitCode = 1;
    return;
  }

  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) {
    console.error("AZURE_STORAGE_ACCOUNT / AZURE_STORAGE_KEY absents de l'environnement.");
    process.exitCode = 1;
    return;
  }

  const result = await createAccount(email, password, { tenant }, { account, key, passwordPepper: process.env.PASSWORD_PEPPER });

  if ("error" in result) {
    console.error(`Échec de création du compte client : ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Compte client P2 créé : ${result.email}`);
  console.log(`Tenant : ${tenant}`);
  console.log(`Corpus accessible : public + index privé du tenant (sans expiration).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
