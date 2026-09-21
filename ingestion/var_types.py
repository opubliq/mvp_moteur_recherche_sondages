"""Dérivation de `var_type` à partir des DONNÉES et des value labels du raw.

SOURCE UNIQUE de la règle « quel est le type d'une question fermée ? » pour les
extracteurs qui lisent un fichier statistique étiqueté (SAV/DTA) — d'abord les
quatre CES (`ces_2019_online`, `ces_2019_phone`, `ces_2021`, `ces_2025`).

Contexte (bug corrigé le 2026-09-21)
------------------------------------
Les extracteurs CES décidaient le type dans cet ordre :

    if is_text_column(df[col]): var_type = "open"
    elif "slider|scale|rating" in label: var_type = "scale"
    elif raw_opts: var_type = "single"
    else: var_type = "continuous"

Le premier test l'emportait sur la présence de value labels. Or pyreadstat rend
en dtype `object` les colonnes d'entiers comportant des manquants (int + NaN) :
des centaines de questions FERMÉES, value labels à l'appui, tombaient en `open`.
La règle ci-dessous consulte donc les options AVANT de conclure, et ne retient
`open` que pour une colonne qui porte réellement du texte.

Règle (dans l'ordre, documentée et testée) :

1. colonne texte (`is_text_column`)                      → ``open``
2. wording annonçant une échelle (slider/scale/rating)   → ``scale``
3. aucune option déclarée                                → ``continuous``
4. options déclarées mais AUCUNE substantielle : seuls
   des codes de non-réponse (codes négatifs, convention
   SPSS/Stata -9 Don't know / -8 Refused / -7 Skipped)   → ``continuous``
   (la valeur numérique elle-même est la réponse : thermomètres 0-100,
   année d'immigration… seuls les manquants sont étiquetés)
5. item d'une batterie à choix multiples : une seule
   option substantielle, ou codes {0,1} étiquetés
   « Selected / Not Selected » (« Mentionné / Non
   mentionné »)                                          → ``multiple``
6. échelle numérique : 7 à 21 codes substantiels entiers
   CONTIGUS dont ≥ 60 % des libellés sont des échelons
   nus (« 4 ») ou ancrés (« 0 - Strongly dislike »)      → ``scale``
7. sinon                                                 → ``single``

Aucune de ces branches n'INVENTE de libellé : elles ne font que classer des
codes et des libellés déjà lus dans le raw (cf. `ingestion/CONVENTIONS.md`).
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd

from ingestion.open_text import is_text_column

__all__ = ["derive_var_type", "is_special_code", "substantive_options"]

# Mots du wording qui annoncent une échelle (heuristique historique, conservée).
SCALE_WORDING = ("slider", "scale", "rating")

# Bornes d'une échelle de notation plausible (0-10, 0-20, 1-7…). Au-delà, une
# liste de codes numériques est un référentiel (année, pays), pas une échelle.
SCALE_MIN_POINTS = 7
SCALE_MAX_POINTS = 21

# Part minimale d'échelons « nus » ou « ancrés » parmi les libellés substantiels.
SCALE_MIN_RUNG_SHARE = 0.60

# Vocabulaire des batteries à choix multiples (un item = une colonne binaire).
_SELECTED_RE = re.compile(r"\b(not\s+)?selected\b|\bnon\s+mentionn|\bmentionn", re.IGNORECASE)

# Échelon ancré : « 0 - Strongly dislike party », « 10 – Right », « 5 : beaucoup ».
_ANCHORED_RUNG_RE = re.compile(r"^-?\d+\s*[-–—:]\s*\S")


def _as_number(code: Any) -> float | None:
    """Code lu comme un nombre, sinon None (les codes texte existent au corpus)."""
    try:
        return float(code)
    except (TypeError, ValueError):
        return None


def is_special_code(code: Any) -> bool:
    """True si le code est une convention de non-réponse (code négatif).

    SPSS/Stata encodent classiquement les manquants en négatif (-9 « Don't
    know », -8 « Refused », -7 « Skipped »). Un code négatif n'est donc jamais
    une modalité substantielle. Les DK/PNR encodés en POSITIF (p.ex. 7 =
    « Don't know » dans le CES 2021) restent, eux, des modalités du catalogue :
    on ne devine pas leur nature à partir du libellé.
    """
    num = _as_number(code)
    return num is not None and num < 0


def substantive_options(
    response_options: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Options hors codes de non-réponse négatifs."""
    return [o for o in response_options if not is_special_code(o["code"])]


def _label_body(code: Any, label: str) -> str:
    """Libellé débarrassé du préfixe de code que porte parfois le raw.

    Les value labels du CES 2019 (phone) sont « (0) 0 - Strongly dislike », ceux
    du CES 2025 « 1. Liberal Party ». On retire ce préfixe redondant AVANT de
    juger de la nature du libellé — sans jamais réécrire le libellé indexé.
    """
    body = label.strip()
    for prefix in (f"({code})", f"{code}.", f"{code})", f"[{code}]"):
        if body.startswith(prefix):
            return body[len(prefix) :].strip()
    return body


def _is_rung(code: Any, label: str) -> bool:
    """True si le libellé est un échelon d'échelle : « 4 » ou « 0 - Left »."""
    body = _label_body(code, label)
    if not body:
        return False
    if _as_number(body) is not None:
        return True
    return bool(_ANCHORED_RUNG_RE.match(body))


def _is_multiple_item(options: list[dict[str, Any]]) -> bool:
    """True si la colonne est UN item d'une batterie à choix multiples.

    Deux formes au corpus :
      * une seule modalité substantielle étiquetée (le choix coché ; non coché
        = manquant) — p.ex. `cps21_not_vote_for_1` → « Liberal Party » ;
      * deux modalités 0/1 « Not Selected / Selected » (« Non mentionné /
        Mentionné ») — p.ex. `q66_1` du CES 2019 téléphone, `q71_*` d'eeq_2018.
    """
    if len(options) == 1:
        return True
    if len(options) == 2:
        codes = {_as_number(o["code"]) for o in options}
        if codes == {0.0, 1.0} and all(_SELECTED_RE.search(str(o["label"])) for o in options):
            return True
    return False


def _is_numeric_scale(options: list[dict[str, Any]]) -> bool:
    """True si les modalités substantielles forment une échelle de notation."""
    if not (SCALE_MIN_POINTS <= len(options) <= SCALE_MAX_POINTS):
        return False
    nums = [_as_number(o["code"]) for o in options]
    if any(n is None or n != int(n) for n in nums):
        return False
    ints = sorted(int(n) for n in nums)  # type: ignore[arg-type]
    if ints != list(range(ints[0], ints[0] + len(ints))):
        return False
    rungs = sum(_is_rung(o["code"], str(o["label"])) for o in options)
    return rungs / len(options) >= SCALE_MIN_RUNG_SHARE


def derive_var_type(
    series: pd.Series,
    response_options: list[dict[str, Any]],
    raw_label: str = "",
) -> str:
    """Type d'une question, d'après ses données et ses value labels.

    `series` : la colonne brute ; `response_options` : les options DÉJÀ lues du
    raw (`[{"code": …, "label": …}, …]`, ordonnées) ; `raw_label` : le variable
    label brut, consulté pour l'heuristique d'échelle historique.
    """
    if is_text_column(series):
        return "open"
    if any(k in raw_label.lower() for k in SCALE_WORDING):
        return "scale"
    if not response_options:
        return "continuous"

    options = substantive_options(response_options)
    if not options:
        return "continuous"
    if _is_multiple_item(options):
        return "multiple"
    if _is_numeric_scale(options):
        return "scale"
    return "single"
