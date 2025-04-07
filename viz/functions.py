import sqlite3
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

def plot_variables_from_results(df_matches, db_path="surveys_bd.sqlite"):
    conn = sqlite3.connect(db_path)
    cols = st.columns(len(df_matches))

    for i, (_, row) in enumerate(df_matches.iterrows()):
        survey_id = row["survey_id"]
        variable = row["variable_id"]
        table_name = f"survey_{survey_id.lower()}"

        query = f"SELECT {variable} FROM {table_name} WHERE {variable} IS NOT NULL"

        try:
            df = pd.read_sql_query(query, conn)
        except Exception as e:
            cols[i].error(f"{survey_id}.{variable} : {e}")
            continue

        counts = df[variable].value_counts().sort_index()
        fig, ax = plt.subplots(figsize=(5, 4))
        counts.plot(kind="bar", ax=ax)
        ax.set_title(f"{survey_id}\n{variable}", fontsize=10)
        ax.set_xlabel("")
        ax.set_ylabel("")
        fig.tight_layout()
        cols[i].pyplot(fig)

    conn.close()

