"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "r3s3ignement-theme";
export type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Lit/ecrit le theme (localStorage + classe .dark sur <html>). Le script inline
 * dans layout.tsx applique déjà la bonne classe avant l’hydratation (anti-flash) ;
 * ce hook ne fait que garder React synchronisé avec cet état pour le toggle. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(current);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // stockage indisponible (navigation privee...) : la preference ne survivra
        // pas au rechargement, mais le toggle reste fonctionnel pour la session.
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}

/** Script exécuté en inline, avant l’hydratation React (voir layout.tsx), pour
 * éviter un flash du mauvais thème au chargement. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
