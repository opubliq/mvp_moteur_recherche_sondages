import { defineConfig } from "vitest/config";

/**
 * Les tests d'`azure-functions/` vivent dans `src/__tests__/` — jamais à côté
 * du code : `package.json#main` charge `dist/azure-functions/src/functions/*.js`
 * et un fichier de test embarqué dans le zip de déploiement a déjà cassé une
 * mise en prod côté Netlify (cf. commit e48303c). Le tsconfig les exclut donc
 * du build, et seul vitest (qui transpile lui-même) les voit.
 */
export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
