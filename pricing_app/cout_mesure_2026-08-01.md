# Coût marginal mesuré — médiane & p90 (bead 97r.8)

Price card : `price_card_canadaeast_2026-07-28.md` — tous les montants en **CAD**.
Requêtes agrégées : **44** (agent: 22, annotation: 2, recherche_directe: 20).

### Recherche directe — n = 20

| Composant | Médiane (CAD) | p90 (CAD) |
|---|---:|---:|
| decompose | 0.001147 | 0.001552 |
| embed | 0.000002 | 0.000005 |
| rerank | 0.007100 | 0.007100 |
| **total / requête** | **0.008250** | **0.008656** |

| Driver | Médiane | p90 |
|---|---:|---:|
| `/search` déclenchés | 1.0 | 1.0 |
| latence cumulée (s) | 1.9 | 4.0 |

Rapport p90/médiane : **×1.0**.

### Requête agent — n = 22

| Composant | Médiane (CAD) | p90 (CAD) |
|---|---:|---:|
| embed | 0 | 0.000006 |
| rerank | 0 | 0.003550 |
| agent_turn | 0.008883 | 0.0225 |
| **total / requête** | **0.008883** | **0.0261** |

| Driver | Médiane | p90 |
|---|---:|---:|
| tours d'agent | 2.0 | 3.0 |
| `/search` déclenchés | 0.0 | 1.0 |
| latence cumulée (s) | 10.2 | 18.5 |

Rapport p90/médiane : **×2.9**.

### Annotation — n = 2

| Composant | Médiane (CAD) | p90 (CAD) |
|---|---:|---:|
| annotate | 0.000866 | 0.000866 |
| **total / requête** | **0.000866** | **0.000866** |

| Driver | Médiane | p90 |
|---|---:|---:|
| latence cumulée (s) | 2.1 | 2.4 |

**Coût par item annoté** : 0.000035 CAD (50 items sur 2 batchs).

Rapport p90/médiane : **×1.0**.

## Notes de lecture

- **Cache de prompt** : 44/44 requêtes portent `cached_tokens`. Absent = l'API ne l'a pas rapporté → facturé au tarif plein (hypothèse conservatrice).
- **Hors coût marginal** : AI Search Basic, 104.68 CAD/mois, coût fixe par palier — à ne pas diviser par le nombre de requêtes.
- Le p90 est le chiffre à retenir pour dimensionner ; la médiane décrit le cas courant.
