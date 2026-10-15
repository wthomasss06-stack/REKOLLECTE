"use client";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import WebVitals from "@/components/WebVitals";
import { DialogProvider } from "@/components/ui/DialogProvider";
import { AuthProvider } from "@/context/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let active = true;
    const register = () => {
      if (!active) return;
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
        registration.update().catch(() => undefined);
      }).catch(() => {
        // L’installation PWA reste optionnelle si le service worker est indisponible.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      active = false;
      window.removeEventListener("load", register);
    };
  }, []);

  return <GoogleOAuthProvider clientId={clientId}><AuthProvider><WebVitals /><DialogProvider>{children}</DialogProvider></AuthProvider></GoogleOAuthProvider>;
}
