"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "qr-register.sidebarCollapsed"; // même clé que l'ancienne navigation : le choix déjà fait par chaque personne est conservé

/** Repli de la barre latérale (rail d'icônes sur ordinateur), mémorisé par appareil. Replié par défaut jusqu'à lecture du choix. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch { /* le menu reste utilisable sans stockage local */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch { /* le choix reste appliqué pour cette session */ }
  }, [collapsed, loaded]);

  return [collapsed, useCallback(() => setCollapsed((value) => !value), [])];
}
