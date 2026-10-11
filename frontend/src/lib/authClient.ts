import { getAccessToken, peekStoredToken, setAccessToken } from "./tokenStore";
import { markServerDown, markServerOk, waitForServer } from "./serverWake";

// Le navigateur appelle le proxy Next.js same-origin afin que le cookie
// httpOnly de refresh ne soit pas traité comme un cookie tiers.
const API_URL = typeof window !== "undefined"
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
// Le serveur tourne le refresh token à chaque appel : abandonner une requête déjà reçue par le
// serveur fait perdre le nouveau cookie (rotation faite, réponse jamais lue) et la session meurt
// 30 s plus tard. On ne coupe donc JAMAIS un refresh trop tôt : le réveil du serveur est attendu
// AVANT l'envoi (lib/serverWake.ts), et la requête elle-même garde un délai large.
const REFRESH_TIMEOUT_MS = 45_000;
// Nombre de cycles « attendre le serveur puis rafraîchir » avant de conclure à une panne durable.
const MAX_REFRESH_CYCLES = 3;

export interface RefreshResult {
  ok: boolean;
  transient: boolean; // true = erreur reseau/serveur temporaire, jamais une deconnexion
  access?: string;
}

let refreshPromise: Promise<RefreshResult> | null = null;

async function doRefresh(): Promise<RefreshResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      markServerOk();
      return { ok: false, transient: false }; // cookie mort/absent -> deconnexion legitime
    }
    if (!res.ok) {
      return { ok: false, transient: true }; // 5xx / 502-504 de passerelle -> souci serveur passager
    }
    const data = await res.json();
    markServerOk();
    setAccessToken(data.access);
    return { ok: true, transient: false, access: data.access };
  } catch {
    return { ok: false, transient: true }; // timeout / hors-ligne
  } finally {
    clearTimeout(timer);
  }
}

/** Une tentative de refresh coordonnee entre TOUS les onglets/fenetres de l'origine (PWA incluse) via Web Locks.
 * Le backend tourne le refresh token a chaque appel : deux contextes qui rafraichissent en meme
 * temps avec le meme cookie se font echouer l'un l'autre. Le verrou les met en file, et le
 * suivant reutilise le jeton que le precedent vient de stocker au lieu d'appeler le serveur.
 * Le verrou ne couvre qu'UNE tentative : l'attente du réveil se fait en dehors, sinon un onglet
 * bloquerait les autres pendant tout le cold start. */
async function doRefreshAcrossTabs(): Promise<RefreshResult> {
  const rejected = getAccessToken(); // jeton envoye puis refuse (ou null au demarrage)
  const run = async (): Promise<RefreshResult> => {
    const shared = peekStoredToken();
    if (shared && shared !== rejected) {
      setAccessToken(shared);
      return { ok: true, transient: false, access: shared };
    }
    return doRefresh();
  };
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    try {
      return await navigator.locks.request("qr-session-refresh", run);
    } catch {
      return run(); // verrou indisponible : on retombe sur le comportement d'un seul onglet
    }
  }
  return run();
}

/** Refresh « conscient du cold start » : attend que le serveur réponde, rafraîchit, et recommence si
 * le serveur s'est rendormi ou a répondu en 502/503/504 entre-temps. Ne renvoie `transient` qu'après
 * plusieurs minutes d'indisponibilité cumulées. */
async function doRefreshWithWake(): Promise<RefreshResult> {
  for (let cycle = 0; cycle < MAX_REFRESH_CYCLES; cycle += 1) {
    if (!(await waitForServer())) return { ok: false, transient: true };
    const result = await doRefreshAcrossTabs();
    if (!result.transient) return result;
    markServerDown();
  }
  return { ok: false, transient: true };
}

/** Singleton : deux 401 simultanes (StrictMode, plusieurs requetes en parallele)
 * ne doivent declencher qu'un seul appel de refresh. */
export function refreshOnce(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = doRefreshWithWake().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export type RestoreOutcome = "valid" | "rejected" | "unreachable";

/** Restaure la session au montage (F5, nouvel onglet) en distinguant trois cas :
 * - « valid » : jeton d'accès utilisable (ou renouvelé) ;
 * - « rejected » : le serveur a répondu et refuse le cookie -> vraie déconnexion ;
 * - « unreachable » : le serveur ne répond pas (cold start prolongé, panne) -> JAMAIS une déconnexion. */
export async function restoreSessionDetailed(): Promise<RestoreOutcome> {
  if (getAccessToken()) return "valid";
  const result = await refreshOnce();
  if (result.ok) return "valid";
  return result.transient ? "unreachable" : "rejected";
}

/** Compatibilité : ne renvoie « deconnecte » (false) que sur un rejet DEFINITIF du cookie. */
export async function restoreSession(): Promise<boolean> {
  return (await restoreSessionDetailed()) !== "rejected";
}
