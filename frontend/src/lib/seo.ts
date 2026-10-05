import type { Metadata } from "next";

import { OG_IMAGE, SITE_NAME } from "@/lib/site";

/** Métadonnées d'une page indexable : titre complet (sans le suffixe du gabarit), description, canonique, Open Graph. */
export function pageMeta({ title, description, path, type = "website" }: { title: string; description: string; path: string; type?: "website" | "article" }): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type, locale: "fr_FR", siteName: SITE_NAME, title, description, url: path, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}
