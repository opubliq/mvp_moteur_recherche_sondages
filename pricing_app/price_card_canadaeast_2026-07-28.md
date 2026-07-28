# Price card — 2026-07-28 (bead 97r.6)

Prix unitaires **datés** de chaque SKU consommé par la plateforme, pour convertir
les lignes `[costlog]` (tokens / search units) en dollars sans avoir à chercher
ailleurs. Consommée par les beads 97r.8 (agrégation) et 97r.9 (modèle paramétrique).

**Devise : CAD** — nos premiers clients facturent en dollars canadiens, donc le
coût marginal se raisonne en CAD de bout en bout, sans conversion mentale. Prix
de liste *retail*, hors remises EA/CSP et hors crédits. Le prix USD est conservé
en colonne secondaire parce que les pages Azure et Cohere publient en USD — mais
**c'est la colonne CAD qui fait foi** dans le modèle de coût.

**Date de relevé : 2026-07-28.** Les prix Azure bougent → refaire ce relevé avant
toute décision de tarification.

**Méthode.** Prix tirés de l'[Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices)
(`https://prices.azure.com/api/retail/prices`) avec `currencyCode=CAD`, pas d'une
conversion maison : c'est le taux qu'Azure applique à la facture. Taux implicite
constaté sur toutes les lignes : **1,42 CAD/USD**. Les SKU de déploiement réels
ont été relevés via `az cognitiveservices account deployment list`. La commande
de reproduction est donnée sous chaque section.

## Ressources réelles (relevé `az`, 2026-07-28)

| Ressource | Région | Déploiement | SKU de déploiement | Capacité |
|---|---|---|---|---|
| `opubliq-sondages-aoai` (OpenAI) | **canadaeast** | `gpt-5-mini` (v2025-08-07) | GlobalStandard | 800 |
| `opubliq-sondages-aoai` | **canadaeast** | `text-embedding-3-large` (v1) | **Standard** (régional) | 120 |
| `info-4552-resource` (AIServices) | **eastus2** | `gpt-5.4-mini` (v2026-03-17) | GlobalStandard | 200 |
| `info-4552-resource` | **eastus2** | `Cohere-rerank-v4.0-pro` (v1) | GlobalStandard | 150 |
| `opubliq-sondages-search` | **canadaeast** | — | `basic`, 1 replica × 1 partition | — |

> **Deux régions, pas une.** Le titre du ticket dit « canadaeast », mais la
> ressource Foundry (`decompose`, agent, rerank) vit en **eastus2**. Sans
> incidence sur le prix : ses trois déploiements sont `GlobalStandard`, et le
> tarif *Glbl* est identique en canadaeast et eastus2 (vérifié par requête sur
> les deux `armRegionName`). Ça compte en revanche pour la latence et pour les
> quotas TPM (bead 97r.7).
>
> **L'embedding est l'exception.** Il est en SKU `Standard` = **déploiement
> régional**, donc facturé au tarif *regional*, **pas** au tarif global. Écart :
> +21 %. Ne pas prendre le prix affiché sur la page pricing générique, qui montre
> le global.

## 1. AOAI chat — `gpt-5-mini` (sert `/annotate`)

`AOAI_CHAT_DEPLOYMENT=gpt-5-mini`, GlobalStandard, ressource canadaeast.

| Ligne | Meter (`skuName`) | **CAD / 1M** | **CAD / 1K** | *(USD / 1M)* |
|---|---|---|---|---|
| Input | `GPT 5 Mini Inpt Glbl` | **0,3550** | 0,000355 | *0,25* |
| Input *cached* | `GPT 5 Mini cchd Inpt Glbl` | **0,0355** | 0,0000355 | *0,025* |
| Output | `GPT 5 Mini outpt Glbl` | **2,8399** | 0,0028399 | *2,00* |

`effectiveStartDate` : 2025-08-01. `productName` : *Azure OpenAI GPT5*.
Ratio output/input = **8×** — ne jamais additionner prompt+completion tokens.

```bash
curl -s -G "https://prices.azure.com/api/retail/prices" \
  --data-urlencode "currencyCode=CAD" \
  --data-urlencode "\$filter=serviceName eq 'Foundry Models' and armRegionName eq 'canadaeast'" \
  --data-urlencode "\$top=1000" | jq '.Items[] | select(.skuName | startswith("GPT 5 Mini"))'
```

## 2. Foundry chat — `gpt-5.4-mini` (sert `/decompose` + la boucle agent)

`FOUNDRY_CHAT_DEPLOYMENT=gpt-5.4-mini`, version **2026-03-17**, GlobalStandard,
ressource eastus2. C'est le modèle exact déployé (relevé `az`, pas déduit du nom).

| Ligne | Meter (`skuName`) | **CAD / 1M** | **CAD / 1K** | *(USD / 1M)* |
|---|---|---|---|---|
| Input | `5.4 mini Inp Gl` | **1,0650** | 0,001065 | *0,75* |
| Input *cached* | `5.4 mini cd Inp Gl` | **0,1065** | 0,0001065 | *0,075* |
| Output | `5.4 mini Opt Gl` | **6,3898** | 0,0063898 | *4,50* |

`effectiveStartDate` : 2026-03-01. `productName` : *Azure OpenAI GPT5*.

**3× le prix de `gpt-5-mini`** sur input comme sur output. Or c'est ce
déploiement qui porte le gros morceau : gros system prompt `/decompose` repayé à
chaque requête, et **tous les tours** de la boucle agent. C'est donc lui qui
domine le coût marginal — pas `/annotate`.

Le tarif *cached input* est à 1/10 de l'input : si les tours d'agent bénéficient
du cache de prompt côté Azure, l'écart est massif. À vérifier dans le `usage`
retourné (champ `prompt_tokens_details.cached_tokens`) au bead 97r.8 — non
mesuré à ce jour, donc **on ne le suppose pas** dans le modèle.

## 3. Embedding — `text-embedding-3-large` (1 par `/search`)

`AOAI_EMBED_DEPLOYMENT=text-embedding-3-large`, 3072 dims, SKU **Standard
(régional)**, canadaeast.

| Ligne | Meter (`skuName`) | **CAD / 1M** | **CAD / 1K** | *(USD / 1M)* |
|---|---|---|---|---|
| Input (tarif applicable) | `text-embedding-3-large-regional` | **0,2244** | 0,0002244 | *0,158* |
| *(non applicable — global)* | `text-embedding-3-large-glbl` | *0,1846* | *0,0001846* | *0,130* |

`effectiveStartDate` : 2025-09-01 (regional) / 2024-06-01 (glbl).
Pas de ligne output (embedding = input seulement).

> **Seule ligne dérivée, pas lue telle quelle.** L'API en CAD renvoie `0.0002 / 1K`
> pour **les deux** meters : à ce niveau de prix, l'arrondi à un chiffre
> significatif écrase la distinction regional/global. Le CAD ci-dessus est donc
> calculé depuis l'USD au taux Azure de 1,42 (0,158 × 1,42 = 0,2244). Écart avec
> la valeur arrondie de l'API : ~11 %, sur un poste de l'ordre de 10⁻⁶ $ par
> requête — sans conséquence pratique, mais autant garder le chiffre juste.

Négligeable à l'unité : une query de recherche fait quelques dizaines de tokens
→ ordre de **10⁻⁶ CAD par `/search`**. À garder dans le modèle par rigueur, pas
parce que ça pèse.

## 4. Cohere Rerank — `Cohere-rerank-v4.0-pro`

`COHERE_RERANK_DEPLOYMENT=Cohere-rerank-v4.0-pro`, GlobalStandard, ressource
eastus2.

| Ligne | Meter (`skuName`) | **CAD / 1K units** | **CAD / unit** | *(USD / 1K)* |
|---|---|---|---|---|
| Search unit | `Rerank v4 Pro Glbl Search` | **3,5499** | **0,0035499** | *2,50* |
| *(comparatif)* | `Rerank v4 Fast Glbl Search` | *2,8399* | *0,0028399* | *2,00* |

`effectiveStartDate` : 2026-03-01. `productName` : *Cohere Models*.

**Canal : Azure AI Foundry** (offre marketplace *Cohere Models*, facturée sur la
souscription Azure — donc en CAD, comme le reste). Le prix a été comparé au canal
**Cohere direct** : identique en USD ($2.50/1K searches pour Rerank Pro), mais
Cohere facture en USD → passer par Azure évite en prime le risque de change.
Sources : [Cohere pricing](https://cohere.com/pricing),
[Azure — déployer Cohere Rerank](https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/deploy-models-cohere-rerank).

**`max_tokens_per_doc`** : le code **ne le passe pas** (`cohereRerankDocuments`,
`src/logic/rerank.ts` → `top_n` seulement) ⇒ valeur par défaut de l'API. Pour
rerank-v4.0 : contexte de **32 768 tokens**, documents découpés en chunks de
32 764 ; le défaut documenté du paramètre côté API v2 est 4096. **Ce n'est pas le
paramètre qui pilote la facture** : le seuil de facturation est le **split à 500
tokens (query incluse)**, bien plus bas. Analyse complète et mesure de nos docs
au bead 97r.3 (`variables_cout_marginal.md`) → **facteur de correction 1,0**,
`units = ceil(nb_docs / 100)` est exact.

**Conséquence directe** : fenêtre de 150 docs (`RERANK_WINDOW`, et `RERANK_POOL`
côté `/verbatims`) ⇒ **2 units par appel** ⇒ **0,0071 CAD par `/search`**. C'est,
de loin, le **poste dominant d'une recherche directe** — trois ordres de grandeur
au-dessus de l'embedding.

## 5. Azure AI Search — tier Basic

`opubliq-sondages-search`, canadaeast, `basic`, 1 replica × 1 partition = **1
unité de recherche facturable**.

| Ligne | Meter (`skuName`) | **CAD / heure** | *(USD / heure)* |
|---|---|---|---|
| Unité Basic | `Basic` / *Basic Unit* | **0,1434** | *0,101* |

`effectiveStartDate` : 2024-01-01. `serviceName` : *Azure Cognitive Search*
(ancien nom conservé dans l'API retail).

- **104,68 CAD / mois** (base 730 h) — **3,44 CAD/jour**, **1 256,18 CAD/an**.
- Confirme au cent près la valeur mémorisée « 104,70 $/mois » : c'était bien du
  **CAD**. Toute cette fiche est maintenant dans la même devise, plus d'ambiguïté.

```bash
curl -s -G "https://prices.azure.com/api/retail/prices" \
  --data-urlencode "currencyCode=CAD" \
  --data-urlencode "\$filter=serviceName eq 'Azure Cognitive Search' and armRegionName eq 'canadaeast' and skuName eq 'Basic'" | jq '.Items[]'
```

**Coût fixe, pas marginal.** Un seul service, un index par client : +1 client ≈
+0 $ tant qu'on tient sous les limites du tier Basic (limites à relever au bead
97r.7). À la saturation → saut discret (tier supérieur ou 2e service). Ne pas
diviser ce montant par le nombre de requêtes dans le modèle de coût marginal :
c'est un palier à amortir, à traiter à part.

## Table de conversion (à brancher sur les `[costlog]`)

Multiplicateurs prêts à l'emploi, en **CAD par token / par unit** :

| `op` du costlog | Déploiement | Champ | CAD/token |
|---|---|---|---|
| `annotate` | gpt-5-mini | `prompt_tokens` | 3,55e-7 |
| `annotate` | gpt-5-mini | `completion_tokens` | 2,84e-6 |
| `decompose` | gpt-5.4-mini | `prompt_tokens` | 1,065e-6 |
| `decompose` | gpt-5.4-mini | `completion_tokens` | 6,39e-6 |
| `agent_turn` | gpt-5.4-mini | `prompt_tokens` | 1,065e-6 |
| `agent_turn` | gpt-5.4-mini | `completion_tokens` | 6,39e-6 |
| `embed` | text-embedding-3-large (regional) | `prompt_tokens` | 2,244e-7 |
| `rerank` | Cohere-rerank-v4.0-pro | `units` | **3,5499e-3 / unit** |

Hors table (coût fixe, à ne pas imputer à l'unité) : AI Search Basic,
**104,68 CAD/mois**.

## Limites connues de cette fiche

- **Prix retail seulement.** Remises entreprise, crédits de démarrage et
  engagements ne sont pas reflétés. Le coût *facturé* réel peut être plus bas.
- **Risque de change résiduel.** Les prix CAD publiés par Azure sont révisés
  périodiquement selon le taux de référence Microsoft — ils ne suivent pas le
  marché au jour le jour. Un mouvement USD/CAD durable finira par se répercuter
  sur ces lignes. Une marge de sécurité dans le prix de vente reste prudente.
- **`cached input` non modélisé.** Les tarifs sont relevés (colonnes ci-dessus)
  mais on ignore quelle part du prompt est réellement mise en cache par Azure →
  hypothèse conservatrice : 0 % de cache. À raffiner au bead 97r.8 si le `usage`
  expose `cached_tokens`.
- **Ingestion hors scope**, conformément à `variables_cout_marginal.md`.
- **Compute (Netlify / Container Apps / Service Bus) absent** : à relever sur un
  mois réel via Cost Management (bead 97r.7).
