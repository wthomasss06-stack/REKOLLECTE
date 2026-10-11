"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { getWakeSnapshot, subscribeWake, type WakeSnapshot } from "@/lib/serverWake";

const SERVER_SNAPSHOT: WakeSnapshot = { status: "ok", since: null };

/** État du réveil du serveur (« ok » ou « waking »), partagé par toute l'application. */
export function useServerWake(): WakeSnapshot {
  return useSyncExternalStore(subscribeWake, getWakeSnapshot, () => SERVER_SNAPSHOT);
}

/** Secondes écoulées depuis le début du réveil (0 si le serveur répond), rafraîchies chaque seconde. */
export function useWakeElapsedSeconds(): number {
  const { since } = useServerWake();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1_000));
}
