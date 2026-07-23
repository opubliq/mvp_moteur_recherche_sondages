import type { Config, Context } from "@netlify/edge-functions";

// Basic Auth global : bloque tout le site (pages + API functions) tant que
// l'utilisateur n'a pas fourni les identifiants partagés.
// Identifiants configurés via variables d'env Netlify : BASIC_AUTH_USER / BASIC_AUTH_PASSWORD.

const REALM = "Opubliq — accès restreint";

export default async (request: Request, context: Context) => {
  const expectedUser = Deno.env.get("BASIC_AUTH_USER");
  const expectedPassword = Deno.env.get("BASIC_AUTH_PASSWORD");

  // Si le login n'est pas configuré, on ne bloque rien (évite de se verrouiller dehors).
  if (!expectedUser || !expectedPassword) {
    return context.next();
  }

  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try {
      decoded = atob(encoded);
    } catch {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const password = decoded.slice(sep + 1);

    if (user === expectedUser && password === expectedPassword) {
      return context.next();
    }
  }

  return new Response("Accès restreint. Identifiants requis.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
};

export const config: Config = {
  // Protège tout, y compris les endpoints API.
  path: "/*",
};
