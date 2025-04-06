# Packages ---------------------------------------------------------------
library(dplyr)

# Data -------------------------------------------------------------------

df_raw <- read.csv(
  "create_survey_bd/tides_2022/data.csv"
)

df_clean <- data.frame(
  id = 1:nrow(df_raw)
)

# Connect to SQL BD ------------------------------------------------------

con <- DBI::dbConnect(RSQLite::SQLite(), "surveys_bd.sqlite")

# Trust Federal government -----------------------------------------------
table(df_raw$TRUST_GOV_CAN)
df_clean$confidence_federal_government <- sondr::clean_likert_numeric_vector(df_raw$TRUST_GOV_CAN, revert = F)
table(df_clean$confidence_federal_government)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "confidence_federal_government",
  variable_label = "Confidence in the federal government",
  variable_question_label = "To what extent do you trust or distrust the Government of Canada?",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly distrust",
    "0.25" = "Somewhat distrust",
    "0.5" = "Neither trust nor distrust",
    "0.75" = "Somewhat trust",
    "1" = "Strongly trust"
  )
)

# Trust Provincial government -----------------------------------------------
table(df_raw$TRUST_GOV_PROVTERR)
df_clean$confidence_provincial_government <- sondr::clean_likert_numeric_vector(df_raw$TRUST_GOV_PROVTERR, revert = F)
table(df_clean$confidence_provincial_government)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "confidence_provincial_government",
  variable_label = "Confidence in the provincial government",
  variable_question_label = "To what extent do you trust or distrust your provincial/territorial government?",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly distrust",
    "0.25" = "Somewhat distrust",
    "0.5" = "Neither trust nor distrust",
    "0.75" = "Somewhat trust",
    "1" = "Strongly trust"
  )
)

# Fed gov is competent ---------------------------------------------------
table(df_raw$TRUST_FACET_GC_COMPETENT)
df_clean$federal_govt_competent <- sondr::clean_likert_numeric_vector(df_raw$TRUST_FACET_GC_COMPETENT, revert = F)
table(df_clean$federal_govt_competent)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "federal_govt_competent",
  variable_label = "Federal government is competent",
  variable_question_label = "The federal government is competent.",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly disagree",
    "0.25" = "Somewhat disagree",
    "0.5" = "Neither agree nor disagree",
    "0.75" = "Somewhat agree",
    "1" = "Strongly agree"
  )
)

# Fed government does not care what ordinary people think ------------------------------
table(df_raw$TRUST_FACET_GC_CARE)
df_clean$govt_does_not_care <- sondr::clean_likert_numeric_vector(df_raw$TRUST_FACET_GC_CARE, revert = F)
table(df_clean$govt_does_not_care)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "govt_does_not_care",
  variable_label = "Government does not care what ordinary people think",
  variable_question_label = "The federal government listens to what ordinary people think.",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly disagree",
    "0.25" = "Somewhat disagree",
    "0.5" = "Neither agree nor disagree",
    "0.75" = "Somewhat agree",
    "1" = "Strongly agree"
  )
)

# Support carbon tax -----------------------------------------------------
table(df_raw$POLICY_CLIM_CARBONPRICE)
df_clean$support_carbon_tax <- sondr::clean_likert_numeric_vector(df_raw$POLICY_CLIM_CARBONPRICE, revert = F)
table(df_clean$support_carbon_tax)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "support_carbon_tax",
  variable_label = "Support for carbon tax",
  variable_question_label = "How much do you support or oppose the following environmental policy: Setting a national price on carbon pollution (sometimes referred to as a 'carbon tax') to limit further climate change",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly oppose",
    "0.25" = "Somewhat oppose",
    "0.5" = "Neither support nor oppose",
    "0.75" = "Somewhat support",
    "1" = "Strongly support"
  )
)

# Trust government of canada for climate change --------------------------
table(df_raw$TRUST_GOC_CLIM)
df_clean$trust_fed_govt_climate <- sondr::clean_likert_numeric_vector(df_raw$TRUST_GOC_CLIM, revert = F)
table(df_clean$trust_fed_govt_climate)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "trust_fed_govt_climate",
  variable_label = "Trust in federal government regarding climate change",
  variable_question_label = "To what extent do you trust or distrust the Government of Canada to make decisions about climate change that are in the best interest of Canada?",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly distrust",
    "0.25" = "Somewhat distrust",
    "0.5" = "Neither trust nor distrust",
    "0.75" = "Somewhat trust",
    "1" = "Strongly trust"
  )
)

# Support 465k immigrants ------------------------------------------------
table(df_raw$POLICY_IMM_NEWIMM)
df_clean$support_465k_immigrants <- sondr::clean_likert_numeric_vector(df_raw$POLICY_IMM_NEWIMM, revert = F)
table(df_clean$support_465k_immigrants)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "support_465k_immigrants",
  variable_label = "Support for 465,000 new immigrants in 2023",
  variable_question_label = "How much do you support or oppose the following immigration-related policy: Admit 465,000 new permanent residents in Canada in 2023 (405,000 were admitted in 2021)",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly oppose",
    "0.25" = "Somewhat oppose",
    "0.5" = "Neither oppose nor support",
    "0.75" = "Somewhat support",
    "1" = "Strongly support"
  )
)

# Trust govt of canada for immigration -----------------------------------
table(df_raw$TRUST_GOC_IMM)
df_clean$trust_fed_govt_imm <- sondr::clean_likert_numeric_vector(df_raw$TRUST_GOC_IMM, revert = F)
table(df_clean$trust_fed_govt_imm)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "trust_fed_govt_imm",
  variable_label = "Trust in federal government regarding immigration",
  variable_question_label = "To what extent do you trust the Government of Canada on immigration issues?",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly distrust",
    "0.25" = "Somewhat distrust",
    "0.5" = "Neither trust nor distrust",
    "0.75" = "Somewhat trust",
    "1" = "Strongly trust"
  )
)

# Wear mask for COVID ----------------------------------------------------
table(df_raw$POLICY_COVIDA)
df_clean$support_mask_mandate <- sondr::clean_likert_numeric_vector(df_raw$POLICY_COVIDA, revert = F)
table(df_clean$support_mask_mandate)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "support_mask_mandate",
  variable_label = "Support for mask mandate during COVID",
  variable_question_label = "How much do you support or oppose the following health-related policy: A requirement to wear a mask in indoor public settings if there is another COVID-19 outbreak.",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly oppose",
    "0.25" = "Somewhat oppose",
    "0.5" = "Neither oppose nor support",
    "0.75" = "Somewhat support",
    "1" = "Strongly support"
  )
)

# Trust govt of canada for covid -----------------------------------------
table(df_raw$TRUST_GOC_COVID)
df_clean$trust_fed_govt_covid <- sondr::clean_likert_numeric_vector(df_raw$TRUST_GOC_COVID, revert = F)
table(df_clean$trust_fed_govt_covid)

opubliqr::append_to_codebook(
  con = con,
  survey_id = "tides_2022",
  variable_id = "trust_fed_govt_covid",
  variable_label = "Trust in federal government regarding COVID-19",
  variable_question_label = "To what extent do you trust or distrust the Government of Canada to make decisions about COVID-19 that are in the best interest of Canada?",
  variable_notes = "None",
  variable_type = "likert",
  variable_values = c(
    "0" = "Strongly distrust",
    "0.25" = "Somewhat distrust",
    "0.5" = "Neither trust nor distrust",
    "0.75" = "Somewhat trust",
    "1" = "Strongly trust"
  )
)


# Save into bd as table -----------------------------------------------------------

survey_id <- "tides_2022"
table_name <- paste0("survey_", survey_id)

# Écrit le df_clean dans la base
DBI::dbWriteTable(con, table_name, df_clean, overwrite = TRUE)

# Save into metadata table -----------------------------------------------

# Ajouter ou mettre à jour l'entrée
survey_metadata <- data.frame(
  survey_id = survey_id,
  title = "Tides 2022",
  source_url = "https://example.com/tides2022",
  year = 2022,
  file_path = "create_survey_bd/tides_2022/data.csv"
)

DBI::dbWriteTable(con, "surveys_metadata", survey_metadata, append = TRUE, row.names = FALSE)
