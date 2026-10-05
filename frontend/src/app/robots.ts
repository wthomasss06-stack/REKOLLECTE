import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Espaces privés : rien à indexer (derrière connexion). Les pages /connexion, /onboarding et /v/ sont,
// elles, volontairement CRAWLABLES : elles portent un en-tête X-Robots-Tag: noindex (voir next.config.mjs),
// qu'un robot ne peut lire que s'il a le droit de les visiter.
const PRIVATE = ["/dashboard", "/admin", "/api/"];

// Robots des moteurs/assistants IA : explicitement autorisés. Les jetons sont distincts par usage
// (recherche, requête d'un utilisateur, entraînement) : bloquer l'un ne bloque pas les autres.
const AI_BOTS = [
  "OAI-SearchBot", "ChatGPT-User", "GPTBot",
  "Claude-SearchBot", "Claude-User", "ClaudeBot",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
