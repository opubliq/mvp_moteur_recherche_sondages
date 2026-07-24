import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Les fonctions Netlify sont écrites en TS mais s'importent en NodeNext (`./x.js`
 * pointe le fichier `./x.ts`). En prod c'est esbuild (bundler Netlify) qui résout ;
 * pour les tests, ce plugin réécrit un import relatif `*.js` vers le `.ts` voisin
 * quand il existe. Aucun impact sur le build de prod.
 */
function resolveTsFromJs(): Plugin {
  return {
    name: "resolve-ts-from-js",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer && source.startsWith(".") && source.endsWith(".js")) {
        const abs = resolve(dirname(importer), source.slice(0, -3) + ".ts");
        if (existsSync(abs)) return abs;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveTsFromJs()],
  test: {
    root: rootDir,
    include: ["netlify/functions/**/*.test.ts"],
    environment: "node",
    // @duckdb/node-api charge un binding natif .node : ne pas le transformer.
    server: { deps: { external: [/@duckdb\//] } },
  },
});
