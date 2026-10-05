// Constantes partagées entre layout.tsx (metadata, serveur), robots/sitemap et les composants client.
// Module à part : importer ces valeurs n'entraîne pas layout.tsx (et son export `metadata`, réservé
// au serveur) dans le bundle client.

// URL publique canonique. NEXT_PUBLIC_SITE_URL permet de passer à un domaine personnalisé
// (recommandé pour la marque) sans toucher au code : robots, sitemap, canoniques et JSON-LD suivent.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rekollecte-ci.vercel.app").replace(/\/+$/, "");
export const SITE_NAME = "REKOLLECTE";
export const OG_IMAGE = { url: "/og/rekollecte-og.jpg", width: 1200, height: 630, alt: "REKOLLECTE : le registre visiteurs par QR Code, sans compte, même hors ligne" } as const;
export const PUBLISHER = { name: "AKATech Studio", url: "https://akatech.vercel.app", logo: "/akatech-studio-logo.webp" } as const;

// Date de dernière révision éditoriale des pages de contenu (signal de fraîcheur, à mettre à jour avec le contenu).
export const CONTENT_UPDATED_ISO = "2026-10-04";
export const CONTENT_UPDATED_LABEL = "4 octobre 2026";

// Identifiants JSON-LD stables : relient les entités entre elles (éditeur, site, applications) sur toutes les pages.
export const IDS = {
  publisher: `${SITE_URL}/#publisher`,
  website: `${SITE_URL}/#website`,
  app: `${SITE_URL}/#rekollecte`,
  appPlus: `${SITE_URL}/#rekollecte-plus`,
} as const;
