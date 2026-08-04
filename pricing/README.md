# Pricing Opubliq (local)

```bash
uv run --with streamlit streamlit run pricing_app/app.py
```

## Coût marginal (epic 97r)

| Fichier | Rôle |
|---|---|
| `variables_cout_marginal.md` | Ce qu'on mesure et pourquoi |
| `price_card_canadaeast_2026-07-28.md` | Combien coûte chaque SKU (CAD, daté) |
| `run_instrumented.py` | Provoque la charge → fait émettre les `[costlog]` |
| `aggregate_costlog.py` | Parse les logs → coût médian/p90 par type d'usage |
| `modele_parametrique_97r9.md` | Modèle paramétrique + 4 profils clients synthétiques + seuils de capacité (livrable 97r.9) |
| `simulate_profile.py` | Chiffre un profil client (prédéfini ou custom) → coût marginal médian/p90 |

### Protocole de mesure (bead 97r.8)

Les lignes `[costlog]` sortent sur le **stdout du serveur**, pas dans la réponse
HTTP — il faut donc capturer la sortie du serveur pendant que la charge tourne.

```bash
# terminal 1 — serveur, sortie capturée
netlify dev 2>&1 | tee runs.log

# terminal 2 — charge (20 recherches + 20 requêtes agent + 1 batch d'annotation)
uv run pricing_app/run_instrumented.py --base http://localhost:8888

# agrégation
uv run pricing_app/aggregate_costlog.py runs.log -o pricing_app/cout_mesure_$(date +%F).md
```

Options utiles : `--only agent` (un seul type), `--limit 5` (essai rapide),
`--auth "Basic …"` si le Basic Auth global est actif, `--pause 2` pour espacer
les requêtes et éviter les 429 (TPM).

Chaque type part avec un `x-client-id` distinct (`run-search`, `run-agent`,
`run-annotate`) — filtrable à l'agrégation avec `--client`.

**Limite connue** : `/decompose` et `/search` sont deux appels HTTP séparés,
chacun avec son propre `request_id` (aucun identifiant partagé, cf.
`src/api.ts`). `aggregate_costlog.py` les recolle par ordre chronologique au
sein d'un même `client_id` (`merge_search_pairs`) — fiable pour du trafic
séquentiel comme ce protocole, pas garanti sous trafic concurrent réel. Un
vrai correctif demanderait de propager un `request_id` du frontend entre les
deux appels.
