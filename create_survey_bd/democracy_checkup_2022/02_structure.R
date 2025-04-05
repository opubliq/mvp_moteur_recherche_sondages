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

# Federal Government -------------------------------------------------------------

attributes(df_raw$dc22_confidence_inst_2)
table(df_raw$dc22_confidence_inst_2)
confidence_inst_2 <- ifelse(df_raw$dc22_confidence_inst_2 == -99, NA, df_raw$dc22_confidence_inst_2)
df_clean$confidence_federal_government <- sondr::clean_likert_numeric_vector(confidence_inst_2, revert = T)
table(df_clean$confidence_federal_government)

# Provincial Government --------------------------------------------------

attributes(df_raw$dc22_confidence_inst_4)
table(df_raw$dc22_confidence_inst_4)
confidence_inst_4 <- ifelse(df_raw$dc22_confidence_inst_4 == -99, NA, df_raw$dc22_confidence_inst_4)
df_clean$confidence_provincial_government <- sondr::clean_likert_numeric_vector(confidence_inst_4, revert = T)
table(df_clean$confidence_provincial_government)

# Media -----------------------------------------------------------------

attributes(df_raw$dc22_confidence_inst_3)
table(df_raw$dc22_confidence_inst_3)
confidence_inst_3 <- ifelse(df_raw$dc22_confidence_inst_3 == -99, NA, df_raw$dc22_confidence_inst_3)
df_clean$confidence_media <- sondr::clean_likert_numeric_vector(confidence_inst_3, revert = T)
table(df_clean$confidence_media)

# Does not care what I think ---------------------------------------------

attributes(df_raw$dc22_pos_govt_care)
table(df_raw$dc22_pos_govt_care)
pos_govt_care <- ifelse(df_raw$dc22_pos_govt_care == -99, NA, df_raw$dc22_pos_govt_care)
df_clean$govt_does_not_care <- sondr::clean_likert_numeric_vector(pos_govt_care, revert = T)
table(df_clean$govt_does_not_care)

# Climate change happening ---------------------------------------------------------

attributes(df_raw$dc22_cc1)
table(df_raw$dc22_cc1)
df_clean$climate_change_happening <- NA
df_clean$climate_change_happening[df_raw$dc22_cc1 == 1] <- 1
df_clean$climate_change_happening[df_raw$dc22_cc1 == 2] <- 0
table(df_clean$climate_change_happening)


# Immigration ------------------------------------------------------------

attributes(df_raw$dc22_imm_level)
table(df_raw$dc22_imm_level)
df_clean$more_immigrants <- NA
df_clean$more_immigrants[df_raw$dc22_imm_level == 1] <- 1
df_clean$more_immigrants[df_raw$dc22_imm_level == 3] <- 0.5
df_clean$more_immigrants[df_raw$dc22_imm_level == 2] <- 0
table(df_clean$more_immigrants)

attributes(df_raw$dc22_refugee_level)
table(df_raw$dc22_refugee_level)
df_clean$more_refugees <- NA
df_clean$more_refugees[df_raw$dc22_refugee_level == 1] <- 1
df_clean$more_refugees[df_raw$dc22_refugee_level == 3] <- 0.5
df_clean$more_refugees[df_raw$dc22_refugee_level == 2] <- 0
table(df_clean$more_refugees)


# COVID risk -------------------------------------------------------------

attributes(df_raw$dc22_covid_risk)
table(df_raw$dc22_covid_risk)
covid_risk <- ifelse(df_raw$dc22_covid_risk == -99, NA, df_raw$dc22_covid_risk)
df_clean$worried_covid <- sondr::clean_likert_numeric_vector(covid_risk, revert = T)
table(df_clean$worried_covid)

saveRDS(df_clean, "create_survey_bd/democracy_checkup_2022/data_clean.rds")
