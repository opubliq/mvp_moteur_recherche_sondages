# Runbook — ingérer un nouveau sondage (orchestrateur)

**Point d'entrée unique** pour une nouvelle session qui veut ajouter des sondages
à l'index de recherche. Donne ce fichier à l'orchestrateur :

> « Lis `docs/INGESTION_RUNBOOK.md` et ingère le(s) prochain(s) sondage(s). »

L'orchestrateur (toi) ne code PAS l'extracteur ni l'enrichissement à la main : il
**lance des subagents** (un par sondage, par étape) avec les briefs dédiés, puis
**valide leur travail** et **ingère**. C'est le rôle de l'orchestrateur d'être le
garde-fou humain : ne jamais faire confiance aveuglément à un subagent.

## Environnement Python (venv uv)

Le repo a un venv géré par **uv** à `.venv/` (Python 3.13, deps de `pyproject.toml`).
Il n'y a **pas de `python` global** : toutes les commandes ci-dessous passent par
`uv run …` (qui utilise le venv automatiquement). Sinon, active-le d'abord :
`source .venv/bin/activate`. **Rappelle-le aux subagents** dans leur brief : ils
doivent utiliser `uv run` (ou le venv activé), jamais un `python` nu.

## Contexte produit

Moteur de recherche de **questions de sondage** au niveau de la question :
l'utilisateur tape un concept (« confiance envers le gouvernement ») et retrouve les
questions pertinentes à travers plusieurs sondages, même quand le wording change.
Backend : **Azure AI Search** (Basic, compte startup, région canadaeast). Deux
vecteurs par question (`content_vector` question dominant + `survey_vector` contexte
sondage, pondérés à la recherche). Modèle d'embedding : `text-embedding-3-large`
(3072 dims). Clés dans `.env` (gitignored).

## Invariant sacré : ZÉRO fabrication

`question_text` et `label` de réponse viennent **exclusivement du raw**. Jamais
inventés. Voir `ingestion/CONVENTIONS.md`. Le garde-fou `validate.py` rejette
l'ingestion sur un wording dégénéré. Les champs « mous » (`display_label`,
`concepts`, `themes`, `survey_description`, `survey_month`) sont authorés par LLM
mais **figés et versionnés** dans `ingestion/enrichment/<survey_id>.py`, revus par
l'orchestrateur — jamais générés au runtime.

## État actuel (mettre à jour à chaque session)

- **13 sondages ingérés**, ~3043 docs (vérité terrain de l'index Azure) :
  `cecd_charte_2013_10`, `cecd_elxn_can_2011`, `cecd_elxn_qc_1998`,
  `cecd_elxn_qc_2007`, `cecd_elxn_qc_2012`, `cecd_elxn_qc_2018`,
  `cecd_sante_can_usa`, `eeq_2014`, `govcan_06822_wave1_2024`,
  `govcan_06822_wave2_2024`, `govcan_06822_wave3_2024`, `govcan_habit_2024`,
  `govcan_parca_2024`.
- Candidats restants : voir `ingestion/COUVERTURE.md` (55 ingérables classe A/B ;
  NE PAS ingérer les 2 classe C « nécessite questionnaire »).

## Choisir le prochain sondage

1. Lire `ingestion/COUVERTURE.md`. Préférer la **classe A** (wording structuré
   SAV/DTA/dico XLSX) — la plus sûre. La classe B (codebook PDF/DOCX à parser)
   demande plus de vigilance.
2. Vérifier que `data/<survey_id>/` existe et que les libellés sont exploitables :
   ```bash
   uv run python - <<'EOF'
   import pyreadstat
   df, meta = pyreadstat.read_sav("data/<survey_id>/<fichier>.sav")   # ou read_dta
   labels = meta.column_names_to_labels
   rich = sum(1 for v in meta.column_names if (labels.get(v) or "").strip().lower() not in ("", v.lower()))
   print(f"{len(meta.column_names)} vars, {len(df)} répondants, {rich} libellés exploitables")
   for v in list(meta.column_names)[:10]:
       print(" ", v, "|", (labels.get(v) or "")[:70])
   EOF
   ```
   Écarter si labels majoritairement vides / dans une langue inattendue (p.ex.
   `eeq_2012` a des labels anglais) — signaler à l'utilisateur.

## Le workflow (par sondage)

### Étape 1 — Extracteur (subagent Sonnet)

Lancer un subagent avec le brief **`docs/EXTRACTOR_BRIEF.md`** (le lui faire lire),
en précisant : `survey_id`, chemin du fichier raw, `pollster`, `year`, chemins des
codebooks. Il écrit `ingestion/surveys/<survey_id>.py`.

**Puis valider indépendamment** (ne pas croire le rapport du subagent sur parole) :
ruff, `assert_no_fabricated_text`, couverture complète (toute var = question ∪
exclue), et `question_text == label brut SAV` (verbatim strict, sauf sociodémo
canonique). Commande complète dans `EXTRACTOR_BRIEF.md` §Validation. **Commit** si OK.

### Étape 2 — Enrichissement (subagent Haiku)

Lancer un subagent avec le brief **`docs/ENRICHMENT_BRIEF.md`**, en précisant :
`survey_id`, contexte du sondage (élection concernée, chefs, date), chemins des
codebooks (pour le wording complet quand les labels SAV sont tronqués). Il écrit
`ingestion/enrichment/<survey_id>.py` (dicts `SURVEY` + `QUESTIONS` figés).

**Puis valider indépendamment** : merge + garde-fou, `question_text` verbatim intact
(l'enrichissement ne doit toucher AUCUN champ verbatim), et **fidélité** des
`display_label` — surtout ceux qui ajoutent une spécificité (date, sujet, nom) :
vérifier que la spécificité vient bien du `question_text` raw OU du codebook, pas
d'une invention. En cas de doute, remonter à la source (codebook PDF via
`pdftotext <pdf> - | grep -iA5 "<var>"`). **Commit** si OK.

### Étape 3 — Ingestion + vérification

```bash
uv run python -m ingestion.create_index          # additif, idempotent (25 champs)
uv run python -m ingestion.run --only <survey_id> # ingère ce sondage
```
Le doc count affiché juste après peut accuser un **lag de cohérence** Azure (normal).
Vérifier ~3 s plus tard :
```bash
uv run python - <<'EOF'
import time
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from ingestion.config import get_settings
s = get_settings()
c = SearchClient(s.search_endpoint, s.index_name, AzureKeyCredential(s.search_admin_key))
time.sleep(3)
print("total:", c.get_document_count())
print("ce sondage:", c.search(search_text="*", filter="survey_id eq '<survey_id>'",
      top=0, include_total_count=True).get_count())
EOF
```
Attendu : `1 parent + N questions`. Puis lancer 2-3 requêtes sémantiques (voir le
snippet de recherche pondérée dans l'historique / `netlify/functions/search.ts`)
pour confirmer que le sondage remonte en cross-sondage sur ses thèmes.

## Quality gates de fin de session

```bash
uv run ruff check .
uv run pytest -q          # doit rester vert
```
Commits directs sur `main` (l'utilisateur le préfère pour ce proto). Un commit par
unité logique (extracteur, puis enrichissement). Push : voir `AGENTS.md` (le hook
`bd sync` pre-push peut bloquer — `git push --no-verify` si non pertinent).

## Pièges connus

- **Ne PAS `--recreate-index`** pour ajouter un sondage : c'est additif via
  `merge_or_upload`. Recréer n'est utile que si un sondage a laissé des docs
  orphelins (vars supprimées entre deux versions de l'extracteur).
- **Libellés SAV tronqués à 256 car.** : normal, verbatim ; le wording complet vient
  du codebook à l'enrichissement.
- **Sociodémo au libellé dégénéré** (label = nom de var, p.ex. « sexe ») : wording
  canonique via `ingestion/canonical.py`, pas d'exclusion. Cf. `EXTRACTOR_BRIEF.md`.
- **Un subagent peut se tromper** (coquilles, sujet inféré non confirmé) : la
  validation de l'orchestrateur n'est pas optionnelle.
