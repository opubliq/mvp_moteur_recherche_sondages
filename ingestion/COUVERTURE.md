# Recensement de couverture — sondages `data/`

Inventaire des **57 sondages** de `data/` (hors `_archives` et `.Trash-1000`)
avec, pour chacun, les artefacts présents et un **verdict d'ingérabilité
honnête** (cf. `ingestion/CONVENTIONS.md` : on n'invente jamais de wording).

Méthode : inspection des noms de fichiers + échantillonnage des en-têtes/feuilles
XLSX (pas de lecture exhaustive). Les cas marqués « présumé » suivent le motif
d'un sondage de la même famille effectivement échantillonné.

## Verdicts

- **A — Ingérable (wording structuré)** : le wording de question vient
  directement d'un artefact structuré (var labels SAV/DTA, colonne `Label`/
  `Etiquette` d'un dico XLSX, feuille `Index`/`Doc` ou en-têtes étiquetés). Voie
  la plus sûre.
- **B — Ingérable via codebook externe** : le wording n'existe que dans un
  document à parser (PDF / DOCX / PPTX). Ingérable, mais **vigilance** :
  l'appariement variable ↔ wording doit être rigoureux pour ne pas fabriquer.
- **C — Nécessite le questionnaire** : le raw n'est qu'une **liste de codes**
  (variable → code → label de réponse) **sans aucun wording de question**.
  **NE PAS écrire d'extracteur** tant que le questionnaire n'est pas fourni.

## Synthèse

| Verdict | Nombre |
|---|---|
| Ingérable (A + B) | **55** |
| dont A — wording structuré | 39 |
| dont B — via codebook externe | 16 |
| **C — nécessite le questionnaire** | **2** |
| **Total** | **57** |

**Réponse à la question du recensement** : sur 57 sondages, **2** n'ont qu'une
liste de codes sans wording de question et sont donc **non ingérables
honnêtement tels quels** (`elxnqc_particip_egp_2018`, `elxnqc_satis_2018`).

## C — Nécessitent le questionnaire (NE PAS ingérer tel quel)

| Sondage | Artefacts | Constat |
|---|---|---|
| `elxnqc_particip_egp_2018` | `données.csv`, `codes.xlsx` | `codes.xlsx` ne contient QUE des paires code→étiquette de réponse (`Valeur` / `Etiquette`) ; aucun wording de question. CSV = en-têtes = noms de variables. **C'est le sondage dont un agent avait INVENTÉ les `question_text` (pilote u5o.4) → rejeté.** |
| `elxnqc_satis_2018` | `données.xlsx`, `codes.xlsx` | Même motif : `codes.xlsx` = `Valeur`/`Etiquette` (libellés de réponse seulement), `données.xlsx` = en-têtes = noms de variables. Aucun wording de question dans le dossier. |

## B — Ingérables via codebook externe (PDF / DOCX / PPTX)

| Sondage | Artefacts | Source du wording |
|---|---|---|
| `elxnqc_vote_internet_web_2019` | `données.xlsx`, `(questionnaire).pptx`, `ligne_VERBweb.xlsx` | questionnaire PPTX |
| `enquete_can_nature_2012` | `cns2012pumf_original.xlsx`, `..._REFERENCE.pdf` | PDF de référence (README XLSX vide en tête) |
| `govcan_por003_q1_2023` | `*.csv`, `*-variable-information-*.docx` | DOCX « variable information » |
| `govcan_por003_q1_2024` | csv, docx | DOCX (présumé) |
| `govcan_por003_q2_2023` | csv, docx | DOCX (présumé) |
| `govcan_por003_q2_2024` | csv, docx | DOCX (présumé) |
| `govcan_por003_q3_2022` | csv, docx | DOCX (présumé) |
| `govcan_por003_q3_2023` | csv, docx | DOCX (présumé) |
| `govcan_por003_q3_2024` | csv, docx | DOCX (présumé) |
| `govcan_por003_q4_2022` | csv, docx | DOCX (présumé) |
| `govcan_por003_q4_2023` | csv, docx | DOCX (présumé) |
| `mamh_connaissance_affaires_municipales_2023` | `*.pdf`, `*.xlsx` (tableaux croisés) | PDF questionnaire |
| `mamh_connaissance_affaires_municipales_2024` | pdf, xlsx (croisés) | PDF questionnaire |
| `mamh_milieu_vie_citoyens` | `citoyens.pdf`, `*.xlsx` (tableaux croisés) | PDF questionnaire |
| `satis_municipalites_2016` | `*questionnaire*.pdf`, `*.csv` | PDF questionnaire |
| `services_collectif_quebec-city_2019` | `*questionnaire*.pdf`, `*.csv` | PDF questionnaire |

## A — Ingérables (wording structuré)

SAV (var labels + value labels) :

`cecd_charte_2013_09`, `cecd_charte_2013_10` ✅, `cecd_charte_2013_11`,
`cecd_charte_2013_12`, `cecd_charte_2014_01`, `cecd_charte_2014_02`,
`cecd_elxn_can_2008`, `cecd_elxn_can_2011`, `cecd_elxn_qc_1998` ✅,
`cecd_elxn_qc_2007`, `cecd_elxn_qc_2008`, `cecd_elxn_qc_2012`,
`cecd_elxn_qc_2018`, `cecd_sante_can_usa`, `cecd_vote_qc_2007_2010`,
`eeq_2007`, `eeq_2008`, `eeq_2012`, `eeq_2014` ✅, `focus_canada_2010`,
`focus_canada_2011`, `focus_canada_2012`, `provincial_qc_2018`.

DTA Stata (var labels + value labels) :

`eeq_2018`, `eeq_2022`, `municipal_canada_elxn_2020`, `provincial_qc_2012`.

Dictionnaire / feuille XLSX étiquetée (colonne `Label`/`Etiquette`, feuille
`Index`/`Doc`, ou en-têtes « avec étiquettes ») :

| Sondage | Source du wording |
|---|---|
| `elxnqc_particip_egm_2021` | feuille `Index` (`age → AGE. À quelle catégorie d'âge…`) |
| `elxnqc_satis_2022` | en-têtes de la feuille « Avec étiquettes » (`Q1_3) Dans toute élection…`) |
| `elxnqc_vote_internet_tel_2019` | feuille `Doc` (`VARIABLE` / `DESCRIPTION DU FICHIER`) |
| `govcan_06822_wave1_2024` | dico XLSX, colonne `Label` (`In what year were you born?`) |
| `govcan_06822_wave2_2024` | dico XLSX (présumé, même famille) |
| `govcan_06822_wave3_2024` | dico XLSX (présumé) |
| `govcan_06822_wave4_2024` | dico XLSX (présumé) |
| `govcan_2022` | dico XLSX, colonne `Label` |
| `govcan_2023` | dico XLSX (présumé) |
| `govcan_2025` | dico XLSX (présumé) |
| `govcan_habit_2024` | dico XLSX, colonne `Label` (exclure les vars `<none>`) |
| `govcan_parca_2024` | dico XLSX |

✅ = extracteur déjà écrit et normalisé.

## Note de vigilance

Pour les familles « présumé » (`govcan_por003_*`, `govcan_06822_wave2-4`,
`govcan_2023/2025`), confirmer à l'écriture de l'extracteur que la source de
wording est bien présente et complète. En cas de variable sans libellé :
l'**exclure** (la documenter), jamais inventer (cf. CONVENTIONS §2).
