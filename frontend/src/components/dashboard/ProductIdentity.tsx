"use client";

import { useEffect } from "react";

import type { OrganizationCapabilities } from "@/types";

// Un seul logo, le R, quel que soit le niveau : icône, icône d’écran d’accueil et manifest sont les mêmes pour REKOLLECTE et REKOLLECTE+.
// Seul le titre de l’onglet porte le nom du niveau.
const ICON = "/favicon.png";
const APPLE = "/icons/icon-192.png";
const MANIFEST = "/manifest.json";
const TITLES = { base: "REKOLLECTE", karnet: "REKOLLECTE+" };

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
 * Titre de l’onglet selon le niveau actif (`organization.capabilities.karnet`, décidé côté serveur uniquement, jamais calculé ici).
 * Le logo ne change pas : c’est toujours le R de REKOLLECTE (favicon, icône d’écran d’accueil et manifest identiques aux deux niveaux).
 * Le nom et le logo de CHAQUE établissement restent propres à l’établissement : ils ne sont pas l’identité du produit.
 */
export default function ProductIdentity({ capabilities }: { capabilities?: OrganizationCapabilities }) {
  const isKarnet = Boolean(capabilities?.karnet);

  useEffect(() => {
    document.title = isKarnet ? TITLES.karnet : TITLES.base;
    // Remet le R partout (une ancienne session a pu laisser l’icône du niveau 2 dans l’onglet ou le manifest).
    setLinkIcon("icon", ICON);
    setLinkIcon("apple-touch-icon", APPLE);
    setLinkIcon("manifest", MANIFEST);
  }, [isKarnet]);

  return null;
}
