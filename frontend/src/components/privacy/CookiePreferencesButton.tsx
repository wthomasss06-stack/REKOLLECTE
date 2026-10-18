"use client";

import { openCookiePreferences } from "@/lib/analytics";

/** Bouton « Gérer mes cookies » à placer dans les pages légales (ouvre le modal cookies en mode préférences). */
export default function CookiePreferencesButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className={`inline-flex min-h-11 items-center rounded-full border border-ink/40 px-5 text-sm font-bold text-ink transition-colors hover:bg-ink/5 ${className}`.trim()}
    >
      Gérer mes cookies
    </button>
  );
}
