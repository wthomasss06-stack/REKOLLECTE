import axios from "axios";

import { refreshOnce } from "./authClient";
import { getAccessToken } from "./tokenStore";
import { normalizeApiError } from "./errors";
import { getWakeSnapshot, markServerDown, markServerOk, waitForServer } from "./serverWake";

// En navigateur, passer par Next.js garde le cookie de refresh sur le même
// domaine que l’application. L’URL backend directe reste réservée au SSR/dev.
const API_URL = typeof window !== "undefined"
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
// Une requête tenue par un Render endormi peut attendre plusieurs dizaines de secondes : on lui laisse
// le temps, puis serverWake prend le relais (sonde + rejeu) au lieu d'afficher une erreur.
const REQUEST_TIMEOUT_MS = 30_000;
// Combien de fois une même requête est rejouée après un réveil de serveur.
const MAX_WAKE_REPLAYS = 3;

// Le refresh token reste dans un cookie httpOnly ; le JWT d’accès est seulement
// ajouté à la requête depuis la mémoire/localStorage.
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

declare module "axios" {
  interface AxiosRequestConfig {
    /** `false` : échoue vite, sans attendre ni rejouer pendant le réveil du serveur (files d’attente hors ligne qui ont leur propre relance). */
    wake?: boolean;
  }
}

type ReplayableConfig = {
  headers?: { Authorization?: string } & Record<string, unknown>;
  method?: string;
  url?: string;
  wake?: boolean;
  _retry?: boolean;
  _wakeReplays?: number;
};

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=").slice(1).join("=") || "";
}

const isSessionEndpoint = (url = "") => /\/auth\/(csrf|token\/refresh|google|logout)\//.test(url);
const isSafeMethod = (method = "get") => ["get", "head", "options"].includes(method.toLowerCase());

interface ApiErrorLike {
  response?: { status?: number; data?: { error?: unknown } };
  code?: string;
}

/** 502/503/504 produits par la passerelle (Vercel/Render) et non par l’application : l’API Django répond toujours { error: {...} }. */
function isGatewayError(error: ApiErrorLike): boolean {
  const status = error.response?.status;
  return (status === 502 || status === 503 || status === 504) && !error.response?.data?.error;
}

/** Panne probablement passagère : pas de réponse du tout (timeout, réseau) ou erreur de passerelle. */
function isTransientFailure(error: ApiErrorLike): boolean {
  if (!error.response) return error.code !== "ERR_CANCELED";
  return isGatewayError(error);
}

apiClient.interceptors.request.use(async (config) => {
  // Serveur en train de se réveiller : on met la requête en file d’attente au lieu de la lancer dans le vide
  // (et, pour une écriture, d’en perdre la réponse). Les files hors ligne passent `wake: false`.
  if (config.wake !== false && getWakeSnapshot().status === "waking") await waitForServer();
  const token = getAccessToken();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  const method = (config.method || "").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    const csrf = readCookie("csrftoken");
    if (csrf && config.headers) config.headers["X-CSRFToken"] = decodeURIComponent(csrf);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    markServerOk();
    return response;
  },
  async (error) => {
    error.appError = normalizeApiError(error);
    // Une réponse de l’application (même 4xx/500) prouve que le serveur est réveillé ; pas une erreur de passerelle.
    if (error.response && !isGatewayError(error)) markServerOk();
    if (!error.response) {
      error.category = error.code === "ECONNABORTED" ? "timeout" : "network";
      error.retryable = true;
    } else if (error.response.status === 429 || error.response.status >= 500) {
      error.category = error.response.status === 429 ? "rate-limit" : "server";
      error.retryable = true;
    } else if (error.response.status === 401 || error.response.status === 403) {
      error.category = "auth";
      error.retryable = false;
    }

    const originalRequest = error.config as ReplayableConfig | undefined;

    // Cold start : on ne montre pas d’erreur, on attend le serveur puis on rejoue.
    // Lecture : rejouée sur toute panne passagère. Écriture : uniquement sur une erreur de passerelle
    // (la requête n’a pas atteint l’application), jamais sur un timeout, pour ne pas dupliquer une action.
    if (originalRequest && originalRequest.wake !== false) {
      const replayable = isSafeMethod(originalRequest.method) ? isTransientFailure(error) : isGatewayError(error);
      const replays = originalRequest._wakeReplays ?? 0;
      if (replayable && replays < MAX_WAKE_REPLAYS) {
        originalRequest._wakeReplays = replays + 1;
        markServerDown();
        if (await waitForServer()) return apiClient(error.config);
        return Promise.reject(Object.assign(error, { transient: true }));
      }
    }

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isSessionEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Le jeton a peut-etre deja ete renouvele depuis l'envoi de cette requete (autre requete
    // du meme onglet, ou autre onglet) : on rejoue avec le jeton courant au lieu d'ouvrir un
    // refresh de plus, qui risquerait de croiser le premier.
    const sentToken = String(originalRequest.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
    const currentToken = getAccessToken();
    if (currentToken && currentToken !== sentToken) {
      if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${currentToken}`;
      return apiClient(error.config);
    }

    const result = await refreshOnce();
    if (result.ok && result.access) {
      if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${result.access}`;
      return apiClient(error.config);
    }
    if (result.transient) {
      // Une panne réseau/cold start ne doit pas effacer la session locale.
      return Promise.reject(Object.assign(error, { transient: true }));
    }

    // Ne pas déconnecter silencieusement l’utilisateur sur un seul 401.
    // Le refresh peut avoir été refusé après une rotation, un changement
    // d’onglet ou une indisponibilité du cookie cross-site. La session locale
    // reste affichée et la reconnexion explicite demeure disponible.
    return Promise.reject(error);
  },
);
