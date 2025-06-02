BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "surveys_metadata" (
	"survey_id"	TEXT,
	"title"	TEXT,
	"source_url"	TEXT,
	"year"	INTEGER,
	"file_path"	TEXT,
	PRIMARY KEY("survey_id")
);
CREATE TABLE IF NOT EXISTS "codebook_variables" (
	"survey_id"	TEXT,
	"variable_id"	TEXT,
	"label"	TEXT,
	"question_label"	TEXT,
	"notes"	TEXT,
	"type"	TEXT,
	PRIMARY KEY("survey_id","variable_id")
);
CREATE TABLE IF NOT EXISTS "codebook_values" (
	"survey_id"	TEXT,
	"variable_id"	TEXT,
	"value"	TEXT,
	"value_label"	TEXT,
	PRIMARY KEY("survey_id","variable_id","value")
);
CREATE TABLE IF NOT EXISTS "survey_democracy_checkup_2022" (
	"id"	INTEGER,
	"confidence_federal_government"	REAL,
	"confidence_provincial_government"	REAL,
	"confidence_media"	REAL,
	"govt_does_not_care"	REAL,
	"climate_change_happening"	REAL,
	"more_immigrants"	REAL,
	"more_refugees"	REAL,
	"worried_covid"	REAL
);
CREATE TABLE IF NOT EXISTS "survey_tides_2022" (
	"id"	INTEGER,
	"confidence_federal_government"	REAL,
	"confidence_provincial_government"	REAL,
	"federal_govt_competent"	REAL,
	"govt_does_not_care"	REAL,
	"support_carbon_tax"	REAL,
	"trust_fed_govt_climate"	REAL,
	"support_465k_immigrants"	REAL,
	"trust_fed_govt_imm"	REAL,
	"support_mask_mandate"	REAL,
	"trust_fed_govt_covid"	REAL
);
COMMIT;