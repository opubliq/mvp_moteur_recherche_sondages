/**
 * Script d'admin ponctuel (f3i.7) : crée un compte d'essai P2 temporaire —
 * accès complet aux fonctionnalités P2 (agent analytique sans restriction)
 * mais scopé au corpus public, puisque `tenant` reste absent (cf.
 * `src/logic/tenancy.ts`, `resolveAccessibleQuestionIndexes`). Le compte
 * cesse de fonctionner automatiquement à `trialExpiresAt` (`verifySession`
 * dans `../logic/auth-store.ts` traite un essai expiré comme une session
 * invalide).
 *
 * Jamais exposé en HTTP — cf. commentaire sur `signup()` dans auth-store.ts.
 * Usage (depuis azure-functions/, après `npm run build`, avec
 * AZURE_STORAGE_ACCOUNT/AZURE_STORAGE_KEY dans l'environnement — les
 * App Settings de prod, jamais Azurite pour un vrai essai client) :
 *
 *   node dist/azure-functions/src/scripts/create-trial-account.js \
 *     andrew@environics.ca "mot-de-passe-temporaire" [jours]
 *
 * `jours` par défaut : 14 (durée `[À VALIDER]` de pricing/STRATEGIE_PRICING.md
 * §Essai P2 sur corpus public).
 */

import { createAccount } from "../logic/auth-store";

const DEFAULT_TRIAL_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

async function main(): Promise<void> {
  const [email, password, daysArg] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: create-trial-account.js <email> <password> [jours=14]");
    process.exitCode = 1;
    return;
  }

  const days = daysArg ? Number(daysArg) : DEFAULT_TRIAL_DAYS;
  if (!Number.isFinite(days) || days <= 0) {
    console.error(`Nombre de jours invalide : ${daysArg}`);
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

  const trialExpiresAt = Date.now() + days * MS_PER_DAY;
  const result = await createAccount(email, password, { trialExpiresAt }, { account, key, passwordPepper: process.env.PASSWORD_PEPPER });

  if ("error" in result) {
    console.error(`Échec de création du compte d'essai : ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Compte d'essai P2 créé : ${result.email}`);
  console.log(`Expire le : ${new Date(trialExpiresAt).toISOString()} (${days} jours)`);
  console.log(`Corpus accessible : public uniquement (aucun tenant assigné).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
