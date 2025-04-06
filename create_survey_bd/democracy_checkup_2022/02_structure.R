# Packages ---------------------------------------------------------------
library(dplyr)

# Data -------------------------------------------------------------------

df_raw <- haven::read_sav(
  "create_survey_bd/democracy_checkup_2022/data.sav",
  encoding = "latin1"
)

df_clean <- data.frame(
  id = 1:nrow(df_raw)
)

# Connect to SQL BD ------------------------------------------------------

con <- DBI::dbConnect(RSQLite::SQLite(), "surveys_bd.sqlite")

# Federal Government -------------------------------------------------------------

attributes(df_raw$dc22_confidence_inst_2)
table(df_raw$dc22_confidence_inst_2)
confidence_inst_2 <- ifelse(df_raw$dc22_confidence_inst_2 == -99, NA, df_raw$dc22_confidence_inst_2)
df_clean$confidence_federal_government <- sondr::clean_likert_numeric_vector(confidence_inst_2, revert = T)
table(df_clean$confidence_federal_government)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "confidence_federal_government",
  variable_label = "Confidence in the federal government",
  variable_question_label = attributes(df_raw$dc22_confidence_inst_2)$label,
  variable_notes = "None",
  variable_type = "likert",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_confidence_inst_2)$labels),
    nm = rev(names(table(df_clean$confidence_federal_government)))
  )
)

# Provincial Government --------------------------------------------------

attributes(df_raw$dc22_confidence_inst_4)
table(df_raw$dc22_confidence_inst_4)
confidence_inst_4 <- ifelse(df_raw$dc22_confidence_inst_4 == -99, NA, df_raw$dc22_confidence_inst_4)
df_clean$confidence_provincial_government <- sondr::clean_likert_numeric_vector(confidence_inst_4, revert = T)
table(df_clean$confidence_provincial_government)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "confidence_provincial_government",
  variable_label = "Confidence in the provincial government",
  variable_question_label = attributes(df_raw$dc22_confidence_inst_4)$label,
  variable_notes = "None",
  variable_type = "likert",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_confidence_inst_4)$labels),
    nm = rev(names(table(df_clean$confidence_provincial_government)))
  )
)

# Media -----------------------------------------------------------------

attributes(df_raw$dc22_confidence_inst_3)
table(df_raw$dc22_confidence_inst_3)
confidence_inst_3 <- ifelse(df_raw$dc22_confidence_inst_3 == -99, NA, df_raw$dc22_confidence_inst_3)
df_clean$confidence_media <- sondr::clean_likert_numeric_vector(confidence_inst_3, revert = T)
table(df_clean$confidence_media)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "confidence_media",
  variable_label = "Confidence in the media",
  variable_question_label = attributes(df_raw$dc22_confidence_inst_3)$label,
  variable_notes = "None",
  variable_type = "likert",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_confidence_inst_3)$labels),
    nm = rev(names(table(df_clean$confidence_media)))
  )
)

# Does not care what I think ---------------------------------------------

attributes(df_raw$dc22_pos_govt_care)
table(df_raw$dc22_pos_govt_care)
pos_govt_care <- ifelse(df_raw$dc22_pos_govt_care == -99, NA, df_raw$dc22_pos_govt_care)
df_clean$govt_does_not_care <- sondr::clean_likert_numeric_vector(pos_govt_care, revert = T)
table(df_clean$govt_does_not_care)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "govt_does_not_care",
  variable_label = "Government does not care what I think",
  variable_question_label = attributes(df_raw$dc22_pos_govt_care)$label,
  variable_notes = "None",
  variable_type = "likert",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_pos_govt_care)$labels),
    nm = rev(names(table(df_clean$govt_does_not_care)))
  )
)

# Climate change happening ---------------------------------------------------------

attributes(df_raw$dc22_cc1)
table(df_raw$dc22_cc1)
df_clean$climate_change_happening <- NA
df_clean$climate_change_happening[df_raw$dc22_cc1 == 1] <- 1
df_clean$climate_change_happening[df_raw$dc22_cc1 == 2] <- 0
table(df_clean$climate_change_happening)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "climate_change_happening",
  variable_label = "Climate change is happening",
  variable_question_label = attributes(df_raw$dc22_cc1)$label,
  variable_notes = "None",
  variable_type = "binary",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_cc1)$labels),
    nm = c("1", "0")
  )
)


# Immigration ------------------------------------------------------------

attributes(df_raw$dc22_imm_level)
table(df_raw$dc22_imm_level)
df_clean$more_immigrants <- NA
df_clean$more_immigrants[df_raw$dc22_imm_level == 1] <- 1
df_clean$more_immigrants[df_raw$dc22_imm_level == 3] <- 0.5
df_clean$more_immigrants[df_raw$dc22_imm_level == 2] <- 0
table(df_clean$more_immigrants)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "more_immigrants",
  variable_label = "More, less or same number of immigrants",
  variable_question_label = attributes(df_raw$dc22_imm_level)$label,
  variable_notes = "None",
  variable_type = "categorical",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_imm_level)$labels)[c(1,3,2)],
    nm = c("1", "0.5", "0")
  )
)

# Refugee level ----------------------------------------------------------

attributes(df_raw$dc22_refugee_level)
table(df_raw$dc22_refugee_level)
df_clean$more_refugees <- NA
df_clean$more_refugees[df_raw$dc22_refugee_level == 1] <- 1
df_clean$more_refugees[df_raw$dc22_refugee_level == 3] <- 0.5
df_clean$more_refugees[df_raw$dc22_refugee_level == 2] <- 0
table(df_clean$more_refugees)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "more_refugees",
  variable_label = "More, less or same number of refugees",
  variable_question_label = attributes(df_raw$dc22_refugee_level)$label,
  variable_notes = "None",
  variable_type = "categorical",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_refugee_level)$labels)[c(1,3,2)],
    nm = c("1", "0.5", "0")
  )
)


# COVID risk -------------------------------------------------------------

attributes(df_raw$dc22_covid_risk)
table(df_raw$dc22_covid_risk)
covid_risk <- ifelse(df_raw$dc22_covid_risk == -99, NA, df_raw$dc22_covid_risk)
df_clean$worried_covid <- sondr::clean_likert_numeric_vector(covid_risk, revert = F)
table(df_clean$worried_covid)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "democracy_checkup_2022",
  variable_id = "worried_covid",
  variable_label = "Worried about COVID-19",
  variable_question_label = attributes(df_raw$dc22_covid_risk)$label,
  variable_notes = "None",
  variable_type = "likert",
  variable_values = setNames(
    object = names(attributes(df_raw$dc22_covid_risk)$labels),
    nm = names(table(df_clean$worried_covid))
  )
)

# Save into bd as table -----------------------------------------------------------

survey_id <- "democracy_checkup"
table_name <- paste0("survey_", survey_id)

# Écrit le df_clean dans la base
DBI::dbWriteTable(con, table_name, df_clean, overwrite = TRUE)

# Save into metadata table -----------------------------------------------

# Ajouter ou mettre à jour l'entrée
survey_metadata <- data.frame(
  survey_id = survey_id,
  title = "Democracy Checkup 2022",
  source_url = "https://example.com/democracycheckup2022",
  year = 2022,
  file_path = "create_survey_bd/democracy_checkup_2022/data.sav"
)

DBI::dbWriteTable(con, "surveys_metadata", survey_metadata, append = TRUE, row.names = FALSE)
