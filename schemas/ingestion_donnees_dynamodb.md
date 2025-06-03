# Schéma abstrait du pipeline d’ingestion de sondages vers DynamoDB

## 1. Dépôt des fichiers bruts
- Un utilisateur dépose dans un bucket S3 :
  - Les données brutes du sondage (CSV, SAV, ou JSON)
  - Le codebook associé (CSV ou PDF)
  - (Optionnel) Un script de nettoyage spécifique (Python ou R)
- Chaque groupe de fichiers est organisé par un identifiant unique de sondage (`survey_id`)
- Les fichiers sont stockés dans un "lac de données" S3, structurés par sondage

## 2. Structuration automatique des données
- Une première fonction Lambda est déclenchée à chaque ajout de données brutes dans S3
- Cette Lambda :
  - Identifie le format du fichier (CSV, SAV, JSON)
  - Structure et convertit les données dans un format tabulaire standardisé (ex : Parquet)
  - Dépose le fichier structuré dans un autre bucket S3 dédié aux données prêtes à nettoyer

## 3. Nettoyage et transformation
- Une seconde Lambda est déclenchée à chaque ajout de fichier structuré
- Cette Lambda :
  - Télécharge et applique, si présent, le script de nettoyage spécifique au sondage
  - Transforme les données selon la logique définie (nettoyage, harmonisation, recodage, etc.)
  - Prépare les données finales pour l’insertion dans DynamoDB

## 4. Insertion dans DynamoDB
- La Lambda de nettoyage écrit les données nettoyées dans les tables DynamoDB appropriées :
  - Table des métadonnées de sondage
  - Table des variables et codebooks
  - Table des réponses individuelles

## 5. Organisation des scripts de nettoyage
- Les scripts de nettoyage sont stockés dans un dossier S3 ou dans un répertoire spécifique du dépôt de code
- Chaque script est associé à un sondage via le `survey_id`
- La Lambda de nettoyage charge dynamiquement le script approprié lors du traitement

## 6. Points de liaison avec le reste du projet
- L’API (FastAPI) interroge DynamoDB pour servir les données nettoyées à l’UI (React)
- L’UI n’a jamais accès directement à S3 ou DynamoDB

---

**Résumé** :  
Ce pipeline permet d’automatiser la structuration, le nettoyage et l’ingestion de nouveaux sondages dans DynamoDB, tout en restant flexible pour intégrer des scripts de nettoyage personnalisés pour chaque jeu de données.
