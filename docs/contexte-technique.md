# Contexte technique — point de départ pour le design

But de ce doc : donner à n'importe quel agent (ou humain) la reconnaissance technique
faite avant le design, pour qu'on puisse **réfléchir à l'architecture sans tout
re-explorer**. Le *pourquoi* du produit est dans [`../mega_refactor.md`](../mega_refactor.md) ;
ici on couvre le *comment* connu à ce jour.

## Frontière des repos (important)

- **Ce repo** = le **moteur de recherche + l'UI de démo**. C'est le consommateur.
- **`opubliq/pipeline_sondages`** (repo séparé) = **ingestion / nettoyage / structuration**
  des fichiers bruts → produit les données structurées (codebooks). Ne pas re-planifier
  d'ingestion ici.

⚠️ Tension de provider à trancher : l'ancienne doc était AWS (S3 + DynamoDB) ; la direction
visée maintenant est **Azure AI Search** pour la recherche. Le pipeline d'ingestion reste,
lui, côté AWS. Mélanger les deux est possible mais à confirmer au design.

## Réalité des données (état au 2026-06-22)

Source : symlink `data/` → `/home/hubcad25/opubliq/gdrive/_SharedFolder_data_produit`
(hors repo, ignoré par git).

- **58 dossiers de sondages**, un par sondage/vague. Nommage `prefixe_annee` (ex.
  `eeq_2022`, `cecd_charte_2013_10`, `govcan_por003_q1_2024`).
- **Formats fragmentés** : PDF (codebooks « Livre de codes »), SAV/SPSS, XLSX (données +
  dictionnaires), CSV (réponses brutes, codes numériques), DOCX (questionnaires), DTA/Stata,
  et quelques `codebook.json` / `codebook.md` générés.
- **⚠️ Seulement 5/58 dossiers ont un `codebook.json` structuré** aujourd'hui. La promesse
  démo « ~55 sondages » dépend donc de `pipeline_sondages` produisant les codebooks
  manquants. À clarifier avant de promettre la couverture.
- **Pas de schéma unifié** : `Q1` veut dire des choses différentes d'un sondage à l'autre ;
  métadonnées éparpillées entre 5+ types de fichiers.
- **Langue** : français-dominant ; sondages fédéraux (govcan) bilingues FR/EN.
- Forme cible d'une « question » : `survey_id`, `variable`, `question_text`,
  options de réponse (valeur→label), + métadonnées (sondeur, année, langue, N, type).
- Exemple réel de `codebook.json` (eeq_2007) :
  ```json
  { "survey_id": "eeq_2007",
    "variables": { "q1": {
      "question": "POUR VOUS PERSONNELLEMENT, quel était l'enjeu le plus important...",
      "type": "categorical",
      "values": { "01": "La santé...", "02": "Changer de gouvernement" },
      "missing": ["98","99"] } } }
  ```

## Ancien MVP — réutilisable (sur la branche `archive/old-mvp`)

`main` est une table rase ; tout l'ancien code vit sur `origin/archive/old-mvp`. À piger
avant de réinventer :
- **Backend** : FastAPI, endpoints `/embed`, `/search`, `/viz`. Recherche sémantique via
  `sentence-transformers` (all-MiniLM-L6-v2) + cosine similarity **en mémoire**. SQLite
  (`surveys_bd.sqlite`), **2 sondages hardcodés seulement** (TIDES 2022, Democracy Checkup 2022).
- **UI** : React 19 (Vite) + Tailwind + DaisyUI + Recharts. Shell de démo réutilisable.
- **Schéma** : `schemas/bd_sqlite.sql` (surveys_metadata, codebook_variables,
  codebook_values, tables par sondage) — point de départ pour modéliser le catalogue.
- Déploiement ancien : API sur DigitalOcean (Docker), UI sur Netlify.

## Décisions déjà prises

- **Table rase** de `main` (fait, commit `méga ménage`). Ancien code sur `archive/old-mvp`.
- **Direction recherche visée : Azure AI Search** (hybride mots-clés + vecteurs). Aucun
  compte Azure n'existe encore — table rase côté infra.
- Portée : c'est un **proto démo** (wow en 30 s), pas de la prod.

## Questions ouvertes pour le design (à faire ensemble)

1. Source des données du catalogue : attendre que `pipeline_sondages` structure les 58, ou
   bootstrapper la démo avec les 5 `codebook.json` existants ?
2. Schéma du catalogue de questions (champs, granularité, gestion bilingue FR/EN).
3. Azure AI Search : index unique ? champs vectoriels + mots-clés ? quel modèle d'embedding
   (multilingue, vu le français) ? coût/setup vs alternative locale pour le proto.
4. Quoi réutiliser de `archive/old-mvp` (shell UI ? endpoints ?) vs repartir de zéro.
5. Frontière exacte avec `pipeline_sondages` (qui écrit dans l'index Azure ?).

## Outillage local

Suivi d'enjeux **Beads** (`.beads/`, `AGENTS.md`) présent localement mais **non versionné**
(ignoré dans `.gitignore`). Un hook pre-push `bd sync` peut bloquer les pushes ;
contourner avec `git push --no-verify` si non pertinent.
