"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Loader from "@/components/Loader";
import { useAuthContext } from "@/context/AuthContext";
import { readSessionCache } from "@/lib/sessionStore";

/** Point d’arrivée après Facebook / Apple. Le serveur a déjà posé le cookie de session :
 * on reprend le flux normal (refresh silencieux), exactement comme après un rechargement. */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const { restoreSession } = useAuthContext();

  useEffect(() => {
    const isNew = new URLSearchParams(window.location.search).get("new") === "1";
    restoreSession()
      .then((ok) => {
        if (!ok) return router.replace("/connexion?auth_error=session");
        const name = readSessionCache()?.user?.full_name || "";
        sessionStorage.setItem("qr_login_greeting", JSON.stringify({ isNew, name }));
        router.replace(isNew ? "/onboarding" : "/dashboard");
      })
      .catch(() => router.replace("/connexion?auth_error=session"));
  }, [restoreSession, router]);

  return <Loader fullScreen />;
}
