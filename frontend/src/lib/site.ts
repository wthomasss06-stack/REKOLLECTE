// Constante partagée entre layout.tsx (metadata, server-only) et la page marketing
// (JSON-LD, "use client") : un module à part évite qu'importer cette seule valeur
// n'entraîne tout layout.tsx — et son export `metadata` réservé au serveur — dans
// le bundle client.
export const SITE_URL = "https://rekollecte-ci.vercel.app";
