#!/usr/bin/env python3
"""Runs instrumentés : envoie des requêtes réelles et fait émettre les [costlog] (bead 97r.8).

Ce script ne mesure rien lui-même — il **provoque** la charge. Les lignes
`[costlog]` sortent sur la sortie standard du serveur (`console.log` des
fonctions Netlify), pas dans la réponse HTTP. Le protocole est donc en deux
temps :

    # terminal 1 — le serveur, avec sa sortie capturée
    netlify dev 2>&1 | tee runs.log

    # terminal 2 — la charge
    uv run pricing_app/run_instrumented.py --base http://localhost:8888

    # puis l'agrégation
    uv run pricing_app/aggregate_costlog.py runs.log -o pricing_app/cout_mesure_2026-07-28.md

Chaque type d'usage part avec un `x-client-id` distinct (`run-search`,
`run-agent`, `run-annotate`) : ça valide au passage la propagation du bead 97r.5
et permet de filtrer à l'agrégation (`--client`).

Stdlib uniquement.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

# ---------------------------------------------------------------------------
# Jeu de requêtes
#
# Volontairement hétérogène : c'est la VARIANCE qu'on cherche à mesurer, pas une
# moyenne sur des requêtes jumelles. Court vs long, concret vs abstrait,
# monoconcept vs multiconcept — le coût du decompose et le nombre de tours de
# l'agent en dépendent directement.
# ---------------------------------------------------------------------------

SEARCH_QUERIES = [
    # courtes, monoconcept
    "immigration",
    "logement",
    "inflation",
    "santé mentale",
    "changements climatiques",
    "confiance envers les médias",
    # moyennes
    "opinion des Québécois sur le tramway",
    "satisfaction envers le gouvernement provincial",
    "intentions de vote chez les jeunes",
    "perception de la sécurité dans les transports en commun",
    "attitudes face à la vaccination obligatoire",
    "sentiment d'appartenance au Canada",
    # longues / multiconcept — le decompose y coûte le plus cher
    "est-ce que les gens qui habitent en région ont une opinion différente de ceux des grandes villes sur l'immigration",
    "comment la perception de l'économie a évolué chez les 18-34 ans depuis la pandémie",
    "les personnes préoccupées par l'environnement sont-elles aussi favorables à une taxe carbone",
    "quelles sont les priorités en santé selon le niveau de revenu et la région",
    "opinion sur le télétravail en fonction du secteur d'emploi et de l'âge",
    "confiance envers les institutions démocratiques selon la langue parlée à la maison",
    "attitudes envers les énergies renouvelables chez les propriétaires de véhicules",
    "perception du coût de la vie et intentions de vote aux prochaines élections",
]

AGENT_QUERIES = [
    # simples — 1-2 tours attendus
    "Combien de sondages sont disponibles ?",
    "Quels thèmes sont couverts par le corpus ?",
    "Trouve-moi des questions sur l'immigration.",
    "Y a-t-il des données sur le logement ?",
    "Quels sondages ont des micro-données ?",
    "Montre-moi les questions ouvertes disponibles.",
    "Quelles questions portent sur l'inflation ?",
    # moyennes — recherche + lecture
    "Quelles questions mesurent la confiance envers les médias, et dans quels sondages ?",
    "Résume ce que le corpus contient sur la santé mentale.",
    "Compare les questions sur l'environnement entre les différents sondages.",
    "Quelles questions permettent d'étudier le sentiment d'appartenance ?",
    "Trouve les questions sur le transport et dis-moi lesquelles ont des micro-données.",
    "Quels sondages permettent d'analyser les intentions de vote ?",
    # analytiques — multi-outils, plusieurs tours : le p90 vient d'ici
    "Est-ce que l'opinion sur l'immigration varie selon la région ? Fais un croisement si les données le permettent.",
    "Analyse le lien entre le niveau de scolarité et la perception de l'économie.",
    "Croise les intentions de vote avec le groupe d'âge et commente les écarts.",
    "Quelles différences observe-t-on entre hommes et femmes sur les enjeux environnementaux ?",
    "Fais-moi un portrait des préoccupations économiques par tranche de revenu.",
    "Compare la satisfaction envers le gouvernement selon la langue et la région.",
    "Y a-t-il un lien entre la confiance envers les institutions et l'âge ? Appuie-toi sur les micro-données.",
]

# Batch d'annotation : items fictifs mais réalistes (verbatims courts).
ANNOTATE_BATCH = {
    "property": "sentiment",
    "options": ["positif", "neutre", "négatif"],
    "question_text": "Que pensez-vous de la situation économique actuelle ?",
    "items": [
        {"id": str(i), "text": t}
        for i, t in enumerate(
            [
                "Ça va plutôt bien, je m'en sors.",
                "C'est catastrophique, tout coûte trop cher.",
                "Bof, comme d'habitude.",
                "Je suis inquiet pour l'avenir de mes enfants.",
                "L'épicerie est rendue impayable.",
                "Rien à redire, ma situation est stable.",
                "On s'appauvrit tranquillement.",
                "Je n'ai pas d'opinion là-dessus.",
                "Les taux d'intérêt m'étranglent.",
                "Ça s'améliore depuis un an je trouve.",
                "Difficile de joindre les deux bouts.",
                "Neutre, ni bon ni mauvais.",
                "Le logement est hors de prix, c'est un scandale.",
                "Je suis optimiste malgré tout.",
                "Mon pouvoir d'achat a fondu.",
                "Aucune idée honnêtement.",
                "Ça dépend des secteurs, nuancé.",
                "Très préoccupé par l'inflation.",
                "Je m'estime chanceux comparé à d'autres.",
                "Le gouvernement ne fait rien pour aider.",
                "Situation correcte dans l'ensemble.",
                "L'essence et l'épicerie, c'est rendu fou.",
                "Pas pire, pas mieux qu'avant.",
                "Je repousse ma retraite à cause de ça.",
                "Franchement décourageant.",
            ]
        )
    ],
}


def post(url: str, body: dict, client_id: str, auth: str | None, timeout: int) -> tuple[int, str]:
    data = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "x-client-id": client_id}
    if auth:
        headers["Authorization"] = auth
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            # /agent répond en SSE : on draine le flux jusqu'au bout, sinon la
            # boucle serveur est coupée et les derniers agent_turn n'existent pas.
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")[:300]
    except Exception as e:  # timeout, connexion refusée…
        return 0, f"{type(e).__name__}: {e}"


def run_searches(base: str, auth: str | None, limit: int, pause: float, timeout: int) -> None:
    """Reproduit le chemin de la recherche directe : /decompose puis /search."""
    client = "run-search"
    for i, q in enumerate(SEARCH_QUERIES[:limit], 1):
        status, body = post(f"{base}/decompose", {"query": q}, client, auth, timeout)
        if status != 200:
            print(f"  [{i}] ✗ decompose {status}: {body[:120]}", file=sys.stderr)
            continue
        payload = json.loads(body)
        status, body = post(
            f"{base}/search",
            {
                "query": q,
                "concepts": payload.get("concepts", []),
                "rerank_query": payload.get("rerank_query") or q,
                "top": 10,
            },
            client,
            auth,
            timeout,
        )
        mark = "✓" if status == 200 else "✗"
        print(f"  [{i}/{min(limit, len(SEARCH_QUERIES))}] {mark} {q[:60]}", file=sys.stderr)
        time.sleep(pause)


def run_agent(base: str, auth: str | None, limit: int, pause: float, timeout: int) -> None:
    client = "run-agent"
    for i, q in enumerate(AGENT_QUERIES[:limit], 1):
        started = time.time()
        status, body = post(
            f"{base}/agent", {"messages": [{"role": "user", "content": q}]}, client, auth, timeout
        )
        mark = "✓" if status == 200 else "✗"
        took = time.time() - started
        print(f"  [{i}/{min(limit, len(AGENT_QUERIES))}] {mark} {took:5.1f}s  {q[:55]}", file=sys.stderr)
        if status != 200:
            print(f"        {body[:150]}", file=sys.stderr)
        time.sleep(pause)


def run_annotate(base: str, auth: str | None, pause: float, timeout: int) -> None:
    status, body = post(f"{base}/annotate", ANNOTATE_BATCH, "run-annotate", auth, timeout)
    mark = "✓" if status == 200 else "✗"
    n = len(ANNOTATE_BATCH["items"])
    print(f"  {mark} batch de {n} items", file=sys.stderr)
    if status != 200:
        print(f"    {body[:200]}", file=sys.stderr)
    time.sleep(pause)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", default="http://localhost:8888", help="racine du serveur")
    ap.add_argument("--auth", help='en-tête Authorization complet, ex. "Basic dXNlcjpwYXNz"')
    ap.add_argument("--only", choices=["search", "agent", "annotate"], help="ne lancer qu'un type")
    ap.add_argument("--limit", type=int, default=20, help="nb de requêtes par type (défaut 20)")
    ap.add_argument("--pause", type=float, default=1.0,
                    help="pause entre requêtes, en s — évite de saturer le TPM et de récolter des 429")
    ap.add_argument("--timeout", type=int, default=180, help="timeout HTTP par requête (s)")
    args = ap.parse_args()

    base = args.base.rstrip("/")
    todo = [args.only] if args.only else ["search", "agent", "annotate"]

    print(f"Cible : {base}", file=sys.stderr)
    print("Les lignes [costlog] sortent côté SERVEUR — pense à capturer sa sortie.\n", file=sys.stderr)

    if "search" in todo:
        print("Recherches directes (client_id=run-search)", file=sys.stderr)
        run_searches(base, args.auth, args.limit, args.pause, args.timeout)
    if "agent" in todo:
        print("\nRequêtes agent (client_id=run-agent) — long, chaque requête enchaîne plusieurs tours",
              file=sys.stderr)
        run_agent(base, args.auth, args.limit, args.pause, args.timeout)
    if "annotate" in todo:
        print("\nAnnotation (client_id=run-annotate)", file=sys.stderr)
        run_annotate(base, args.auth, args.pause, args.timeout)

    print("\nTerminé. Agrège avec :", file=sys.stderr)
    print("  uv run pricing_app/aggregate_costlog.py <logfile> -o pricing_app/cout_mesure_<date>.md",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
