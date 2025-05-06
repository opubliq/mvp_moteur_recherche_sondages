# install.packages("ompr")
# install.packages("ompr.roi")
# install.packages("ROI.plugin.glpk")

library(ompr)
library(ompr.roi)
library(dplyr)
library(ROI.plugin.glpk)

# Paramètres de base
segments <- c("PP", "CS")
n_segments <- length(segments)
n_features <- 3

# Valeurs perçues pour chaque segment par feature
# Rows: segments, Cols: features
values <- matrix(c(
  1, 2, 3,  # PP
  2, 1, 2   # CS
), nrow = n_segments, byrow = TRUE)

# Seuils pour que le segment passe au premium
thresholds <- c(4, 4)

# Nombre de clients dans chaque segment
n_clients <- c(20, 100)

# Prix du plan premium par segment
prices <- c(1000, 200)

model <- MIPModel() %>%
  # x[f] = 1 si la feature f est dans le plan premium
  add_variable(x[f], f = 1:n_features, type = "binary") %>%
  # y[s] = 1 si le segment s passe au premium
  add_variable(y[s], s = 1:n_segments, type = "binary") %>%

  # Fonction objectif : revenu total
  set_objective(sum_expr(y[s] * n_clients[s] * prices[s], s = 1:n_segments), "max") %>%

  # Contraintes : un segment choisit le premium seulement si la valeur cumulée > seuil
  add_constraint(sum_expr(values[s, f] * x[f], f = 1:n_features) >= thresholds[s] * y[s], s = 1:n_segments)

# Résolution
result <- solve_model(model, with_ROI(solver = "glpk"))

# Extraction des résultats
feature_plan <- get_solution(result, x[f])
segment_choice <- get_solution(result, y[s])

cat("\n--- Plan des features ---\n")
for (i in 1:n_features) {
  cat(sprintf("Feature %d: %s\n", i, ifelse(feature_plan$value[i] == 1, "Premium", "Gratuit")))
}

cat("\n--- Choix des segments ---\n")
for (s in 1:n_segments) {
  cat(sprintf("Segment %s (%d clients): %s\n",
              segments[s], n_clients[s],
              ifelse(segment_choice$value[s] == 1, "Premium", "Gratuit")))
}

# Affichage du revenu total
revenue <- objective_value(result)
cat(sprintf("\nRevenu total projeté : %d $\n", revenue))
