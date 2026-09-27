"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";

import { restoreSession as restoreAccessSession } from "@/lib/authClient";
import { apiClient } from "@/lib/api";
import { clearSessionCache, readSessionCache, writeSessionCache } from "@/lib/sessionStore";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/tokenStore";
import type { Organization, UserProfile } from "@/types";

const API_URL = typeof window !== "undefined"
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");

interface AuthContextValue {
  user: UserProfile | null;
  organization: Organization | null;
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

  const loadProfileInBackground = useCallback(async () => {
    const [me, org] = await Promise.all([
      apiClient.get<UserProfile>("/auth/me/"),
      apiClient.get<Organization>("/org/me/"),
    ]);
    setUser(me.data);
    setOrganization(org.data);
    writeSessionCache(me.data, org.data);
  }, []);

  const restoreSession = useCallback(async () => {
    if (restoreRef.current) return restoreRef.current;
    restoreRef.current = (async () => {
      const cached = readSessionCache();
      const tokenValid = await restoreAccessSession();
      if (!tokenValid) {
        // `restoreAccessSession()` ne renvoie `false` que sur un rejet DÉFINITIF
        // du refresh (401/403 confirmé par le serveur) — une panne réseau ou un
        // cold start est déjà absorbé en amont et renvoie `true` dans ce cas
        // (voir lib/authClient.ts, `result.transient`). Afficher malgré tout le
        // cache local ici masquait une session réellement expirée : l'utilisateur
        // restait sur un dashboard qui semblait connecté mais où chaque appel API
        // échouait en boucle avec 401 (cause du "Impossible de charger le
        // registre" sans issue). Une session dont le cookie est mort n'en est
        // plus une : on efface le cache et on laisse le garde de layout renvoyer
        // vers la connexion.
        clearSessionCache();
        setUser(null);
        setOrganization(null);
        return false;
      }
      try {
        await loadProfileInBackground();
      } catch (requestError) {
        // Un cache local déjà présent reste utilisable pendant une panne réseau.
        if (!cached?.user) throw requestError;
        setUser(cached.user);
        setOrganization(cached.organization || null);
      }
      return true;
    })().finally(() => { restoreRef.current = null; });
    return restoreRef.current;
  }, [loadProfileInBackground]);

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
      setLoading(false);
      return () => { mounted = false; };
    }
    restoreSession().catch(() => undefined).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [pathname, restoreSession]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setLoggingIn(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/auth/google/`, { credential }, { withCredentials: true });
      setAccessToken(data.access);
      const nextUser = data.user as UserProfile;
      setUser(nextUser);
      setOrganization(null);
      writeSessionCache(nextUser, null);
      return { isNew: Boolean(data.is_new), name: nextUser.full_name || nextUser.email || "" };
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) setError(requestError.response?.data?.error?.message || "Connexion impossible. Réessaie.");
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
    try { await axios.post(`${API_URL}/auth/logout/`, null, { withCredentials: true }); } catch {}
    clearAccessToken();
    clearSessionCache();
    setUser(null);
    setOrganization(null);
    setLoggingOut(false);
  }, [loggingOut]);

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
