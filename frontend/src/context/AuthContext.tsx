"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";

import { restoreSessionDetailed } from "@/lib/authClient";
import { apiClient } from "@/lib/api";
import { markServerDown, markServerOk, startKeepAlive, waitForServer, warmServer } from "@/lib/serverWake";
import { clearSessionCache, readSessionCache, writeSessionCache } from "@/lib/sessionStore";
import { clearAccessToken, setAccessToken } from "@/lib/tokenStore";
import type { Organization, UserProfile } from "@/types";

const API_URL = typeof window !== "undefined"
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");

// Rétablir la session : on réessaie tant que le serveur dort ou ne répond pas (chaque tour attend déjà le
// réveil du serveur, jusqu'à 3 min). Après tous ces tours, on abandonne seulement si rien n'est à afficher.
const MAX_RESTORE_ROUNDS = 12;
const RESTORE_PAUSE_MS = 3_000;
const LOGIN_TIMEOUT_MS = 45_000;
/** Posé quand le serveur a confirmé que la session est morte ; lu (une fois) par la page de connexion. */
export const SESSION_EXPIRED_FLAG = "qr_session_expired";

interface AuthContextValue {
  user: UserProfile | null;
  organization: Organization | null;
  /** Vrai tant que la session n'est pas tranchée (connectée / déconnectée) : le dashboard affiche alors sa coque en squelette. */
  loading: boolean;
  loggingIn: boolean;
  loggingOut: boolean;
  error: string | null;
  isAuthenticated: boolean;
  loginWithGoogle: (credential: string) => Promise<{ isNew: boolean; name: string }>;
  restoreSession: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isPublicPath(pathname: string) {
  return pathname === "/" || pathname === "/connexion" || pathname === "/admin" || pathname.startsWith("/v/") || pathname.startsWith("/aide");
}

// Pages où l'on pré-chauffe le serveur : avec un peu de chance il est déjà réveillé quand la personne clique sur « Se connecter ».
const isWarmPath = (pathname: string) => pathname === "/" || pathname === "/connexion";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isGatewayFailure = (error: unknown) =>
  axios.isAxiosError(error) && (!error.response || ([502, 503, 504].includes(error.response.status) && !error.response.data?.error));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Ne jamais lire localStorage pendant le rendu : le serveur ne possède pas
  // ce stockage et cela provoquait React #418 au rechargement du dashboard.
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoreRef = useRef<Promise<boolean> | null>(null);
  // Incrémenté à chaque déconnexion : une restauration en cours ne doit pas ressusciter une session fermée.
  const epochRef = useRef(0);

  const loadProfileInBackground = useCallback(async () => {
    const [me, org] = await Promise.all([
      apiClient.get<UserProfile>("/auth/me/"),
      // Un compte sans établissement (onboarding pas fini) n'a pas d'organisation : ce n'est pas une panne.
      apiClient.get<Organization>("/org/me/").catch((requestError) => {
        if (axios.isAxiosError(requestError) && (requestError.response?.status === 404 || requestError.response?.status === 403)) return { data: null };
        throw requestError;
      }),
    ]);
    setUser(me.data);
    setOrganization(org.data);
    writeSessionCache(me.data, org.data);
  }, []);

  const dropSession = useCallback((expired = true) => {
    // Mémorise une session réellement expirée : la page de connexion l'explique au lieu d'un retour muet à l'accueil.
    if (expired && typeof window !== "undefined") {
      try { if (readSessionCache()?.user) window.sessionStorage.setItem(SESSION_EXPIRED_FLAG, "1"); } catch {}
    }
    clearAccessToken();
    clearSessionCache();
    setUser(null);
    setOrganization(null);
  }, []);

  const restoreSession = useCallback(async () => {
    if (restoreRef.current) return restoreRef.current;
    const epoch = epochRef.current;
    restoreRef.current = (async () => {
      for (let round = 0; round < MAX_RESTORE_ROUNDS; round += 1) {
        if (epoch !== epochRef.current) return false;
        const outcome = await restoreSessionDetailed();
        if (epoch !== epochRef.current) return false;

        if (outcome === "rejected") {
          // Seul un 401/403 CONFIRMÉ par le serveur sur le cookie de refresh arrive ici : une panne réseau
          // ou un serveur endormi donne « unreachable » et n'efface jamais la session.
          dropSession();
          return false;
        }

        if (outcome === "valid") {
          try {
            await loadProfileInBackground();
            return true;
          } catch (requestError) {
            // Jeton refusé ET refresh refusé : la session est vraiment morte.
            if (axios.isAxiosError(requestError) && requestError.response?.status === 401 && !(requestError as { transient?: boolean }).transient) {
              dropSession();
              return false;
            }
          }
        }

        // Serveur injoignable ou profil non chargé : on affiche la dernière session connue si elle existe
        // (l'app apparaît, les pages se rafraîchissent d'elles-mêmes), sinon on garde la coque en squelette et on réessaie.
        const fallback = readSessionCache();
        if (fallback?.user) {
          setUser(fallback.user);
          setOrganization(fallback.organization || null);
          return true;
        }
        await sleep(RESTORE_PAUSE_MS);
      }
      return false;
    })().finally(() => { restoreRef.current = null; });
    return restoreRef.current;
  }, [dropSession, loadProfileInBackground]);

  useEffect(() => {
    let mounted = true;
    const cached = readSessionCache();

    // Afficher immédiatement la dernière session connue pendant que le token
    // d’accès est vérifié ou renouvelé en arrière-plan.
    if (cached?.user) {
      setUser(cached.user);
      setOrganization(cached.organization || null);
    }

    // Les visiteurs publics ne doivent jamais tenter un refresh JWT sans raison.
    if (isPublicPath(pathname)) {
      if (isWarmPath(pathname)) warmServer();
      setLoading(false);
      return () => { mounted = false; };
    }
    restoreSession().catch(() => undefined).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [pathname, restoreSession]);

  // Espace connecté ouvert : on garde le serveur éveillé (il s'endort après 15 min sans trafic) et on le réveille
  // d'avance quand on revient sur un onglet resté longtemps en arrière-plan.
  const signedIn = Boolean(user);
  useEffect(() => (signedIn ? startKeepAlive() : undefined), [signedIn]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setLoggingIn(true);
    setError(null);
    try {
      // On réveille le serveur AVANT d'envoyer le jeton Google : la connexion part vers un serveur qui répond.
      await waitForServer();
      const post = () => axios.post(`${API_URL}/auth/google/`, { credential }, { withCredentials: true, timeout: LOGIN_TIMEOUT_MS });
      let response;
      try {
        response = await post();
      } catch (firstError) {
        // Le jeton Google reste valable environ une heure : si le serveur s'est rendormi entre-temps, on le laisse repartir puis on renvoie.
        if (!isGatewayFailure(firstError)) throw firstError;
        markServerDown();
        if (!(await waitForServer())) throw firstError;
        response = await post();
      }
      markServerOk();
      const { data } = response;
      setAccessToken(data.access);
      const nextUser = data.user as UserProfile;
      setUser(nextUser);
      setOrganization(null);
      writeSessionCache(nextUser, null);
      return { isNew: Boolean(data.is_new), name: nextUser.full_name || nextUser.email || "" };
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.data?.error?.message) setError(requestError.response.data.error.message);
      else if (isGatewayFailure(requestError)) setError("Le serveur met du temps à répondre. Il se réveille : réessaie dans un instant.");
      else setError("Connexion impossible. Réessaie.");
      throw requestError;
    } finally {
      setLoggingIn(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await loadProfileInBackground();
  }, [loadProfileInBackground]);

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    epochRef.current += 1;
    try {
      // Le cookie de refresh est httpOnly : seul le serveur peut le révoquer. On lui laisse le temps de se réveiller.
      await waitForServer({ maxMs: 20_000 });
      await axios.post(`${API_URL}/auth/logout/`, null, { withCredentials: true, timeout: 15_000 });
    } catch {}
    dropSession(false);
    setLoggingOut(false);
  }, [dropSession, loggingOut]);

  const value = useMemo<AuthContextValue>(() => ({
    user, organization, loading, loggingIn, loggingOut, error,
    isAuthenticated: Boolean(user), loginWithGoogle, restoreSession, refreshUser, logout,
  }), [user, organization, loading, loggingIn, loggingOut, error, loginWithGoogle, restoreSession, refreshUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext doit être utilisé dans AuthProvider");
  return context;
}
