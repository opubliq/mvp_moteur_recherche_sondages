# Benchmark modèle de l'agent — 2026-10-16 (bead 9ou.3)

Script : `eval/_agent_model_bench.ts` (vraie boucle `runAgentStream`, vrais outils : AI Search + Cohere + micro-données DuckDB ; seul le `ChatFn` change). Sorties brutes : `eval/reports/agent_bench/<modèle>__<cas>.json`.
Réglages : `reasoning_effort=low`, 4000 tokens de sortie max, 8 itérations max, deadline 120 s (la prod est à 40 s). 1 run par cas, donc un échantillon petit.
Dépense totale : environ 3,4 USD.

## Recommandation

1. **gpt-5-mini (prod) ne suffit pas pour le chantier 1.** Sur les cas difficiles, il pose encore des questions (andrew), compare seulement les jeunes au lieu des jeunes vs plus vieux (born1995) et publie sans le remarquer un chiffre aberrant tiré d'une variable mal codée (multistep). Il reste toutefois bon et très bon marché (~0,02 $/requête) sur les cas simples.
2. **gpt-5.5 et gpt-5.6-sol sont nettement meilleurs** : profils comparatifs complets et sourcés, détection du codage incohérent de `q3`, honnêteté sur la comparabilité entre sondages. Ils coûtent environ 10 à 20× plus cher (0,10 à 0,97 $/requête analytique). gpt-5.4-mini n'apporte pas de gain clair sur gpt-5-mini pour 2× le prix (une réponse sans chiffres, une province mal lue).
3. **Proposition :** utiliser **gpt-5.5** pour les requêtes d'analyse (à confirmer sur un 2e passage avec plus de cas) et garder gpt-5-mini pour la recherche simple et la clarification. Il faut aussi réduire le levier de coût commun : `get_survey` sans `variables` sur ces_2025 (1440 variables) fait gonfler l'input à 100–400k tokens par requête, quel que soit le modèle.

## Inventaire des déploiements (relevé `az ... deployment list`, lecture seule)

| Déploiement | Ressource | Appelable | Prix USD / 1M (in / cached / out) | Source du prix |
|---|---|---|---|---|
| gpt-5-mini (**prod agent**, `AOAI_CHAT_DEPLOYMENT`) | opubliq-sondages-aoai (canadaeast) | oui, chat/completions | 0,25 / 0,025 / 2,00 | price_card |
| gpt-5.4-mini (`FOUNDRY_CHAT_DEPLOYMENT`, /decompose) | info-4552-resource (eastus2) | oui, `/models/chat/completions` | 0,75 / 0,075 / 4,50 | price_card |
| gpt-5.5 | info-4552-resource | oui, chat/completions | 5 / 0,5 / 30 | Azure Retail Prices API (Gl, short ctx) |
| gpt-5.6-sol | info-4552-resource | oui, **mais seulement via `/openai/v1/responses`** : chat/completions refuse tools + reasoning_effort | 4 / 0,4 / 20 | Azure Retail Prices API (Std Gl, short ctx) |
| Mistral-Large-3 | info-4552-resource | oui (`max_tokens`, pas de reasoning) | 0,5 / — / 1,5 | Azure Retail Prices API (glbl) |
| claude-sonnet-5, claude-opus-5-5, claude-sonnet-4-6, claude-haiku-4-5 | info-4552-resource | **non** : `provisioningState=Failed` (créés le 2026-09-25) | inconnu (absent du repo et de l'API Retail) | **candidat, à redéployer** |
| gpt-5.4-nano, gpt-5.1-codex-mini, Llama-3.3-70B ft | info-4552-resource | non testés (hors cible) | — | — |

Note : `pricing/price_card_canadaeast_2026-07-28.md` indique que la boucle agent tourne sur gpt-5.4-mini. Le code (`src/logic/agent.ts`, `makeAoaiChat`) utilise pourtant `AOAI_CHAT_DEPLOYMENT=gpt-5-mini`. Le coût agent du modèle de pricing est donc surestimé d'environ 3×.

## Cas (8)

`born1995` (vraie demande de aiagent_painpoints.md), `born1995_go` (même demande + clarification + « go lance le scan, pus de questions »), `andrew_souv` (% pondéré d'appui à la souveraineté, 18-34 ans, par année), `multistep` (EEQ 2018, francophones, vote × âge), `english` (CES 2021 carbon tax × province), `laicite_sexe`, `search_only` (troisième lien), `mean_scol` (CES 2025 satisfaction démocratie × scolarité).

## Résultats agrégés

| Modèle | Cas réussis* | Outil au 1er tour | Appels d'outils moy. | Erreurs d'outils | Latence moy. (max) | Tokens in moy. (% cache) | Coût moy./req. | Score qualité** |
|---|---|---|---|---|---|---|---|---|
| gpt-5-mini | 8/8 | 8/8 | 6,6 | 2 | 32 s (44) | 113k (55 %) | **0,019 $** | 10/16 |
| gpt-5.4-mini | 7/8 (1× HTTP 500) | 7/7 | 9,1 | 0 | 29 s (53) | 132k (71 %) | 0,044 $ | 11/16 |
| Mistral-Large-3 | 6/8 (500 + réseau) | 6/6 | 9,0 | 2 | 55 s (190) | 85k (0 %) | 0,044 $ | 3/16 |
| gpt-5.5 | 4/4 (sous-ensemble) | 4/4 | 9,8 | 0 | 53 s (67) | 117k (75 %) | 0,256 $ | 7/8 |
| gpt-5.6-sol | 4/4 lancés (+1 erreur réseau, 3 non lancés : budget) | 4/4 | 14,5 | 0 | 40 s (56) | 213k (64 %) | 0,397 $ | 8/8 |

\* Cas terminés sans erreur fatale de l'API.
\*\* Jugement manuel par cas : 2 = réponse correcte, chiffrée et ancrée dans les sorties d'outils ; 1 = partielle ; 0 = fausse, sans chiffres, question à la place d'un résultat, ou échec.

Le comportement « agir d'abord » (correctif 9ou.1) tient pour tous les modèles : aucun n'a posé de question au 1er tour, y compris après un « go ».

### Par cas (appels d'outils · latence · coût · score)

| Cas | gpt-5-mini | gpt-5.4-mini | Mistral-L3 | gpt-5.5 | gpt-5.6-sol |
|---|---|---|---|---|---|
| born1995 | 8 · 43 s · 0,040 $ · **1** (jeunes seuls, finit par une question) | 12 · 34 s · 0,082 $ · **0** (aucun chiffre ; compare aux « plus vieux » sans les avoir calculés) | fatal | 20 · 55 s · 0,44 $ · **2** | 25 · 56 s · 0,97 $ · **2** |
| born1995_go | 13 · 44 s · 0,029 $ · **1** (comparaison incomplète, 1 erreur) | 14 · 53 s · 0,059 $ · **2** | 13 · 44 s · 0,057 $ · **0** (répond en anglais, max_iter) | — | fatal (réseau) |
| andrew_souv | 4 · 29 s · 0,014 $ · **0** (s'arrête sur une question) | 22 · 35 s · 0,064 $ · **2** (5 années ; proxy 2018 signalé) | 18 · 31 s · 0,073 $ · **1** | 5 · 27 s · 0,095 $ · **1** (un seul sondage ; honnête) | 24 · 54 s · 0,46 $ · **2** (4 années ; libellés différents signalés) |
| multistep | 12 · 37 s · 0,010 $ · **0** (PLQ 67 % chez les Z, aberrant, non détecté) | fatal (500) | 8 · 18 s · 0,035 $ · **0** (abandonne le filtre langue) | 9 · 67 s · 0,24 $ · **2** (bascule sur q6) | 8 · 39 s · 0,14 $ · **2** (signale explicitement que q3 est incohérent) |
| english | 5 · 35 s · 0,021 $ · **2** | 5 · 26 s · 0,038 $ · **1** (Québec/Sask. mal lus, la ligne ne fait pas 100 %) | 8 · 39 s · 0,077 $ · **1** | 5 · 65 s · 0,25 $ · **2** | non lancé |
| laicite_sexe | 5 · 22 s · 0,010 $ · **2** | 5 · 16 s · 0,021 $ · **2** | fatal (500) | — | non lancé |
| search_only | 1 · 11 s · 0,002 $ · **2** | 1 · 16 s · 0,005 $ · **2** | 1 · 11 s · 0,005 $ · **1** (proxys présentés comme pertinents) | — | 1 · 10 s · 0,024 $ · **2** |
| mean_scol | 5 · 34 s · 0,025 $ · **2** | 5 · 25 s · 0,041 $ · **2** | 6 · 190 s · 0,018 $ · **0** (deadline) | — | non lancé |

## Constats annexes

- **Données :** dans `eeq_2018`, la variable `q3` (intention de vote) a un codage incohérent dans les micro-données. gpt-5-mini en a tiré « PLQ 67 % chez la génération Z francophone ». gpt-5.5 et gpt-5.6-sol l'ont contourné via `q6`. Ce point mérite un bead d'ingestion.
- **Coût :** ce sont les tokens d'entrée (system prompt + index `get_survey` complet repayés à chaque tour) qui dominent le coût, pas la sortie. Plafonner ou paginer l'index `get_survey` réduirait le coût de tous les modèles.
- Brancher gpt-5.6-sol en prod exigerait un adaptateur Responses API (le script en contient un : `makeResponsesChat`). gpt-5.5 fonctionne tel quel avec `makeAoaiChat`, à condition de changer l'endpoint et la clé vers la ressource Foundry.
- Instabilité de Foundry pendant le run : 2× HTTP 500 et 2× « fetch failed », plus des 429 sur gpt-5.5 (capacité 100).
