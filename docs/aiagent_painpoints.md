1. L'agent demande trop de clarifications tout le temps.
    - quel sondage?
    - quel analyse, quelle méthode?
    - quelle question?

À moins que c'est specifiquement demandé, il devrait se sentir ok d'aller de l'avant, de faire qqchose et de montrer le resultat.

Desfois il repose les memes questions, ou sur des details benins qui font juste ralentir pour rien.

Et genre chaque fois je dis "go lance le scan" il revient avec des clarifications.

Es-tu capable d'aller voir l'historique? je pourrais te montrer un exemple si oui

**Exemple tiré de l'historique réel (conversation "Je veux faire un profil sur les gens nés après 1995...", 2026-08-20) :**

Séquence de 5 tours de clarification consécutifs avant la moindre exécution, malgré des feux verts répétés de l'utilisateur :

1. USER pose la question initiale → AGENT: "Clarifications nécessaires (avant toute analyse)"
2. USER précise → AGENT: "Clarifications nécessaires (avant d'exécuter les calculs)"
3. USER répond aux 3 points, dit "vas-y le plus précis possible... explore tout" → AGENT: "Question rapide avant exécution"
4. USER: "5 par sondage. go" → AGENT: "Clarification finale (obligatoire avant exécution)"
5. USER: "oui lance le scan" → AGENT: "Clarification nécessaire (très rapide, pour respecter les règles de codage)"
6. USER: "option 2. go pus de questions vas y" → l'agent exécute enfin (appels `get_survey`)

Chaque message de clarification s'annonçait comme "rapide" ou "finale" — et ne l'était pas. L'utilisateur a dû dire l'équivalent de "go" quatre fois avant que ça parte.



2. Le UI de la chaine de messages à gauche s'empile parfois. Genre ma question et sa reponse sont une par dessus l'autre.

Voir `docs/image.png`

Répétable : apparaît systématiquement après 5-6 tours de conversation (pas intermittent). Pas de piste de cause trouvée par relecture statique du code (`AgentPage.tsx` + `.chat-bubble`/`.agent-scroll` dans `App.css` — pas de `position: absolute`, pas de marges négatives, clés React stables sur l'index du message). À investiguer en live avec devtools (inspecter les éléments superposés au moment où ça apparaît) plutôt que par lecture de code.