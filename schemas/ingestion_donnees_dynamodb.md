# Schéma abstrait du pipeline d’ingestion de sondages vers DynamoDB

Les étapes générales d’ingestion, de structuration et de nettoyage des fichiers de sondages sont désormais centralisées et automatisées dans le dépôt [opubliq/pipeline_sondages]. Ce dépôt gère :
- Le dépôt des fichiers bruts et codebooks dans S3
- La structuration automatique des données (détection de format, conversion, harmonisation)
- L’application dynamique de scripts de nettoyage spécifiques à chaque sondage

Pour plus de détails sur ces étapes, se référer à la documentation du repo [opubliq/pipeline_sondages].

---

## Spécificités du présent projet : Ingestion dans DynamoDB et exposition via API

### 1. Insertion dans DynamoDB
- Les données nettoyées produites par le pipeline d’ingestion sont écrites dans les tables DynamoDB spécifiques à l’application :
  - Table des métadonnées de sondage
  - Table des variables et codebooks
  - Table des réponses individuelles

### 2. Points de liaison avec le reste du projet
- L’API (FastAPI) interroge DynamoDB pour servir les données nettoyées à l’UI (React)
- L’UI n’a jamais accès directement à S3 ou DynamoDB : toute la logique d’accès passe par l’API sécurisée

---

**Résumé** :  
Ce dépôt se concentre sur la gestion, l’organisation et l’exposition des données de sondages nettoyées dans DynamoDB, ainsi que sur leur mise à disposition via une API pour les applications clientes.  
L’ensemble des étapes générales d’ingestion et de nettoyage est géré par [opubliq/pipeline_sondages], assurant ainsi une architecture modulaire, réutilisable et maintenable.
