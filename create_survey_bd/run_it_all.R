source("create_survey_bd/init_bd.R")

lapply(dir("create_survey_bd", recursive = TRUE, full.names = TRUE), function(x) if (basename(x) == "02_structure.R") source(x))
