import { config } from "./config.js";

let authStore;

export function setAuthStore(store) {
  authStore = store;
}

export function requireScope(req, scope) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("Bearer token required");
    error.statusCode = 401;
    error.code = "unauthorized";
    throw error;
  }

  const storedToken = authStore?.verifyApiToken(match[1]);
  const bootstrapEnabled = authStore?.bootstrapTokensEnabled?.() ?? config.bootstrapTokensEnabled;
  const token = storedToken || (bootstrapEnabled ? config.tokens.find((candidate) => candidate.token === match[1]) : null);
  if (!token) {
    const error = new Error("Invalid bearer token");
    error.statusCode = 401;
    error.code = "unauthorized";
    throw error;
  }

  if (!scopeAllows(token.scopes || [], scope)) {
    const error = new Error(`Token lacks required scope: ${scope}`);
    error.statusCode = 403;
    error.code = "forbidden";
    throw error;
  }

  req.auth = { name: token.name, token_id: token.id || null, scopes: token.scopes, decision_keys: token.decision_keys || [] };
}

function scopeAllows(scopes, required) {
  if (scopes.includes("admin")) return true;
  if (scopes.includes(required)) return true;
  const implied = {
    viewer: ["editor", "publisher"],
    editor: [],
    publisher: [],
    evaluate: [],
    client: []
  };
  return (implied[required] || []).some((scope) => scopes.includes(scope));
}
