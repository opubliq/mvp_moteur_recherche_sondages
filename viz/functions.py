import sqlite3
import pandas as pd

def get_variable_distribution(survey_id, variable_id, db_path="surveys_bd.sqlite"):
    conn = sqlite3.connect(db_path)

    # Récupérer les valeurs de la variable
    table = f'survey_{str(survey_id).lower()}'
    query = f'SELECT "{variable_id}" FROM {table} WHERE "{variable_id}" IS NOT NULL'
    df = pd.read_sql_query(query, conn)

    # Récupérer le libellé de la variable
    label_query = """
        SELECT DISTINCT label
        FROM codebook_variables
        WHERE survey_id = ? AND variable_id = ?
        LIMIT 1
    """
    label_result = conn.execute(label_query, (survey_id, variable_id)).fetchone()
    variable_label = label_result[0] if label_result else variable_id

    # Récupérer les labels de valeur
    value_labels_query = """
        SELECT value, value_label
        FROM codebook_values
        WHERE survey_id = ? AND variable_id = ?
    """
    raw_labels = conn.execute(value_labels_query, (survey_id, variable_id)).fetchall()
    value_label_map = {str(k): v for k, v in raw_labels}

    # Compter les occurrences
    counts = df[variable_id].value_counts().sort_index()
    counts.index = counts.index.astype(str)

    def normalize_key(x):
        try:
            val = float(x)
            return str(int(val)) if val.is_integer() else str(val).rstrip('0').rstrip('.')
        except:
            return str(x)

    # Appliquer les labels
    values = [value_label_map.get(normalize_key(k), k) for k in counts.index]
    freqs = counts.tolist()

    conn.close()

    return {
        "survey_id": survey_id,
        "variable_id": variable_id,
        "label": variable_label,
        "values": values,
        "counts": freqs,
    }
