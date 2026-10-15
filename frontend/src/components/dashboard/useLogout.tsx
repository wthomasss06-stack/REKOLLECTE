"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useDialog } from "@/components/ui/DialogProvider";
import { apiClient } from "@/lib/api";
import { dayPartWish, firstNameOf } from "@/lib/greeting";
import { clearSessionCache } from "@/lib/sessionStore";
import { setAccessToken } from "@/lib/tokenStore";

/** Message d'au revoir puis déconnexion : la requête part dans la boîte (bouton en chargement), puis on quitte l'espace.
 * Partagé par la barre latérale (ordinateur) et le menu du profil (téléphone). */
export function useLogout(userName: string) {
  const router = useRouter();
  const { confirm } = useDialog();
  return useCallback(async () => {
    const firstName = firstNameOf(userName);
    const ok = await confirm({
      tone: "brand",
      mood: "wink",
      title: "À bientôt !",
      message: <><strong>{dayPartWish()}{firstName ? `, ${firstName}` : ""}.</strong><br />Ta session sera fermée sur cet appareil.</>,
      confirmLabel: "Se déconnecter",
      cancelLabel: "Rester connecté",
      runningLabel: "Déconnexion…",
      run: async () => { await apiClient.post("/auth/logout/").catch(() => {}); setAccessToken(null); clearSessionCache(); },
    });
    if (ok) router.push("/");
  }, [confirm, router, userName]);
}
