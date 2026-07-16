/**
 * Décomposition de requête (query expansion) — module partagé.
 *
 * Extrait la logique « décomposition » de la Netlify Function `/decompose` pour
 * la réutiliser telle quelle dans le harness d'évaluation offline, sans
 * dupliquer le prompt système ni les paramètres du call.
 *
 * `decomposeQuery()` transforme une requête utilisateur brute en concepts
 * pondérés (action + objet, objet + public cible, ou concept unique) pour
 * enrichir la recherche.
 *
 * MODÈLE : gpt-5.4-mini (Azure AI Foundry, route Chat Completions compatible
 * OpenAI). PAS gpt-5-mini — celui-là est un modèle *reasoning* bloqué à
 * `temperature: 1` (400 sur `temperature:0`) : mesuré 3 décompositions
 * différentes sur 5 appels identiques ("satisfaction envers la qualité de
 * l'eau"), donc pool de candidats non-déterministe. gpt-5.4-mini accepte
 * `temperature: 0` (vérifié) et est stable 5/5 sur les concepts ET sur
 * `rerank_query` pour cette même requête ; seule la queue des synonymes varie
 * (ancres principales stables 5/5, périphérie type 'potable'/'à boire' 1/5),
 * ce qui fait légèrement bouger le pool sans en changer la structure.
 *
 * Mistral-Large-3 occupait ce rôle avant (temperature 0, stable 5/5 sur les
 * concepts) mais son serving Azure s'est effondré — hang sans réponse en
 * GlobalStandard, `no healthy upstream` en DataZoneStandard, sur toutes les
 * routes et depuis le playground Azure lui-même. Rien à corriger de notre
 * côté : recréer le déploiement ne change rien (en GlobalStandard c'est une
 * entrée de routage, pas un conteneur à nous). Éval golden au moment de la
 * bascule : recall 82,7 % -> 84,1 %, filet plus large (voir eval/run.ts).
 *
 * Comportement identique à la prod :
 *   - même `SYSTEM_PROMPT` (NE PAS y toucher sans re-mesurer — réglé par
 *     ailleurs pour la reformulation de query et la règle "un seul concept
 *     intention de vote")
 *   - `response_format: { type: "json_object" }`
 *   - même normalisation des concepts (dédoublonnage + somme des poids = 1)
 *
 * Les clés/endpoints Foundry sont injectés via le paramètre `env` (jamais lus
 * globalement) pour que le harness offline puisse les fournir librement.
 */

import type { Concept } from "../types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const FOUNDRY_API_VERSION = "2024-05-01-preview"; // Route Chat Completions Foundry (confirmée compatible OpenAI)

/**
 * Plafond sur l'appel Foundry. Sans lui, une panne du fournisseur ne se
 * manifeste pas par une erreur mais par un silence : mesuré, Mistral-Large-3 a
 * cessé de répondre sans jamais fermer la connexion (0 octet, aucun header),
 * jusqu'à ce que Node abandonne de lui-même après 5 minutes — bien au-delà du
 * budget de la Netlify Function, qui rendait un 500 opaque.
 */
const FOUNDRY_TIMEOUT_MS = 8000;

export const SYSTEM_PROMPT = `Tu élargis une requête de recherche dans des questions de sondages citoyens québécois. DÉCOMPOSE la requête en ses CONCEPTS distincts (typiquement une action + un objet, ou un objet + un public cible ; parfois un seul concept).

CORPUS BILINGUE : les questions sont en français ET en anglais, et un terme n'est trouvé que s'il apparaît LITTÉRALEMENT (sous-chaîne, sans lemmatisation) dans la question. Donc pour CHAQUE concept :
- Donne ses synonymes DANS LES DEUX LANGUES (français québécois ET anglais). Ex. concept 'changement climatique' -> syns incluant 'climat', 'climate', 'réchauffement', 'warming', 'changement climatique', 'climate change'.
- PRIVILÉGIE des ANCRES COURTES d'un seul mot (ex. 'climat', 'climate', 'environnement', 'environment') EN PLUS des expressions de 2-3 mots : une expression composée ('changement climatique') rate les variantes réelles ('changements climatiques' au pluriel, 'climate change'), alors qu'une ancre courte les attrape toutes.
- Inclus les variantes morphologiques (singulier/pluriel, formes verbales : poteau ET poteaux) et les termes que les citoyens emploient couramment, même techniquement distincts (ex. 'librairie' pour 'bibliothèque', 'gazon' pour 'pelouse').

Chaque synonyme est un terme COURT (1 à 3 mots) cherché comme sous-chaîne littérale dans un texte réel — jamais une paraphrase de plusieurs mots de la requête (mauvais : 'accessibilité des arrêts de bus' ; bon : 'arrêt de bus', 'bus stop', 'sans obstacle'). MAXIMUM 10 synonymes par concept (les deux langues comptent dans ce total).

RÈGLE CLÉ : un concept distinct doit ouvrir un AXE DE RECHERCHE VRAIMENT INDÉPENDANT — pas juste redire le concept principal autrement. Si un complément (lieu, contexte, ou proposition relative) ne fait que QUALIFIER/REDÉCRIRE l'objet principal sans ajouter d'information cherchable distincte, fusionne-le comme synonyme court du concept principal au lieu d'en faire un concept séparé. Ex. : 'amuseurs dans la rue' -> UN concept {orig:'amuseurs', syns:[...,'artistes de rue']}, PAS un concept 'rue' séparé.

ATTENTION — PIÈGE FRÉQUENT DU FRAGMENT DEVENU FAUX CONCEPT : les concepts sont combinés en ET (AND) entre eux ; leurs synonymes sont combinés en OU (OR) à l'intérieur d'un même concept. Ne découpe JAMAIS une expression en (a) le concept complet et (b) un mot ou fragment qui en fait déjà partie, comme s'il s'agissait de deux axes distincts — ex. pour 'intention de vote', NE PAS créer un concept 'intention de vote' PUIS un second concept 'vote'/'voter' : 'vote' n'est pas un axe de recherche indépendant, c'est un morceau de la même idée. Ce sont des SYNONYMES/variantes d'UN SEUL concept (OR), jamais deux concepts (AND). Teste-toi ainsi avant de finaliser : « une question qui exprime ce sujet avec SEULEMENT les mots du concept 1, sans aucun mot du concept 2, resterait-elle à l'évidence pertinente ? » Si oui, ce sont deux fragments du même concept à FUSIONNER, pas deux concepts à séparer.

FILET LARGE, PAS PASSOIRE : le retrieval n'est qu'une première passe grossière — un modèle de reranking sémantique se charge ensuite de la précision fine et peut reclasser du bruit vers le bas sans jamais pouvoir rattraper un document absent du pool. En cas de doute entre fusionner deux fragments en UN concept (plus de rappel, un peu plus de bruit) ou les séparer en DEUX concepts AND (plus précis mais risque d'exclure à tort un document pertinent qui ne contient qu'un des deux), CHOISIS TOUJOURS DE FUSIONNER. Un AND en trop qui exclut un document pertinent est une perte définitive ; un OR en trop qui laisse passer du bruit est un coût mineur, rattrapable en aval. Limite-toi à 2-3 concepts maximum, seulement quand les axes sont clairement et indiscutablement indépendants (ex. 'accès au logement' : accès + logement sont deux idées séparables, gardées comme deux concepts).

ANCRES D'ENTITÉS/INSTITUTIONS : quand un concept désigne une entité ou un palier institutionnel (ex. 'gouvernement fédéral', 'gouvernement provincial'), inclus TOUJOURS le nom nu de l'entité comme ancre courte à part entière dans ses synonymes, dans les deux langues (ex. pour 'gouvernement fédéral' : 'gouvernement', 'government', EN PLUS de 'fédéral'/'federal') — beaucoup de questions nomment l'institution générique sans répéter le qualificatif de palier à chaque fois.

STRUCTURE À 2 NIVEAUX : si un concept a un NOM DE BASE générique (ex. 'eau') qui peut être précisé par un ADJECTIF/QUALIFICATIF (ex. 'potable', 'à boire', 'buvable'), sépare les deux : 'syns' = variantes du nom de base SEUL (toujours valide tout seul) ; 'qualifiers' = les précisions/adjectifs (liste optionnelle, omets-la si non applicable). NE FUSIONNE PAS le nom de base et l'adjectif en un seul synonyme composé ('eau potable') — le nom de base doit rester cherchable seul, une question qui ne dit que 'eau' reste pertinente (juste moins précise).

Si un mot évaluatif concret (ex. 'qualité', 'état', 'niveau', 'satisfaction', 'accès') précède 'de'/'envers'/'à' + un objet, c'est en général un CONCEPT À PART ENTIÈRE (souvent littéralement présent dans la question) — PAS un qualificatif à fusionner avec l'objet qui suit. Ex. : 'qualité de l'eau qu'on peut boire' -> DEUX concepts : {orig:'qualité', syns:['qualité'], weight:0.3} ET {orig:'eau', syns:['eau'], qualifiers:['potable','à boire','buvable'], weight:0.7}. PAS un seul concept 'qualité de l'eau potable' répété pour chaque synonyme.

POIDS (weight) : assigne à chaque concept son importance relative (0.0-1.0, tous les poids somment à 1). Concept évaluatif générique (qualité, état, niveau, satisfaction, accès) -> poids faible ; concept-objet principal -> fort. Ex. : 'état des trottoirs' -> {orig:'état',...,weight:0.2} ET {orig:'trottoir',...,weight:0.8}. Requête à concept unique -> weight:1. (weight ne sert QUE d'indication d'importance affichée à l'utilisateur — il n'affecte ni la requête de recherche ni le classement des résultats ; ne complique pas la décomposition en concepts pour le "bien pondérer".)

REQUÊTE DE RERANK (rerank_query) : destinée à un AUTRE modèle que les concepts ci-dessus. Les concepts servent au BM25 (matching littéral) ; celle-ci part au RERANKER SÉMANTIQUE, qui lit la requête ET la question de sondage ensemble (avec ses options de réponse) pour juger de leur correspondance.

Reformule la requête en un ÉNONCÉ DE RECHERCHE naturel — le reranker est entraîné sur des requêtes formulées, pas sur des fragments télégraphiques. Ex. : 'logement' -> 'questions sur le logement'.

LEVE L'AMBIGUÏTÉ quand deux lectures courantes existent et désigneraient DEUX QUESTIONS DE SONDAGE DIFFÉRENTES que le reranker confondrait. Ex. : « intention de vote » — en français, « intention de vote » (pour QUEL PARTI) et « intention d'aller voter » (participation électorale) sont à un mot près ; précise alors le sens usuel : 'intention de vote pour un parti politique'. Sans cette précision, le reranker classe la participation devant le choix de parti (mesuré).

RÈGLE ABSOLUE — REFORMULER N'EST PAS ENRICHIR. Tu peux changer la FORME (fragment -> énoncé) et lever une ambiguïté. Tu ne peux JAMAIS ajouter de CONTENU : aucun sujet, synonyme, facette, sous-thème, année, lieu ou entité qui ne soit pas déjà dans la requête de l'utilisateur. Chaque mot porteur de sens de ta reformulation doit venir de sa requête, ou n'être que la levée d'ambiguïté ci-dessus.
- 'immigration' -> 'questions sur l'immigration'. JAMAIS 'immigration, réfugiés, migrants' ni '...politiques d'accueil' : il n'a pas demandé les réfugiés.
- 'santé mentale' -> 'questions sur la santé mentale'. JAMAIS '...accès aux services de santé mentale' : il n'a pas demandé l'accès aux services.
- N'énumère pas de facettes entre parenthèses. Élargir le vocabulaire est le rôle des concepts ci-dessus, pas le tien.

POURQUOI : ajouter du contenu déplace le score du reranker de façon imprévisible et non corrigible en aval, et fait remonter des questions sur un sujet que l'utilisateur n'a pas demandé (mesuré). Deviner une intention absente est PIRE que de ne rien préciser : ça donne des résultats confidemment hors-sujet au lieu de résultats honnêtement mitigés.

Garde la LANGUE de l'utilisateur. Reste COURT (une ligne).

Réponds UNIQUEMENT en JSON : {"concepts":[{"orig":"...","syns":["...","..."],"qualifiers":["...","..."],"weight":0.5}, ...], "rerank_query":"..."}. "qualifiers" est optionnel (liste vide si non applicable). "weight" est obligatoire (somme = 1). "rerank_query" est obligatoire.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Endpoint + clé + déploiement Azure AI Foundry (Mistral-Large-3) requis par la décomposition, injectés explicitement. */
export interface DecomposeEnv {
  FOUNDRY_CHAT_ENDPOINT: string;
  FOUNDRY_CHAT_KEY: string;
  FOUNDRY_CHAT_DEPLOYMENT: string;
}

interface DecomposeResponse {
  concepts: Concept[];
  rerank_query?: string;
}

/**
 * Sortie de `decomposeQuery()` : les concepts (pour le BM25) ET la requête
 * reformulée (pour le reranker sémantique). Les deux viennent du MÊME appel LLM
 * — la reformulation ne coûte donc ni latence ni appel supplémentaire.
 */
export interface DecomposeResult {
  concepts: Concept[];
  /**
   * Requête reformulée à envoyer au reranker. Peut être vide si le LLM ne l'a
   * pas produite : l'appelant doit alors retomber sur la requête brute.
   */
  rerankQuery: string;
}

interface FoundryChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise les concepts : dédoublonnage, nettoyage et s'assure que la somme des poids vaut 1.
 */
export function normalizeConcepts(concepts: Concept[]): Concept[] {
  if (!concepts || concepts.length === 0) return [];

  // 1. Nettoyage et dédoublonnage pour chaque concept
  const cleaned = concepts.map((c) => {
    const orig = c.orig.trim();
    const syns = Array.from(new Set((c.syns || []).map((s) => s.trim()).filter((s) => s.toLowerCase() !== orig.toLowerCase())));
    const qualifiers = Array.from(new Set((c.qualifiers || []).map((q) => q.trim()).filter((q) => q.toLowerCase() !== orig.toLowerCase())));

    return {
      orig,
      syns,
      qualifiers: qualifiers.length > 0 ? qualifiers : undefined,
      weight: Math.max(0, c.weight || 0),
    };
  });

  // 2. Normalisation des poids (somme = 1)
  const totalWeight = cleaned.reduce((acc, c) => acc + c.weight, 0);

  if (totalWeight === 0) {
    const equalWeight = 1 / cleaned.length;
    cleaned.forEach((c) => (c.weight = equalWeight));
  } else if (Math.abs(totalWeight - 1.0) > 0.001) {
    cleaned.forEach((c) => (c.weight = c.weight / totalWeight));
  }

  return cleaned;
}

// ---------------------------------------------------------------------------
// Décomposition
// ---------------------------------------------------------------------------

/**
 * Décompose une requête utilisateur brute en concepts pondérés via Mistral-Large-3
 * (Azure AI Foundry, route Chat Completions compatible OpenAI).
 *
 * Même prompt que la prod, `temperature: 0` (pool de candidats déterministe —
 * voir note en tête de fichier), `response_format: json_object`, puis
 * normalisation (dédoublonnage + somme des poids = 1).
 *
 * @param query Requête utilisateur brute (sera trim()).
 * @param env   Endpoint/clé + deployment chat Foundry injectés.
 * @returns     Concepts normalisés + requête reformulée pour le reranker.
 * @throws {Error} Si l'appel Foundry échoue ou renvoie un contenu vide.
 */
export async function decomposeQuery(query: string, env: DecomposeEnv): Promise<DecomposeResult> {
  const endpoint = (env.FOUNDRY_CHAT_ENDPOINT ?? "").replace(/\/$/, "");
  const model = env.FOUNDRY_CHAT_DEPLOYMENT ?? "";
  const key = env.FOUNDRY_CHAT_KEY ?? "";
  const url = `${endpoint}/models/chat/completions?api-version=${FOUNDRY_API_VERSION}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query.trim() },
      ],
      // Mistral-Large-3 n'est PAS un modèle reasoning : temperature: 0 est accepté
      // et mesuré stable 5/5 sur les concepts (contrairement à gpt-5-mini).
      temperature: 0,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(FOUNDRY_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Foundry chat error ${res.status}: ${errBody}`);
  }

  const json = (await res.json()) as FoundryChatResponse;
  const content = json.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from Foundry chat");
  }

  const parsed = JSON.parse(content) as DecomposeResponse;
  return {
    concepts: normalizeConcepts(parsed.concepts),
    rerankQuery: (parsed.rerank_query ?? "").trim(),
  };
}
