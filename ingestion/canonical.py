"""Wordings canoniques pour variables sociodémographiques universelles.

Certaines variables sociodémo (sexe, âge, scolarité…) n'ont dans le raw qu'un
libellé *dégénéré* : la chaîne se réduit au nom de variable (p.ex. le label SAV
« sexe » pour la variable `sexe`). Leur *sens* est pourtant univoque et
transversal à tous les sondages. Plutôt que de les exclure — perte d'un crosstab
sociodémo standard —, on leur attribue un `question_text` **canonique**,
versionné ici et donc auditable.

Ce n'est PAS une fabrication de question de sondage (interdite par
`CONVENTIONS.md`) : c'est l'étiquetage d'une variable démographique par son sens
standard, restreint à une whitelist explicite de `sociodemo_type`. Les *options
de réponse* restent verbatim (value labels du raw).

Le garde-fou anti-fabrication (`validate.py`) whiteliste exactement les paires
(`sociodemo_type`, `question_text` canonique) déclarées ici : un libellé
sociodémo qui ressemble à son nom de variable n'est toléré QUE s'il provient de
cette table. Un extracteur n'applique le wording canonique qu'en *dernier
recours*, lorsque le libellé raw est absent ou dégénéré ; un libellé raw riche
(question réellement posée) reste toujours verbatim.
"""

from __future__ import annotations

# `sociodemo_type` → `question_text` canonique. Les clés suivent la nomenclature
# `sociodemo_type` des extracteurs (cf. SCHEMA.md : 'age'|'gender'|'education'…).
CANONICAL_SOCIODEMO: dict[str, str] = {
    "gender": "Sexe du répondant",
    "age": "Groupe d'âge du répondant",
    "education": "Plus haut niveau de scolarité complété par le répondant",
    "income": "Revenu du ménage du répondant",
    "region": "Région de résidence du répondant",
    "language": "Langue maternelle du répondant",
    "occupation": "Occupation du répondant",
    "marital_status": "État civil du répondant",
}


def canonical_sociodemo_text(sociodemo_type: str | None) -> str | None:
    """Renvoie le wording canonique d'un `sociodemo_type`, sinon None."""
    if not sociodemo_type:
        return None
    return CANONICAL_SOCIODEMO.get(sociodemo_type)
