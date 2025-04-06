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

## Créer la table codebook_variables
if (!dbExistsTable(con, "codebook_variables")) {
  dbExecute(con, "
    CREATE TABLE codebook_variables (
      survey_id TEXT,
      variable_id TEXT,
      label TEXT,
      question_label TEXT,
      notes TEXT,
      type TEXT,
      PRIMARY KEY (survey_id, variable_id)
    );
  ")
}

## Créer la table codebook_values
if (!dbExistsTable(con, "codebook_values")) {
  dbExecute(con, "
    CREATE TABLE codebook_values (
      survey_id TEXT,
      variable_id TEXT,
      value TEXT,
      value_label TEXT,
      PRIMARY KEY (survey_id, variable_id, value)
    );
  ")
}
