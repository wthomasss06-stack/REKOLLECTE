"use client";

import { useEffect, useState } from "react";
import { AppleLogo, FacebookLogo } from "@phosphor-icons/react";

const API_BASE = "/api/v1"; // même origine (rewrite Vercel) : les cookies de session restent first-party

/** Fournisseurs affichés, pilotés par NEXT_PUBLIC_AUTH_PROVIDERS (défaut : Google seul). */
export function enabledProviders(): string[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVIDERS || "google").split(",").map((p) => p.trim()).filter(Boolean);
}

const MESSAGES: Record<string, string> = {
  state: "Ta tentative de connexion a expiré. Réessaie.",
  cancelled: "Connexion annulée.",
  provider: "Le fournisseur n’a pas répondu. Réessaie dans un instant.",
  session: "Impossible d’ouvrir ta session. Réessaie.",
  conflict: "Ce compte est déjà utilisé par un autre espace REKOLLECTE.",
  access_revoked: "Ton accès à cet établissement a été retiré.",
  email_missing: "Aucune adresse e-mail n’a été transmise. Connecte-toi avec Google, ou autorise le partage de ton e-mail puis réessaie.",
  email_unverified: "Ton adresse e-mail n’est pas vérifiée chez ce fournisseur. Vérifie-la, ou utilise une autre méthode.",
  email_private_relay: "Tu as masqué ton e-mail avec Apple. Connecte-toi d’abord avec ta méthode habituelle, puis lie Apple dans Paramètres > Connexion. (Ou : Réglages Apple ID > Se connecter avec Apple > REKOLLECTE > Arrêter, puis réessaie en choisissant « Partager mon e-mail ».)",
};

/** Message d’erreur renvoyé par le serveur dans l’URL (?auth_error=...), lu une fois au montage. */
export function useAuthErrorFromUrl(): string | null {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("auth_error");
    if (code) setMessage(MESSAGES[code] || "Connexion impossible. Réessaie.");
  }, []);
  return message;
}

/** Navigation complète (pas d’appel AJAX) : c’est le fournisseur qui reprend la main, puis le serveur nous ramène. */
export default function SocialButtons() {
  const providers = enabledProviders();
  return (
    <div className="flex w-full flex-col gap-3">
      {providers.includes("facebook") && (
        <a
          href={`${API_BASE}/auth/facebook/start/`}
          className="flex h-11 w-full max-w-[280px] items-center justify-center gap-3 self-center rounded-full bg-[#1877F2] text-sm font-medium text-white transition hover:brightness-110"
        >
          <FacebookLogo size={20} weight="fill" aria-hidden="true" /> Continuer avec Facebook
        </a>
      )}
      {providers.includes("apple") && (
        <a
          href={`${API_BASE}/auth/apple/start/`}
          className="flex h-11 w-full max-w-[280px] items-center justify-center gap-3 self-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <AppleLogo size={20} weight="fill" aria-hidden="true" /> Continuer avec Apple
        </a>
      )}
    </div>
  );
}
