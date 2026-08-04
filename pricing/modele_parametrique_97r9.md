# Modèle paramétrique de coût marginal + profils clients (bead 97r.9)

Livrable final de l'epic 97r. Assemble les coûts unitaires mesurés
(`cout_mesure_2026-08-01.md`, bead 97r.8) et les limites de capacité relevées
(`variables_cout_marginal.md`, bead 97r.7) en un modèle qui **anticipe** le
coût marginal d'un client plutôt que de le mesurer après coup.

## 1. Le modèle

```
coût_client/mois ≈ n_recherches × coût_search
                  + n_requêtes_agent × coût_agent      ← distribution (médiane/p90), pas un scalaire
                  + n_items_annotés × coût_item
                  + part_fixe_AI_Search                ← ≈ 0 marginal sous la limite du tier, saut discret au-delà
```

Coûts unitaires (CAD, mesurés bead 97r.8, price card 97r.6) :

| Composant | Médiane | p90 | Rapport p90/médiane |
|---|---:|---:|---:|
| `coût_search` (decompose+embed+rerank) | 0,008250 | 0,008656 | ×1,0 |
| `coût_agent` (tous tours + `/search` internes) | 0,008883 | 0,026100 | ×2,9 |
| `coût_item` (annotation) | 0,000035 | 0,000035 | ×1,0 (n=2 batchs, faible échantillon) |

**Pourquoi médiane + p90 et pas une moyenne** : le coût d'une requête agent
est dominé par le nombre de tours (médiane 2, p90 3) et de `/search` enchaînés
— une moyenne écraserait exactement la variance qui compte pour dimensionner.
Le coût par `/search` direct, lui, est quasi déterministe (rapport ×1,0).

**Hors modèle** : ingestion (one-shot, Claude Max = forfait plat), AI Search
Basic (104,68 CAD/mois, coût fixe par palier — voir §3, pas à diviser par le
nombre de requêtes).

Script de calcul : `simulate_profile.py` (mêmes constantes, dupliquées
volontairement pour que le script tourne seul — source de vérité =
`cout_mesure_2026-08-01.md`).

## 2. Profils clients synthétiques

Quatre profils couvrant l'éventail d'usage anticipé. Volumes fictifs
(mois de 22 jours ouvrables), chiffrés avec la formule ci-dessus.

```bash
uv run pricing_app/simulate_profile.py --profile leger
uv run pricing_app/simulate_profile.py --profile analyste
uv run pricing_app/simulate_profile.py --profile annotation_lourd
uv run pricing_app/simulate_profile.py --profile equilibre
```

| Profil | Recherches/mois | Requêtes agent/mois | Items annotés/mois | **Médiane** | **p90** |
|---|---:|---:|---:|---:|---:|
| **Léger** — surtout recherche directe | 500 | 20 | 0 | **4,30 CAD** | **4,85 CAD** |
| **Analyste** — agent-intensif | 100 | 300 | 200 | **3,50 CAD** | **8,70 CAD** |
| **Annotation-lourd** | 50 | 20 | 5 000 | **0,77 CAD** | **1,13 CAD** |
| **Équilibré** | 300 | 100 | 1 000 | **3,40 CAD** | **5,24 CAD** |

**Lecture** : le profil *analyste* a le coût médian le plus bas des quatre
mais le p90 le plus élevé (×2,5 la médiane) — c'est l'agent qui pilote la
variance, pas le volume brut. L'annotation, malgré 5 000 items/mois, reste
marginale (0,000035 CAD/item) : c'est le poste le moins cher à l'unité de
toute la plateforme. Le profil *léger* a le coût absolu le plus élevé des
quatre simplement par volume de recherches (500/mois) — rappel que « léger »
qualifie le *type* d'usage (peu de tours d'agent), pas nécessairement le
volume.

Ces montants sont **par client, par mois, hors part fixe AI Search** — à
comparer à un prix de vente, pas à un coût total (voir §3 pour le fixe).

## 3. Seuils de capacité — sauts de palier

Deux contraintes discrètes, indépendantes du modèle de coût ci-dessus :
au-delà, ce n'est plus un $/client qui augmente mais un saut (tier supérieur,
service additionnel).

### 3.a AI Search Basic — 15 index

Modèle cible : 1 index par client (`variables_cout_marginal.md` §multi-tenant
— **pas encore en place aujourd'hui**, l'app sert un seul index partagé
`survey-questions`). Sous ce modèle cible, le tier Basic actuel
(`opubliq-sondages-search`, 1 partition) plafonne à **15 index = 15 clients**,
quel que soit leur profil — le storage (15 GB) n'est pas le facteur limitant
à ce volume. Au 16ᵉ client : upgrade de tier ou 2ᵉ service AI Search.

### 3.b TPM `gpt-5.4-mini` (decompose + boucle agent) — 200K TPM, 200 req/min

C'est le déploiement le plus serré des deux chats, et **partagé avec un autre
projet** sur `info-4552-resource` (eastus2) — la marge réelle disponible est
donc plus basse que les 200 req/min bruts. Approximation (usage concentré sur
176 h ouvrables/mois = 10 560 min/mois, requêtes gpt-5.4-mini = 1 par
recherche directe [`/decompose`] + 2 par requête agent [tours médians]) :

| Profil | Requêtes gpt-5.4-mini/mois | req/min moyen | Clients avant saturation (200 req/min, moyenne) |
|---|---:|---:|---:|
| Léger | 540 | 0,051 | ≈ 3 900 |
| Analyste | 700 | 0,066 | ≈ 3 000 |
| Annotation-lourd | 90 | 0,009 | ≈ 23 500 |
| Équilibré | 500 | 0,047 | ≈ 4 200 |

**Conclusion** : à volume comparable, le palier AI Search (15 clients) sature
des ordres de grandeur avant le TPM (des milliers de clients) — c'est donc
**le nombre d'index qui borne la croissance**, pas le quota de tokens. Deux
réserves : (1) ce calcul est une **moyenne**, pas un pic — un burst de
plusieurs clients *analyste* simultanés en heure de pointe peut déclencher des
429 bien avant le seuil moyen ; (2) le partage de `info-4552-resource` avec un
autre projet réduit la marge réelle d'un montant non mesuré ici. Le
rate-limit logique par `client_id` + retry/backoff sur 429 (déjà identifié
dans `variables_cout_marginal.md`) reste la protection à mettre en place
avant d'approcher ces volumes, plutôt que de se fier au seuil moyen.

## 4. Limites de ce modèle

- Profils **synthétiques** — aucune donnée d'usage réelle de client payant à
  ce jour ; à recalibrer dès les premiers clients réels.
- `coût_item` mesuré sur **n=2 batchs seulement** — écart-type non
  significatif, à raffiner dès qu'un vrai volume d'annotation tourne.
- Le calcul de saturation TPM (§3.b) suppose une charge **lissée** sur les
  heures ouvrables ; ne capture pas les pics.
- Price card datée du 2026-07-28 — les prix Azure bougent, refaire le relevé
  (`price_card_canadaeast_2026-07-28.md`) avant toute décision de tarification.
- Coût fixe AI Search Basic (104,68 CAD/mois) non réparti entre profils ici :
  à amortir séparément selon le nombre de clients réels sur le service.
