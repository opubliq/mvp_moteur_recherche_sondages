# Packages ---------------------------------------------------------------
library(DBI)
library(RSQLite)

# Créer ou ouvrir la base
con <- dbConnect(RSQLite::SQLite(), "surveys_bd.sqlite")

## Créer la table de metadata
if (!dbExistsTable(con, "surveys_metadata")) {
  dbExecute(con, "
    CREATE TABLE surveys_metadata (
      survey_id TEXT PRIMARY KEY,
      title TEXT,
      source_url TEXT,
      year INTEGER,
      file_path TEXT
    );
  ")
}

## Créer la table codebook
if (!dbExistsTable(con, "codebook")) {
  dbExecute(con, "
    CREATE TABLE codebook (
      survey_id TEXT,
      variable_id TEXT,
      variable_label TEXT,
      variable_question_label TEXT,
      variable_notes TEXT,
      variable_type TEXT,
      value TEXT,
      value_label TEXT,
      PRIMARY KEY (survey_id, variable_id, value)
    );
  ")
}
