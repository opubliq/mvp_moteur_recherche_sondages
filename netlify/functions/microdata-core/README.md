# microdata-core — cœur portable DuckDB (distributions & crosstabs)

Découpage volontaire **cœur portable / adaptateur jetable** (bead v33.4 ; le proto
migrera hors Netlify vers Azure, bead b1d).

## Cœur portable (`microdata-core/`) — host-agnostique
- `core.ts` — `handleMicrodataQuery(params, config) -> JSON`. Init DuckDB + httpfs
  (singleton, amortit le cold start), whitelist des identifiants contre le schéma
  RÉEL du Parquet, construction/validation/exécution SQL, formatage.
- `sas.ts` — génération d'un Account SAS lecture seule courte durée (crypto pure).

Aucune référence à `Handler`/`event`/`context` Netlify, aucun `process.env` : la
config (`AZURE_STORAGE_*`) est **injectée** par l'appelant. Contrat implémenté :
`docs/DECISION_microdata_parquet.md §6`.

## Adaptateur (`../microdata.ts`) — jetable
Parse HTTP, lit les secrets d'env, appelle le cœur, sérialise. **Seule** couche liée
à Netlify.

## Migration Azure (plus tard)
Réécrire uniquement l'adaptateur : un `HttpTrigger` Azure Functions (ou un handler
Express dans un Container App) qui parse la requête, lit les mêmes variables
d'environnement et appelle `handleMicrodataQuery`. `microdata-core/` ne change pas.
Sur Azure natif, on pourra remplacer l'Account SAS par une Managed Identity
(injectée dans `config`) sans toucher au reste.

## Sécurité
Le Parquet n'est jamais exposé au client : la Function relaie, la clé de compte
reste serveur, et l'URL Blob signée (SAS ~10 min) n'est utilisée qu'en interne par
DuckDB. Les noms de colonne (`target`/`dim`/`filters[].var`) sont whitelistés contre
le schéma Parquet avant interpolation (DuckDB ne paramètre pas les identifiants) ;
les **valeurs** de filtre passent par des paramètres liés.
