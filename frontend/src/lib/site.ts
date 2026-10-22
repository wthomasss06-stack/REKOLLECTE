// Constantes partagées entre layout.tsx (metadata, serveur), robots/sitemap et les composants client.
// Module à part : importer ces valeurs n’entraîne pas layout.tsx (et son export `metadata`, réservé
// au serveur) dans le bundle client.

// URL publique canonique. NEXT_PUBLIC_SITE_URL permet de passer à un domaine personnalisé
// (recommandé pour la marque) sans toucher au code : robots, sitemap, canoniques et JSON-LD suivent.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rekollecte-ci.vercel.app").replace(/\/+$/, "");
export const SITE_NAME = "REKOLLECTE";
// Description unique (snippet Google, Open Graph, Twitter) : valeur proposée, puis passage à REKOLLECTE+.
export const SITE_DESCRIPTION =
  "Logiciel de gestion des visiteurs par QR Code : registre numérique sans compte pour le visiteur, même hors ligne. Gratuit pendant le lancement, conçu à Abidjan.";
export const OG_IMAGE = { url: "/og/rekollecte-og.jpg", width: 1200, height: 630, alt: "REKOLLECTE : le registre visiteurs par QR Code, sans compte, même hors ligne" } as const;
export const PUBLISHER = { name: "AKATech Studio", url: "https://akatech.vercel.app", logo: "/akatech-studio-logo.webp" } as const;

// Date de dernière révision éditoriale des pages de contenu (signal de fraîcheur, à mettre à jour avec le contenu).
export const CONTENT_UPDATED_ISO = "2026-10-22";
export const CONTENT_UPDATED_LABEL = "22 octobre 2026";
// Révision des pages de référencement (accueil, guide du registre numérique, pages « logiciel » et « QR Code »).
export const SEO_UPDATED_ISO = "2026-10-22";
export const SEO_UPDATED_LABEL = "22 octobre 2026";

// Identifiants JSON-LD stables : relient les entités entre elles (éditeur, site, applications) sur toutes les pages.
export const IDS = {
  publisher: `${SITE_URL}/#publisher`,
  website: `${SITE_URL}/#website`,
  app: `${SITE_URL}/#rekollecte`,
  appPlus: `${SITE_URL}/#rekollecte-plus`,
} as const;
