"use client";

import { useEffect } from "react";

import type { OrganizationCapabilities } from "@/types";

const IDENTITIES = {
  base: { title: "REKOLLECTE", icon: "/favicon.png", apple: "/icons/icon-192.png", manifest: "/manifest.json" },
  karnet: { title: "REKOLLECTE+", icon: "/brand/karnet-favicon.png", apple: "/icons/karnet-apple-touch-icon.png", manifest: "/manifest-karnet.json" },
};

function setLinkIcon(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Bascule l'identité du navigateur ET du manifest PWA (titre d'onglet, favicon,
 * manifest installable) entre Renseignement et REKOLLECTE+ selon
 * `organization.capabilities.karnet` — un état décidé côté serveur uniquement (cf. plan
 * de bascule Niveau 1 → Niveau 2), jamais calculé ici.
 *
 * Le nom et le logo de CHAQUE établissement (orgName/orgLogo affichés dans la Sidebar)
 * restent inchangés : c'est l'identité de l'entreprise du client, pas celle du produit.
 * Seule l'identité produit (ce composant) reflète le palier actif.
 *
 * Deux manifests statiques (public/manifest.json et public/manifest-karnet.json) plutôt
 * qu'un manifest généré côté serveur par établissement : le lien <link rel="manifest">
 * est réécrit ici avant que l'utilisateur ne déclenche "Ajouter à l'écran d'accueil",
 * ce qui suffit en pratique et évite un aller-retour serveur à chaque chargement.
 */
export default function ProductIdentity({ capabilities }: { capabilities?: OrganizationCapabilities }) {
  const isKarnet = Boolean(capabilities?.karnet);

  useEffect(() => {
    const identity = isKarnet ? IDENTITIES.karnet : IDENTITIES.base;
    document.title = identity.title;
    setLinkIcon("icon", identity.icon);
    setLinkIcon("apple-touch-icon", identity.apple);
    setLinkIcon("manifest", identity.manifest);
  }, [isKarnet]);

  return null;
}
