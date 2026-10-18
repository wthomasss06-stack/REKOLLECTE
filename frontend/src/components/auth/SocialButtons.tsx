"use client";

import { useCallback, useEffect, useState } from "react";
import { AppleLogo, FacebookLogo } from "@phosphor-icons/react";

const API_BASE = "/api/v1"; // même origine (rewrite Vercel) : les cookies de session restent first-party
const SESSION_EXPIRED_FLAG = "qr_session_expired"; // posé par AuthContext quand le serveur confirme une session morte

/** Fournisseurs affichés, pilotés par NEXT_PUBLIC_AUTH_PROVIDERS (défaut : Google seul). */
export function enabledProviders(): string[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVIDERS || "google").split(",").map((p) => p.trim()).filter(Boolean);
}

/** Gabarit commun des boutons de connexion (Google, Facebook, Apple) : même hauteur, même forme, même police. */
export const SOCIAL_BUTTON_BASE = "flex h-12 w-full items-center justify-center gap-3 rounded-full text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta";

const MESSAGES: Record<string, string> = {
  state: "Ta tentative de connexion a expiré. Réessaie.",
  cancelled: "Connexion annulée.",
  provider: "Le fournisseur n’a pas répondu. Réessaie dans un instant.",
  session: "Impossible d’ouvrir ta session. Réessaie.",
  expired: "Ta session a expiré. Reconnecte-toi pour continuer.",
  conflict: "Ce compte est déjà utilisé par un autre espace REKOLLECTE.",
  access_revoked: "Ton accès à cet établissement a été retiré.",
  email_missing: "Aucune adresse e-mail n’a été transmise. Connecte-toi avec Google, ou autorise le partage de ton e-mail puis réessaie.",
  email_unverified: "Ton adresse e-mail n’est pas vérifiée chez ce fournisseur. Vérifie-la, ou utilise une autre méthode.",
  email_private_relay: "Tu as masqué ton e-mail avec Apple. Connecte-toi d’abord avec ta méthode habituelle, puis lie Apple dans Paramètres > Connexion. (Ou : Réglages Apple ID > Se connecter avec Apple > REKOLLECTE > Arrêter, puis réessaie en choisissant « Partager mon e-mail ».)",
};

// Codes qui ne sont pas des échecs : on les affiche comme une information, pas comme une erreur.
const INFO_CODES = new Set(["expired", "cancelled"]);

export interface AuthNotice {
  tone: "error" | "info";
  message: string;
}

/** Retire de l'URL le code d'erreur et le fragment `#_=_` que Facebook ajoute au retour (il reste sinon dans la barre d'adresse). */
function cleanAddressBar() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("auth_error");
    const clean = `${url.pathname}${url.search}`;
    if (clean !== `${window.location.pathname}${window.location.search}` || window.location.hash) window.history.replaceState(window.history.state, "", clean);
  } catch {
    // La barre d'adresse reste telle quelle : sans conséquence.
  }
}

/** Message de connexion à afficher : code `?auth_error=…` renvoyé par le serveur, ou session expirée détectée par l'app.
 * Lu une fois au montage, puis l'URL est nettoyée. `dismiss` le referme. */
export function useAuthNotice(): { notice: AuthNotice | null; dismiss: () => void } {
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  useEffect(() => {
    let code = new URLSearchParams(window.location.search).get("auth_error");
    try {
      if (window.sessionStorage.getItem(SESSION_EXPIRED_FLAG)) {
        window.sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
        code = code || "expired";
      }
    } catch {
      // sessionStorage indisponible : on se contente de l'URL.
    }
    if (code) setNotice({ tone: INFO_CODES.has(code) ? "info" : "error", message: MESSAGES[code] || "Connexion impossible. Réessaie." });
    cleanAddressBar();
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);
  return { notice, dismiss };
}

/** Message d’erreur renvoyé par le serveur dans l’URL (?auth_error=...), lu une fois au montage. */
export function useAuthErrorFromUrl(): string | null {
  const { notice } = useAuthNotice();
  return notice?.message ?? null;
}

/** Navigation complète (pas d’appel AJAX) : c’est le fournisseur qui reprend la main, puis le serveur nous ramène.
 * Un seul départ possible : un second tap (ou double-clic) lancerait un deuxième flux OAuth et ferait échouer le premier. */
export default function SocialButtons({ disabled = false }: { disabled?: boolean }) {
  const providers = enabledProviders();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    // Retour arrière depuis le fournisseur (cache de navigation) : les boutons redeviennent utilisables.
    const reset = (event: PageTransitionEvent) => { if (event.persisted) setPending(null); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(null), 15_000); // filet : navigation bloquée
    return () => window.clearTimeout(timer);
  }, [pending]);

  const start = (provider: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pending || disabled) {
      event.preventDefault();
      return;
    }
    setPending(provider);
  };

  const base = SOCIAL_BUTTON_BASE;
  const busy = (provider: string) => pending === provider;
  const inactive = (provider: string) => (pending && pending !== provider) || disabled;

  return (
    <div className="flex w-full flex-col gap-3">
      {providers.includes("facebook") && (
        <a
          href={`${API_BASE}/auth/facebook/start/`}
          onClick={start("facebook")}
          data-track="login_start"
          aria-busy={busy("facebook")}
          aria-disabled={Boolean(inactive("facebook"))}
          className={`${base} bg-[#1877F2] text-white hover:brightness-110 ${inactive("facebook") ? "pointer-events-none opacity-50" : ""}`}
        >
          {busy("facebook")
            ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Redirection vers Facebook…</>
            : <><FacebookLogo size={20} weight="fill" aria-hidden="true" /> Continuer avec Facebook</>}
        </a>
      )}
      {providers.includes("apple") && (
        <a
          href={`${API_BASE}/auth/apple/start/`}
          onClick={start("apple")}
          data-track="login_start"
          aria-busy={busy("apple")}
          aria-disabled={Boolean(inactive("apple"))}
          className={`${base} bg-black text-white hover:bg-neutral-800 ${inactive("apple") ? "pointer-events-none opacity-50" : ""}`}
        >
          {busy("apple")
            ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Redirection vers Apple…</>
            : <><AppleLogo size={20} weight="fill" aria-hidden="true" /> Continuer avec Apple</>}
        </a>
      )}
    </div>
  );
}
