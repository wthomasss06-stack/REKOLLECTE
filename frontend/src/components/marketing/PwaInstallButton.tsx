"use client";

import { useEffect, useState } from "react";

import { DownloadIcon } from "@/components/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

declare global {
  interface Window {
    __r3DeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const INSTALL_READY_EVENT = "r3:pwa-install-ready";

// Le navigateur peut émettre beforeinstallprompt avant le montage du bouton.
// On le capture dès le chargement du module, comme le fait Kôkô Eats.
if (typeof window !== "undefined") {
  window.__r3DeferredInstallPrompt = window.__r3DeferredInstallPrompt || null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__r3DeferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(INSTALL_READY_EVENT));
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const syncPrompt = () => setDeferredPrompt(window.__r3DeferredInstallPrompt || null);
    const onInstalled = () => {
      window.__r3DeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setInstalled(true);
      setInstalling(false);
    };

    syncPrompt();
    window.addEventListener(INSTALL_READY_EVENT, syncPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const standalone = isStandalone();
    if (standalone) setInstalled(true);

    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, syncPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPrompt || window.__r3DeferredInstallPrompt;
    if (!promptEvent || installing) return;

    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      // L’événement ne peut être réutilisé après prompt(), quel que soit le choix.
      window.__r3DeferredInstallPrompt = null;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") setInstalled(true);
    } finally {
      setInstalling(false);
    }
  };

  if (installed || !deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={install}
      disabled={installing}
      aria-label="Installer REKOLLECTE sur cet appareil"
      className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-cta px-5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-cta-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-cta-hover disabled:cursor-wait disabled:opacity-60"
    >
      {installing ? "Installation…" : "Installer l’application"}
      <DownloadIcon size={14} />
    </button>
  );
}
