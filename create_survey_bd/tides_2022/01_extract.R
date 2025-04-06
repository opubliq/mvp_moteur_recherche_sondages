url_file <- "https://epe.lac-bac.gc.ca/100/200/301/pwgsc-tpsgc/por-ef/privy_council/2024/069-22-e/data-tables-wave-1/068-22-wave1-data.csv"

download.file(url_file, destfile = "create_survey_bd/tides_2022/data.csv", mode = "wb")

url_file <- "https://epe.lac-bac.gc.ca/100/200/301/pwgsc-tpsgc/por-ef/privy_council/2024/069-22-e/data-tables-wave-1/068-22-wave1-data-dictionary.xlsx"

download.file(url_file, destfile = "create_survey_bd/tides_2022/codebook.xlsx", mode = "wb")
