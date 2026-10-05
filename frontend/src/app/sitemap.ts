import type { MetadataRoute } from "next";

import { CONTENT_UPDATED_ISO, SITE_URL } from "@/lib/site";

// Uniquement des pages indexables (les pages légales sont en noindex : les lister créerait une alerte
// « URL envoyée marquée noindex » dans Search Console). `lastModified` = vraie date de révision du
// contenu, pas la date du build : un lastmod qui change à chaque déploiement est ignoré par Google.
const PAGES: { path: string; lastModified: string; priority: number }[] = [
  { path: "", lastModified: CONTENT_UPDATED_ISO, priority: 1 },
  { path: "/a-propos", lastModified: CONTENT_UPDATED_ISO, priority: 0.9 },
  { path: "/guide/registre-visiteurs-numerique", lastModified: CONTENT_UPDATED_ISO, priority: 0.8 },
  { path: "/rekollecte-plus", lastModified: CONTENT_UPDATED_ISO, priority: 0.8 },
  { path: "/aide", lastModified: "2026-09-21", priority: 0.6 },
  { path: "/credits", lastModified: "2026-09-21", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({ url: `${SITE_URL}${page.path}`, lastModified: page.lastModified, priority: page.priority }));
}
