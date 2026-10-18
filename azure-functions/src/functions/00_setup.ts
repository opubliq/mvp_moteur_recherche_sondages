/**
 * Configuration globale du worker Node — chargé EN PREMIER (le glob `main`
 * trie par nom : `00_setup` < `agent`, préfixe chiffré pour un tri sûr). Sans `enableHttpStream`, l'hôte met la
 * réponse SSE de /agent en tampon et le client reçoit tous les événements
 * d'un coup à la fin (étapes « en direct » invisibles en prod).
 */
import { app } from "@azure/functions";

app.setup({ enableHttpStream: true });
