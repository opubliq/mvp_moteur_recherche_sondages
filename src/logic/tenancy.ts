/**
 * Résolution des index accessibles par client — ticket f3i.11.
 *
 * Design : `docs/multi_tenant_design.md` (bead f3i.9). Convention de nommage
 * `{index}-{client_slug}` (ex. `survey-questions-opubliq`), tenue en synchro
 * avec `ingestion/tenancy.py::PRIVATE_SURVEYS` côté Python (les deux listes
 * sont indépendantes : celle-ci contrôle l'ACCÈS en lecture, l'autre contrôle
 * le ROUTAGE à l'ingestion — un client peut apparaître dans l'une avant
 * l'autre selon l'ordre des opérations, mais doivent converger).
 *
 * SOURCE D'IDENTITÉ (f3i.19.3, fallback Basic Auth retiré côté Azure en
 * f3i.20). Les fonctions `resolveAccessible*` et `isMicrodataSurveyAccessible`
 * prennent un `tenant` déjà résolu, plutôt que les headers de la requête —
 * côté Azure Functions, cette résolution se fait une seule fois par requête
 * dans `azure-functions/src/middleware/auth.ts` (`checkAuth`), directement à
 * partir du tenant porté par la session (plus de Basic Auth du tout sur ce
 * chemin). `resolveAuthorizedTenant` (headers → tenant, Basic Auth uniquement)
 * reste néanmoins exportée et VIVANTE : c'est elle qu'utilisent encore les
 * fonctions `netlify/functions/*.ts` (gate Basic Auth global via
 * `netlify/edge-functions/auth.ts`, mécanisme distinct et non affecté par
 * f3i.20).
 *
 * Le principe de sécurité ne change pas : un tenant ne doit JAMAIS provenir
 * d'un header explicite falsifiable (`x-client-id`), seulement d'une identité
 * authentifiée (session ou Basic Auth) résolue côté serveur.
 */

import { basicAuthUser, readHeader, sanitizeClientId, type HeaderSource } from "./costlog";

/** Index public (P1), toujours interrogé, quel que soit le compte. */
export const PUBLIC_QUESTIONS_INDEX = "survey-questions";
export const PUBLIC_VERBATIMS_INDEX = "survey-verbatims";

/**
 * Clients ayant un index privé provisionné sur Azure AI Search. Doit rester
 * synchronisé avec les index réellement créés (`ingestion/create_index.py`,
 * `ingestion/create_verbatims_index.py`) — un slug ajouté ici sans index
 * existant ferait échouer les requêtes sur cet index (404 Azure).
 *
 * Exporté pour `azure-functions/src/scripts/create-client-account.ts`, qui
 * s'en sert de garde-fou anti-typo avant de créer un compte pour un tenant.
 */
export const KNOWN_TENANTS = new Set(["opubliq"]);

/**
 * Résout le tenant AUTORISÉ à partir du Basic Auth uniquement (jamais du
 * header `x-client-id`). Retourne `undefined` si aucun tenant privé connu
 * n'est authentifié — l'appelant reste alors sur le corpus public seul.
 */
export function resolveAuthorizedTenant(headers: HeaderSource): string | undefined {
  try {
    const user = sanitizeClientId(basicAuthUser(readHeader(headers, "authorization")));
    if (user && KNOWN_TENANTS.has(user)) return user;
  } catch {
    /* absorbé — jamais d'exception sur un chemin d'autorisation */
  }
  return undefined;
}

/**
 * Index catalogue (`survey-questions*`) accessibles pour cette requête :
 * toujours le public, plus l'index privé du tenant authentifié le cas échéant
 * (croisement public+privé dans une même requête — contrainte produit du
 * design multi-tenant, ne pas cloisonner). `tenant` doit provenir d'une
 * identité déjà authentifiée côté serveur (jamais d'un header brut).
 */
export function resolveAccessibleQuestionIndexes(tenant: string | undefined): string[] {
  return tenant ? [PUBLIC_QUESTIONS_INDEX, `${PUBLIC_QUESTIONS_INDEX}-${tenant}`] : [PUBLIC_QUESTIONS_INDEX];
}

/** Même principe que {@link resolveAccessibleQuestionIndexes}, pour les verbatims. */
export function resolveAccessibleVerbatimIndexes(tenant: string | undefined): string[] {
  return tenant ? [PUBLIC_VERBATIMS_INDEX, `${PUBLIC_VERBATIMS_INDEX}-${tenant}`] : [PUBLIC_VERBATIMS_INDEX];
}

/**
 * Propriété par sondage — rail micro-données (f3i.14). Miroir TS de
 * `ingestion/tenancy.py::PRIVATE_SURVEYS` : un `survey_id` absent d'ici est
 * public (accessible à tout compte authentifié) ; un `survey_id` présent est
 * réservé exclusivement à son client.
 *
 * POURQUOI UNE TABLE SÉPARÉE de `KNOWN_TENANTS`/l'index catalogue : le rail
 * micro-données (`/microdata`, `/microdata-manifest`, `microdata-core/`) est
 * un pipeline Parquet/Blob indépendant du catalogue AI Search — il identifie
 * un sondage par `survey_id` (pas par index), et jusqu'ici ne consultait
 * jamais la résolution de tenant. Audit f3i.14 : `medaillon_organismes_qualitatif`
 * (privé opubliq) apparaissait dans `_manifest.json` et était interrogeable
 * via `/microdata?survey_id=...` par N'IMPORTE QUEL compte Basic Auth valide,
 * fuite de données confirmée empiriquement avant ce correctif.
 */
export const PRIVATE_MICRODATA_SURVEYS: Record<string, string> = {
  medaillon_organismes_qualitatif: "opubliq",
};

/**
 * Un `survey_id` du rail micro-données est-il accessible pour cette requête ?
 * Vrai si le sondage est public (absent de {@link PRIVATE_MICRODATA_SURVEYS})
 * ou si `tenant` (identité déjà authentifiée côté serveur) en est le
 * propriétaire.
 */
export function isMicrodataSurveyAccessible(tenant: string | undefined, surveyId: string): boolean {
  const owner = PRIVATE_MICRODATA_SURVEYS[surveyId];
  if (!owner) return true;
  return tenant === owner;
}
