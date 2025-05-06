# Gabarit simplifié : un segment, trois features, trois plans, hiérarchie stricte de features + coût marginal

library(purrr)
library(dplyr)
library(tidyr)
library(tibble)
library(stringr)

# --- Hypothèses du segment unique ---
budget <- 1000
sensibilite_features <- c(Export = 2, Rapport = 3, Analyse = 4)
taille <- 100  # taille arbitraire de la population

# --- Features et Plans ---
features <- c("Export", "Rapport", "Analyse")
plans <- c("Gratuit", "Standard", "Premium")
feature_costs <- c(Export = 1.8, Rapport = 1.5, Analyse = 2.75)  # coût marginal par utilisateur

# --- Fonction de conversion douce ---
conversion_proba <- function(valeur, prix, budget, k = 1.5) {
  1 / (1 + exp(-k * ((valeur - prix) / budget)))
}

# --- Fonction de revenu total donné une config ---
compute_revenue <- function(feature_assignment, prix) {
  plan_features <- list(Gratuit = character(), Standard = character(), Premium = character())

  for (i in seq_along(features)) {
    f <- features[i]
    p <- feature_assignment[i]
    plan_features[[plans[p]]] <- c(plan_features[[plans[p]]], f)
    if (p >= 2) plan_features[["Standard"]] <- c(plan_features[["Standard"]], f)
    if (p >= 3) plan_features[["Gratuit"]] <- c(plan_features[["Gratuit"]], f)
  }

  revenu_total <- 0
  cout_total <- 0

  for (plan in plans) {
    if (prix[plan] > 0) {
      ftrs <- unique(plan_features[[plan]])
      valeur <- sum(sensibilite_features[ftrs])
      proba <- conversion_proba(valeur, prix[plan], budget)
      revenu_total <- revenu_total + proba * prix[plan] * taille
      cout_total <- cout_total + proba * sum(feature_costs[ftrs]) * taille
    }
  }

  return(revenu_total - cout_total)
}

# --- Génération d'une population initiale ---
gen_individu <- function() {
  feature_assignment <- sample(1:3, length(features), replace = TRUE)
  prix <- c(Gratuit = 0, Standard = sample(seq(100, 1000, by = 100), 1), Premium = sample(seq(200, 2000, by = 100), 1))
  while (prix["Premium"] <= prix["Standard"]) prix["Premium"] <- sample(seq(200, 2000, by = 100), 1)
  list(assign = feature_assignment, prix = prix)
}

# --- Mutation ---
mutate_individu <- function(ind) {
  f <- sample(1:length(features), 1)
  ind$assign[f] <- sample(1:3, 1)
  if (runif(1) < 0.5) {
    ind$prix["Standard"] <- sample(seq(100, 1000, by = 100), 1)
    ind$prix["Premium"] <- sample(seq(200, 2000, by = 100), 1)
    while (ind$prix["Premium"] <= ind$prix["Standard"]) ind$prix["Premium"] <- sample(seq(200, 2000, by = 100), 1)
  }
  ind
}

# --- Génétique simplifiée ---
population_size <- 75
generations <- 15
population <- replicate(population_size, gen_individu(), simplify = FALSE)

for (g in 1:generations) {
  scored <- map_dfr(population, function(ind) {
    revenu <- compute_revenue(ind$assign, ind$prix)
    tibble(
      revenu = revenu,
      prix_Standard = ind$prix["Standard"],
      prix_Premium = ind$prix["Premium"],
      Export_plan = ind$assign[1],
      Rapport_plan = ind$assign[2],
      Analyse_plan = ind$assign[3]
    )
  })
  top <- scored %>% arrange(desc(revenu)) %>% slice(1:10)
  print(paste("Génération", g, ": meilleur revenu net =", round(top$revenu[1])))
  elite <- population[order(map_dbl(population, ~ compute_revenue(.x$assign, .x$prix)), decreasing = TRUE)][1:10]
  children <- replicate(population_size - 10, mutate_individu(sample(elite, 1)[[1]]), simplify = FALSE)
  population <- c(elite, children)
}

# --- Résultats finaux ---
final_scores <- map_dfr(population, function(ind) {
  revenu <- compute_revenue(ind$assign, ind$prix)
  tibble(
    revenu = revenu,
    prix_Standard = ind$prix["Standard"],
    prix_Premium = ind$prix["Premium"],
    Export_plan = ind$assign[1],
    Rapport_plan = ind$assign[2],
    Analyse_plan = ind$assign[3]
  )
}) %>% arrange(desc(revenu))

print("\n--- Top 5 configurations par algorithme génétique (un segment, hiérarchie de features) ---")
print(head(final_scores, 5))
