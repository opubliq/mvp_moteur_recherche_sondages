# Moteur de recherche de questions de sondage

Catalogue de questions de sondage cherchable **au niveau de la question** : retrouver,
à travers des dizaines de sondages, chaque fois qu'un concept a été demandé — même quand
le wording change d'une étude à l'autre. Recherche mots-clés + sémantique. L'objectif
immédiat est une **démo** qui fait comprendre la valeur en 30 secondes à un prospect.

> **État : table rase.** L'ancien MVP a été retiré de `main` (récupérable sur la branche
> `archive/old-mvp`). L'architecture du nouveau moteur — schéma du catalogue, backend de
> recherche (**Azure AI Search** est la direction visée), UI de démo — reste à concevoir.
> Voir [`mega_refactor.md`](mega_refactor.md) pour le contexte complet.

## Données

Les ~58 sondages bruts vivent dans un dossier Google Drive partagé, **hors du repo**, et
sont exposés via un symlink `data/` (ignoré par git). Pour le recréer :

```bash
ln -s /home/hubcad25/opubliq/gdrive/_SharedFolder_data_produit data
```

L'ingestion et le nettoyage des fichiers bruts sont gérés dans un dépôt séparé
(`opubliq/pipeline_sondages`). Ce dépôt-ci se concentre sur la recherche et la démo.
