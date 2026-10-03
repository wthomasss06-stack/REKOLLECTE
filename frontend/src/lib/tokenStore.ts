const ACCESS_TOKEN_KEY = "qr_access_token_v1";
let accessToken: string | null = null;

function tokenIsUsable(token: string | null): boolean {
  if (!token) return false;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return false;
    const payload = JSON.parse(atob(payloadPart));
    return Number(payload.exp || 0) * 1000 > Date.now() + 5_000;
  } catch {
    return false;
  }
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (tokenIsUsable(stored)) return stored;
    if (stored) window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Le stockage local est optionnel : le cookie httpOnly reste la source de refresh.
  }
  return null;
}

accessToken = readStoredToken();

// Un autre onglet (ou la PWA) renouvelle la session : son jeton arrive ici via l'événement
// `storage`, ce qui évite à cet onglet de refuser un 401 puis de relancer un refresh de plus.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== ACCESS_TOKEN_KEY) return;
    accessToken = tokenIsUsable(event.newValue) ? event.newValue : null;
  });
}

/** Jeton partagé par les autres onglets (localStorage), s'il est encore valide. */
export function peekStoredToken(): string | null {
  return readStoredToken();
}

export function getAccessToken(): string | null {
  // Un onglet resté ouvert garde son jeton en mémoire bien après l'expiration (10 min) :
  // on ne le renvoie que s'il est encore valable, sinon on retombe sur le stockage partagé.
  if (accessToken && !tokenIsUsable(accessToken)) accessToken = null;
  if (!accessToken) accessToken = readStoredToken();
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = tokenIsUsable(token) ? token : null;
  if (typeof window === "undefined") return;
  try {
    if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Continuer en mémoire si le navigateur bloque localStorage.
  }
}

export function clearAccessToken(): void {
  accessToken = null;
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(ACCESS_TOKEN_KEY); } catch {}
}
