/**
 * Base de l'API — source unique pour les appels « publics » (formulaire visiteur, synchronisation hors ligne,
 * sonde de santé, espace admin).
 *
 * Dans le navigateur on passe TOUJOURS par le proxy same-origin `/api/v1` (rewrite Next.js → Render) :
 * `NEXT_PUBLIC_API_URL` n'est pas fiable en production (absente → repli sur localhost, ou pointée vers
 * Vercel/Render selon la configuration), ce qui coupait le formulaire visiteur et la synchronisation alors
 * que le reste de l'application fonctionnait. Côté serveur (rendu Next.js), on garde l'URL d'environnement.
 */
export const API_BASE = typeof window !== "undefined"
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");

/** Une réponse n'est celle de l'API que si c'est du JSON : la page d'attente de Render est du HTML (200). */
export function isApiJsonResponse(response: Pick<Response, "headers">): boolean {
  return (response.headers.get("content-type") || "").includes("json");
}
