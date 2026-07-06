# ingestion/enrichment — un module par sondage, produit par un subagent LLM.
#
# Chaque module `<survey_id>.py` expose deux dicts figés (données, pas de code) :
#
#   SURVEY = {
#       "description": "1-2 phrases sur ce que couvre le sondage.",
#       "month": 10,            # 1-12, ou None si non déterminable
#   }
#
#   QUESTIONS = {
#       "<variable>": {
#           "display_label": "Titre lisible et autonome de la question",
#           "concepts": ["confiance", "gouvernement"],
#           "themes": ["démocratie"],
#       },
#       ...
#   }
#
# Ces champs sont « mous » (authorés par le LLM) : ils N'écrasent JAMAIS les
# champs verbatim du raw (question_text, response_options, variable). Le merge
# déterministe est fait par ingestion/enrich.py::apply_enrichment.
