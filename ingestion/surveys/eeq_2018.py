"""Extraction normalisée -- eeq_2018.

Source : Quebec Election Study 2018.dta (Stata)
         Etude electorale quebecoise 2018, Universite Concordia / McGill
         (E. Belanger et al.).

RÉÉCRITURE COMPLÈTE (2026-08) suite à un audit qualité : la version
précédente de ce module retapait le codebook markdown À LA MAIN dans un
dict littéral -- violant la règle cardinale zéro-fabrication de
ingestion/CONVENTIONS.md. Plusieurs `question_text`/`response_options`
divergeaient du raw (ex. q13 avait une question d'intention de vote
fédérale absente de toute source ; qstat avait des CODES numériques mal
alignés -- code 3 = « Célibataire » au codebook, mappé à tort à « Séparé(e)
ou divorcé(e) »).

Cause racine : `Quebec Election Study 2018.dta` n'a AUCUN value label
exploitable (`meta.variable_value_labels` vide pour les variables
substantielles -- seules quelques colonnes de write-in « autre, précisez »
portent des labels, et ceux-ci sont corrompus/tronqués, cf. EXCLUDED_VARS).
Le wording (questions + options de réponse) doit donc venir du codebook
markdown externe : "Quebec Election Study 2018 FR with programmed answer
values.md" (export Word -> Markdown, texte français intégral avec les
valeurs codées).

DEVIATION ASSUMEE ET VALIDEE (cf. eeq_2012.py pour un precedent similaire) :
le texte vient de ce .md, pas du .dta. Le .dta sert a : la liste complete
des variables (couverture), les codes/valeurs REELLEMENT observes (pour
detecter les ecarts entre `response_options` et les donnees), et n (nombre
de repondants). L'invariant zero-fabrication reste intact.

MÉTHODE -- PARSEUR PROGRAMMATIQUE (pas de retranscription manuelle) :
Le module ci-dessous contient un petit parseur regex/structurel du .md
(`_parse_md`, `_build_resolved_map`) qui :
  1. découpe le fichier en blocs par en-tête de variable (motif
     `VARNAME - ... POSER À TOUS` etc.) ;
  2. dans chaque bloc, sépare le texte d'intro (question) des options de
     réponse (motif `Label (code)`, éventuellement multi-lignes) ;
  3. détecte les questions de type « grille » (tableau ASCII rendu par
     pandoc : colonnes = options de réponse partagées, lignes = items
     d'une batterie -- ex. Q14 "associez chaque slogan à son parti", 5
     lignes = 5 slogans) via la ligne de séparation de colonnes (suite de
     segments `----`), et reconstruit le texte de chaque colonne en
     découpant les lignes d'en-tête aux positions caractère données par
     cette ligne de séparation (mécanisme des tableaux "grid" de pandoc) ;
  4. relie chaque variable du .dta à son bloc/ligne source : correspondance
     directe (`Q13` -> `q13`), ligne de grille (`Q14` bloc, item codé `4`
     -> `q14_4`, question_text = intro + " / " + libellé de la ligne), ou
     "checkbox" multi-select à plat (`Q71` bloc, option codée `96` ->
     `q71_96`, values observées 0/1 -> réponse « Mentionné »/« Non
     mentionné », pattern déjà utilisé par eeq_2022.py::CHECKBOX_VARS).
Zéro texte de question/option n'est retapé à la main : tout provient du
parsing automatique du .md. Les rares divergences non résolubles
automatiquement (typo de parenthèses dans le .md source, syntaxe de piping
Voxco `^f('Q6')...^`) sont documentées ligne par ligne dans
`MANUAL_OVERRIDES` avec la ligne source citée -- pas d'invention de texte,
seulement une désambiguïsation d'un artefact de conversion.

Encodage : fichier .dta lu avec pyreadstat.

Usage :
    uv run python ingestion/surveys/eeq_2018.py
    -> ecrit ingestion/normalized/eeq_2018.json
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pyreadstat

from ingestion.canonical import canonical_sociodemo_text
from ingestion.models import SurveyFile
from ingestion.open_text import is_text_column
from ingestion.validate import fabrication_reason

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
REPO_ROOT = _HERE.parent.parent
DATA_DIR = REPO_ROOT / "data" / "eeq_2018"
DTA_FILE = DATA_DIR / "Quebec Election Study 2018.dta"
MD_FILE = DATA_DIR / "Quebec Election Study 2018 FR with programmed answer values.md"
OUT_FILE = REPO_ROOT / "ingestion" / "normalized" / "eeq_2018.json"

# ---------------------------------------------------------------------------
# Constantes du sondage
# ---------------------------------------------------------------------------

# Rail microdonnees (v33.3) -- declaratif, lu en LECTURE SEULE par
# ingestion/microdata.py. N'affecte PAS l'extraction catalogue.
WEIGHT_VAR = "pond"
RESPONDENT_ID_VAR = "respid"

SURVEY_ID = "eeq_2018"
SURVEY_NAME = "Étude électorale québécoise 2018 (EEQ)"
YEAR = 2018
POLLSTER = "Université Concordia / McGill"
LANGUAGE = "fr"

# ---------------------------------------------------------------------------
# Variables EXCLUES (techniques / derivees / sans contenu exploitable)
# ---------------------------------------------------------------------------

EXCLUDED_VARS: dict[str, str] = {
    "responseid": "identifiant technique de réponse (plateforme de sondage)",
    "respid": "identifiant technique de répondant (= RESPONDENT_ID_VAR, rail microdonnées)",
    "pond": "pondération — poids statistique (= WEIGHT_VAR, rail microdonnées)",
    "agensp": "flag technique « ne sait pas » associé à la saisie année/mois de "
              "naissance (AGEYM) — pas de libellé de question propre",
    "agecalc": "âge calculé (« AgeCalc » — en-tête md marqué CALCULÉE), dérivé de "
               "ageyear_1/agemonth_1 ou agenum, déjà couverts comme sources",
    "age": "tranche d'âge calculée (en-tête md « AGE - CALCULÉE », *** VISIBLE EN "
           "MODE TEST SEULEMENT ***) — dérivée, pas une question posée au répondant",
    "ageref": "flag technique de refus associé à AGENUM (valeur constante 0 sur "
              "les 41 répondants concernés, sentinelle 999 fusionnée dans agenum, "
              "voir MANUAL_OVERRIDES) — pas une question propre",
    "minor": "flag calculé « MINOR » (en-tête md CALCULÉE, *** VISIBLE EN MODE TEST "
             "SEULEMENT ***), dérivé de l'âge — pas une question posée",
    "split_q20": "flag technique de routing (quelle variante Q20A/Q20B a été "
                 "posée) — en-tête md CALCULÉE, *** VISIBLE EN MODE TEST SEULEMENT ***",
    "split_q50": "flag technique de routing (quelle variante Q50x1/x2/x3 a été "
                 "posée) — en-tête md CALCULÉE, *** VISIBLE EN MODE TEST SEULEMENT ***",
    "regio": "région agrégée dérivée (MTL RMR / QC RMR / Autres régions) — en-tête "
             "md « REGIO - CALCULÉE », recodage de q0qc (17 régions administratives), "
             "déjà couverte comme source socio-démo",
    "district": "circonscription électorale dérivée du code postal — identifiant "
                "géographique technique, pas une question posée au répondant",
    "NM_MUNCP": "nom de municipalité dérivé du code postal — identifiant "
                "géographique technique, pas une question posée au répondant",
    # Write-in "autre, précisez" de Q2 (code 96) : capturé sous plusieurs
    # variables au nommage éclaté (plateforme de sondage). Les rares value
    # labels présents dans le .dta pour ces colonnes (meta.variable_value_labels)
    # sont un codage secondaire CORROMPU/ILLISIBLE (texte tronqué, voyelles
    # disparues -- ex. Q2_960 code 3 : "nn,ilestlmrnnttdsolgrqs125dptsqsntsprrsax8m…").
    # Aucun wording exploitable et non fabriquable depuis ce charabia.
    "q2_96_other": "capture write-in « autre enjeu, précisez » de Q2 (code 96) — "
                   "value labels du .dta corrompus/illisibles, non exploitables",
    "Q2_960": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_961": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_962": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_963": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_964": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_965": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_966": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_967": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_968": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_969": "sous-champ technique du write-in « autre » de Q2 — value labels "
              "corrompus/tronqués dans le .dta, non exploitables",
    "Q2_96A": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96B": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96C": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96D": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96E": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96F": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96G": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96H": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
    "Q2_96I": "sous-champ technique du write-in « autre » de Q2 — value label "
              "vide dans le .dta, non exploitable",
}

# ---------------------------------------------------------------------------
# Variables socio-demographiques (source privilégiée quand plusieurs
# variables raw couvrent le même concept -- cf. règle "garde la source,
# exclus la dérivée")
# ---------------------------------------------------------------------------

SOCIODEMO_VARS: dict[str, str] = {
    "q0qc": "region",
    "ageyear_1": "age",
    "qsexe": "gender",
    "qlangue": "language",
    "qscol": "education",
    "q61": "income",
    "qstat": "marital_status",
    "qoccup": "occupation",
}

# ---------------------------------------------------------------------------
# Variables d'échelle numérique (thermomètres 0-10, échelles 0-5/1-5) --
# rangée séparément des Likert verbaux (Tout à fait d'accord...désaccord,
# Très important...pas important) qui restent "single" (options catégorielles
# nommées, pas une graduation numérique continue).
# ---------------------------------------------------------------------------

SCALE_VARS: set[str] = {
    "q21_1",
    "q32_1", "q32_2", "q32_3", "q32_4",
    "q33_a", "q33_b", "q33_c", "q33_d", "q33_e", "q33_f",
    "q34_a", "q34_b", "q34_c", "q34_d", "q34_e",
    "q35_1", "q35_2", "q35_3", "q35_4",
    "q36_1",
    "q37a_1", "q37b_1", "q37c_1",
    "q41_1",
    "q47_1",
}

# ---------------------------------------------------------------------------
# Variables "checkbox" -- items individuels d'une batterie "sélectionnez
# toutes celles qui s'appliquent" (Q71, origine ethnique, jusqu'à 4
# mentions). Valeurs .dta observées 0/1 (pas de value label natif) : la
# sémantique "mentionné/non mentionné" est structurelle (ce que représente
# une case à cocher), pas un texte de réponse fabriqué -- même convention
# que CHECKBOX_VARS dans eeq_2022.py.
# ---------------------------------------------------------------------------

CHECKBOX_VARS: set[str] = {
    f"q71_{c}" for c in
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "96", "98", "99"]
}

# ---------------------------------------------------------------------------
# Variables numériques dont `response_options` ne contient QUE une sentinelle
# de refus/NSP (pas de choix fermés) alors que les valeurs .dta observées
# sont largement continues (ex. agenum : options = [999 "PNR"] fusionné
# depuis AGEREF, valeurs réelles observées 16-82). La règle générique
# "response_options non vide -> single" les classerait à tort en catégoriel ;
# ageyear_1/agemonth_1 tombent déjà en "continuous" par la règle générique
# (options=[] côté AGEYM, cf. MANUAL_OVERRIDES) -- seul agenum a besoin de
# cette liste explicite car sa sentinelle 999 lui donne un response_options
# non vide.
# ---------------------------------------------------------------------------

CONTINUOUS_OVERRIDE: set[str] = {"agenum"}

# ---------------------------------------------------------------------------
# Cas particuliers non résolubles par le parseur générique -- documentés
# avec référence exacte à la ligne du .md source. AUCUN texte inventé ici :
# soit on cite le texte correct depuis une autre source raw (FR.md sans les
# valeurs programmées), soit on garde le texte brut tel quel (syntaxe de
# piping Voxco `^...^`, non retouchée).
# ---------------------------------------------------------------------------

# qenfan2 (.md ligne 255) : le .md source a une parenthèse non fermée sur
# « ...votre conjoint(e » -- confirmé être une coquille du DOCUMENT SOURCE
# lui-même (même artefact dans "Quebec Election Study 2018 FR.md" ligne 112,
# le questionnaire SANS valeurs programmées : "conjoint(e)" avec la même
# parenthèse ouvrante orpheline avant elle -- "Avez-vous des enfants?
# (incluant les enfants de votre conjoint(e)"). Le parseur générique
# interprète à tort le "(e" final comme un code d'option ; on restitue ici
# le texte intro correct tel qu'il apparaît dans le raw (ponctuation
# déséquilibrée incluse, verbatim).
_QENFAN2_INTRO = "Avez-vous des enfants? (incluant les enfants de votre conjoint(e)"

# agenum (.md lignes 127-141) : le champ de saisie numérique libre n'a pas
# d'options dans son propre bloc (juste un encadré de saisie vide) ; la
# sentinelle de refus « Je préfère ne pas répondre (999) » est définie dans
# le bloc suivant AGEREF (lignes 135-141, « End of AGENUM » confirmant son
# rattachement logique à AGENUM). Fusionnée ici depuis ce bloc adjacent,
# pas inventée.
_AGENUM_EXTRA_OPTIONS: list[tuple[str, str]] = [("Je préfère ne pas répondre", "999")]

# ageyear_1 / agemonth_1 (.md lignes 113-119, bloc AGEYM) : la variable .dta
# "ageym" elle-même n'existe pas -- le .dta scinde la saisie "année et mois
# de naissance" en deux colonnes (ageyear_1, agemonth_1). Le .md ne fournit
# qu'un unique texte de question couvrant les deux ("Veuillez indiquer votre
# année et votre mois de naissance :") : ce même texte verbatim est réutilisé
# pour les deux variables (pas de libellé séparé disponible pour "année" vs
# "mois" spécifiquement -- convention batterie déjà utilisée quand un item
# n'a pas de libellé démembré propre).
_AGEYM_INTRO = "Veuillez indiquer votre année et votre mois de naissance :"


# ---------------------------------------------------------------------------
# Parseur du questionnaire markdown
# ---------------------------------------------------------------------------

_HEADER_RE = re.compile(r"^([A-Za-z][A-Za-z0-9_]*) - .+$")
_GLYPH_RE = re.compile("[-]")  # icônes de case à cocher (Wingdings->PUA)
_DIRECTIVE_RE = re.compile(r"^\[.*\]$")
_DASH_RUNS_RE = re.compile(r"-+")
_OPTION_TRAIL_RE = re.compile(r"^(.*)\((\w+)\)\s*(?:\[[^\]]*\]\s*)*$")


def _load_md_lines() -> list[str]:
    with open(MD_FILE, encoding="utf-8") as f:
        return [line.rstrip("\n") for line in f]


def _split_md_blocks(lines: list[str]) -> dict[str, list[list[str]]]:
    """Découpe le .md en blocs de contenu par en-tête de variable.

    Clé = nom de variable tel qu'il apparaît dans l'en-tête (ex. "Q14").
    Valeur = liste de blocs (normalement un seul, sauf en-têtes répétés).
    """
    idxs = [i for i, ln in enumerate(lines) if _HEADER_RE.match(ln)]
    idxs.append(len(lines))
    blocks: dict[str, list[list[str]]] = {}
    for k in range(len(idxs) - 1):
        start, end = idxs[k], idxs[k + 1]
        var = lines[start].split(" - ")[0].strip()
        blocks.setdefault(var, []).append(lines[start + 1:end])
    return blocks


def _paragraphs(block_lines: list[str]) -> list[list[str]]:
    """Groupe les lignes en paragraphes (lignes non-vides consécutives),
    en retirant les paragraphes purement directifs (`[Randomized answerlist]`
    etc.) ou purement décoratifs (lignes de bordure ASCII `----...----`)."""
    paras: list[list[str]] = []
    cur: list[str] = []
    for raw in block_lines:
        line = _GLYPH_RE.sub("", raw)
        if line.strip() == "":
            if cur:
                paras.append(cur)
                cur = []
        else:
            cur.append(line)
    if cur:
        paras.append(cur)
    out = []
    for p in paras:
        joined = " ".join(x.strip() for x in p).strip()
        if _DIRECTIVE_RE.match(joined):
            continue
        if re.fullmatch(r"[-\s]*", joined):
            continue
        out.append(p)
    return out


def _is_fullwidth_border(line: str) -> bool:
    runs = _DASH_RUNS_RE.findall(line)
    return len(runs) == 1 and len(runs[0]) >= 8 and line.strip() == runs[0]


def _is_boundary(line: str) -> bool:
    """Ligne de séparation de colonnes d'un tableau pandoc "grid" : suite de
    segments de tirets séparés par des espaces (ex. `  ---- --- -----`), à
    distinguer d'un texte contenant des tirets isolés (ex. "0 - Citoyens")."""
    s = line.strip()
    if not s or re.fullmatch(r"[-\s]+", s) is None:
        return False
    runs = [r for r in _DASH_RUNS_RE.findall(line) if len(r) >= 2]
    return len(runs) > 1


def _find_grid(block_lines: list[str]) -> tuple[int, int, int] | None:
    """Repère un tableau "grid" pandoc dans le bloc : bordure pleine (haut),
    ligne de séparation de colonnes, bordure pleine (bas). Renvoie leurs
    indices dans `block_lines`, ou None si le bloc n'est pas une grille."""
    top_idx = boundary_idx = bottom_idx = None
    for i, raw in enumerate(block_lines):
        if top_idx is None and _is_fullwidth_border(raw):
            top_idx = i
            continue
        if top_idx is not None and boundary_idx is None and _is_boundary(raw):
            boundary_idx = i
            continue
        if boundary_idx is not None and _is_fullwidth_border(raw):
            bottom_idx = i
            break
    if top_idx is not None and boundary_idx is not None and bottom_idx is not None:
        return top_idx, boundary_idx, bottom_idx
    return None


def _parse_entry(para_lines: list[str]) -> tuple[str, str] | None:
    """Une entrée « Label (code) », potentiellement multi-lignes (wrap),
    avec balises optionnelles `[Keep position]` etc. après le code."""
    joined = re.sub(r"\s+", " ", " ".join(x.strip() for x in para_lines)).strip()
    m = _OPTION_TRAIL_RE.match(joined)
    if not m:
        return None
    return m.group(1).strip(), m.group(2)


def _parse_columns(
    block_lines: list[str], top_idx: int, boundary_idx: int
) -> list[tuple[str, str | None]]:
    """Reconstruit le texte de chaque colonne d'en-tête d'une grille en
    découpant les lignes d'en-tête aux positions caractère données par la
    ligne de séparation de colonnes (segments de tirets = largeur/offset de
    chaque colonne dans le rendu ASCII pandoc)."""
    spans = [(m.start(), m.end()) for m in _DASH_RUNS_RE.finditer(block_lines[boundary_idx])]
    header_lines = block_lines[top_idx + 1:boundary_idx]
    col_fragments: list[list[str]] = [[] for _ in spans]
    for raw in header_lines:
        line = _GLYPH_RE.sub("", raw)
        for ci, (s, e) in enumerate(spans):
            frag = line[s:e].strip()
            if frag:
                col_fragments[ci].append(frag)
    cols = []
    for frags in col_fragments:
        joined = re.sub(r"\s+", " ", " ".join(frags)).strip()
        m = _OPTION_TRAIL_RE.match(joined)
        cols.append((m.group(1).strip(), m.group(2)) if m else (joined, None))
    return cols


def _parse_block(block_lines: list[str]) -> dict:
    """Parse un bloc de variable en {"type": "grid"|"flat", "intro": str,
    "columns"/"options": ..., "rows": ...}."""
    grid = _find_grid(block_lines)
    if grid:
        top_idx, boundary_idx, bottom_idx = grid
        intro_paras = _paragraphs(block_lines[:top_idx])
        intro = re.sub(
            r"\s+", " ", " ".join(" ".join(x.strip() for x in p) for p in intro_paras)
        ).strip()
        columns = _parse_columns(block_lines, top_idx, boundary_idx)
        row_paras = _paragraphs(block_lines[boundary_idx + 1:bottom_idx])
        rows = [r for p in row_paras if (r := _parse_entry(p))]
        return {"type": "grid", "intro": intro, "columns": columns, "rows": rows}

    paras = _paragraphs(block_lines)
    intro_paras: list[list[str]] = []
    option_paras: list[list[str]] = []
    seen_option = False
    for p in paras:
        if not seen_option and _parse_entry(p):
            seen_option = True
        (option_paras if seen_option else intro_paras).append(p)
    intro = re.sub(
        r"\s+", " ", " ".join(" ".join(x.strip() for x in p) for p in intro_paras)
    ).strip()
    options = [r for p in option_paras if (r := _parse_entry(p))]
    return {"type": "flat", "intro": intro, "options": options}


def _build_resolved_map(dta_vars: list[str]) -> dict[str, dict]:
    """Relie chaque variable .dta à son (question_text, response_options)
    en parsant le .md et en croisant avec les noms de variables réellement
    présentes dans le .dta. Voir docstring du module pour l'algorithme."""
    dta_set = {v.lower() for v in dta_vars}
    lines = _load_md_lines()
    md_blocks = _split_md_blocks(lines)

    resolved: dict[str, dict] = {}
    for header, block_list in md_blocks.items():
        for block_lines in block_list:
            parsed = _parse_block(block_lines)
            hl = header.lower()
            if parsed["type"] == "flat":
                if hl in dta_set and hl not in resolved:
                    resolved[hl] = {
                        "question_text": parsed["intro"],
                        "options": parsed["options"],
                        "source_header": header,
                    }
                else:
                    # Pattern "checkbox" multi-select à plat : chaque option
                    # de la liste devient sa propre variable .dta
                    # (header_code), valeurs observées 0/1.
                    hits = [
                        opt for opt in parsed["options"]
                        if f"{hl}_{opt[1].lower()}" in dta_set
                    ]
                    if len(hits) >= max(2, len(parsed["options"]) // 2):
                        for label, code in parsed["options"]:
                            dv = f"{hl}_{code.lower()}"
                            if dv in dta_set and dv not in resolved:
                                qtext = (
                                    f"{parsed['intro']} / {label}" if parsed["intro"] else label
                                )
                                resolved[dv] = {
                                    "question_text": qtext,
                                    "options": [("Mentionné", "1"), ("Non mentionné", "0")],
                                    "source_header": header,
                                }
            elif parsed["type"] == "grid":
                cols = [c for c in parsed["columns"] if c[1] is not None]
                for label, code in parsed["rows"]:
                    cand1 = f"{hl}_{code.lower()}"
                    cand2 = code.lower()
                    dv = cand1 if cand1 in dta_set else (cand2 if cand2 in dta_set else None)
                    if dv is None or dv in resolved:
                        continue
                    qtext = f"{parsed['intro']} / {label}" if parsed["intro"] else label
                    resolved[dv] = {
                        "question_text": qtext,
                        "options": cols,
                        "source_header": header,
                    }
    return resolved


# ---------------------------------------------------------------------------
# Nettoyage
# ---------------------------------------------------------------------------

def _clean_text(text: str) -> str:
    return re.sub(r" {2,}", " ", text).strip()


# ---------------------------------------------------------------------------
# Fonction principale
# ---------------------------------------------------------------------------

def extract() -> dict:
    """Lit le .dta pour la structure/couverture/codes observés, et le
    questionnaire .md pour le texte -- voir la docstring du module. Aucun
    accès réseau, aucun embedding -- pure extraction de structure.
    """
    df, meta = pyreadstat.read_dta(str(DTA_FILE))
    dta_vars = list(meta.column_names)

    resolved = _build_resolved_map(dta_vars)

    # Cas particuliers documentés (MANUAL_OVERRIDES) : appliqués APRÈS le
    # parsing générique, jamais à la place -- corrigent un artefact de
    # conversion précis, ne fabriquent aucun texte nouveau.
    if "qenfan2" in resolved:
        resolved["qenfan2"]["question_text"] = _QENFAN2_INTRO
    if "agenum" in resolved:
        resolved["agenum"]["options"] = list(resolved["agenum"]["options"]) + _AGENUM_EXTRA_OPTIONS
    _ageym_entry = {"question_text": _AGEYM_INTRO, "options": [], "source_header": "AGEYM"}
    resolved["ageyear_1"] = dict(_ageym_entry)
    resolved["agemonth_1"] = dict(_ageym_entry)

    questions = []
    for col in dta_vars:
        if col in EXCLUDED_VARS:
            continue

        entry = resolved.get(col.lower())
        if entry is None:
            raise RuntimeError(
                f"Variable {col!r} non couverte (ni resolved map, ni EXCLUDED_VARS)"
            )

        sociodemo_type = SOCIODEMO_VARS.get(col.lower())
        raw_label = entry["question_text"]
        if sociodemo_type and (not raw_label or fabrication_reason(col, raw_label)):
            question_text = canonical_sociodemo_text(sociodemo_type)
            if question_text is None:
                continue
        else:
            question_text = _clean_text(raw_label) if raw_label else ""
            if not question_text:
                continue

        response_options = [
            {"code": code, "label": _clean_text(label)}
            for label, code in entry["options"]
        ]

        col_lower = col.lower()
        if is_text_column(df[col]):
            var_type = "open"
        elif col_lower in CHECKBOX_VARS:
            var_type = "multiple"
        elif col_lower in SCALE_VARS:
            var_type = "scale"
        elif col_lower in CONTINUOUS_OVERRIDE:
            var_type = "continuous"
        elif response_options:
            var_type = "single"
        else:
            var_type = "continuous"

        is_sociodemo = sociodemo_type is not None

        questions.append(
            {
                "variable": col,
                "question_text": question_text,
                "response_options": response_options,
                "var_type": var_type,
                "is_sociodemo": is_sociodemo,
                "sociodemo_type": sociodemo_type,
                "concepts": [],
                "themes": [],
            }
        )

    result: dict = {
        "survey": {
            "survey_id": SURVEY_ID,
            "survey_name": SURVEY_NAME,
            "year": YEAR,
            "pollster": POLLSTER,
            "language": LANGUAGE,
            "n_respondents": len(df),
            "raw_data_file": DTA_FILE.name,
            "tags": ["electoral", "provincial", "québec", "2018", "eeq"],
        },
        "questions": questions,
    }
    return result


# ---------------------------------------------------------------------------
# Point d'entree CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    data = extract()

    validated = SurveyFile.model_validate(data)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(validated.model_dump(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    n_q = len(validated.questions)
    n_sd = sum(1 for q in validated.questions if q.is_sociodemo)
    n_with_opts = sum(1 for q in validated.questions if q.response_options)
    n_empty_text = sum(1 for q in validated.questions if not q.question_text.strip())

    print(f"Sondage   : {validated.survey.survey_id}")
    print(f"Répondants: {validated.survey.n_respondents}")
    print(f"Questions : {n_q} total, {n_with_opts} avec options de réponse")
    print(f"Socio-démo: {n_sd}")
    print(f"question_text vides : {n_empty_text}/{n_q}")
    print(f"Fichier JSON : {OUT_FILE}")

    print("\nSocio-démo flaggées :")
    for q in validated.questions:
        if q.is_sociodemo:
            print(f"  {q.variable} ({q.sociodemo_type}): {q.question_text[:80]!r}")

    print(f"\nVariables exclues ({len(EXCLUDED_VARS)}) :")
    for v in sorted(EXCLUDED_VARS):
        print(f"  {v}: {EXCLUDED_VARS[v]}")
