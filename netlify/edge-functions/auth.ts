// Basic Auth global : bloque tout le site (pages + API functions) tant que
// l'utilisateur n'a pas fourni des identifiants valides.
//
// Comptes configurés via variables d'env Netlify :
//   - BASIC_AUTH_USER / BASIC_AUTH_PASSWORD — le compte partagé historique.
//   - BASIC_AUTH_EXTRA_ACCOUNTS — JSON `{"user": "password", ...}` pour des
//     comptes additionnels par client (ticket f3i.11). Le USERNAME d'un compte
//     ici double comme identifiant de tenant côté résolution d'index
//     (`src/logic/tenancy.ts::resolveAuthorizedTenant`, via le username Basic
//     Auth) — choisir le même slug ici et dans `KNOWN_TENANTS` côté tenancy.

// ASCII pur : les valeurs de header HTTP sont des ByteString (Latin-1),
// un tiret cadratin ou un accent y provoque un TypeError.
const REALM = "Opubliq restricted access";

function loadAccounts(): Record<string, string> {
  const accounts: Record<string, string> = {};

  const user = Deno.env.get("BASIC_AUTH_USER");
  const password = Deno.env.get("BASIC_AUTH_PASSWORD");
  if (user && password) accounts[user] = password;

  const extraRaw = Deno.env.get("BASIC_AUTH_EXTRA_ACCOUNTS");
  if (extraRaw) {
    try {
      const extra = JSON.parse(extraRaw) as Record<string, string>;
      for (const [u, p] of Object.entries(extra)) {
        if (typeof p === "string" && p) accounts[u] = p;
      }
    } catch (err) {
      // Mal formé : on ignore les comptes additionnels plutôt que de casser
      // l'auth entière (le compte partagé, s'il est configuré, reste actif).
      console.error("[auth] BASIC_AUTH_EXTRA_ACCOUNTS invalide (JSON attendu) :", err);
    }
  }

  return accounts;
}

export default async (request: Request) => {
  const accounts = loadAccounts();

  // Si aucun login n'est configuré, on ne bloque rien (évite de se verrouiller dehors).
  if (Object.keys(accounts).length === 0) {
    return;
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

    if (Object.prototype.hasOwnProperty.call(accounts, user) && accounts[user] === password) {
      // Laisse passer vers la page / la function d'origine.
      return;
    }
  }

  return new Response("Accès restreint. Identifiants requis.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
};

export const config = {
  // Protège tout, y compris les endpoints API.
  path: "/*",
};
