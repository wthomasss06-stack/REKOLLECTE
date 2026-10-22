import type { Metadata, Viewport } from "next";
import { Chelsea_Market } from "next/font/google";

import Providers from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/hooks/useTheme";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

// Police unique du site appliquée partout : Chelsea Market.
const sans = Chelsea_Market({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "REKOLLECTE | Logiciel de gestion des visiteurs par QR Code", template: "%s — REKOLLECTE" },
  description: SITE_DESCRIPTION,
  keywords: ["logiciel de gestion des visiteurs", "registre numérique des visiteurs", "gestion des visiteurs par QR code", "logiciel de gestion de l’accueil", "formulaire d’accueil numérique", "registre de visite en ligne", "logiciel de suivi des visiteurs", "gestion des visiteurs en entreprise", "registre visiteurs Côte d’Ivoire", "cahier de visite digital", "visiteurs sans compte", "REKOLLECTE", "REKOLLECTE+", "Abidjan"],
  applicationName: "REKOLLECTE",
  authors: [{ name: "AKATech Studio", url: "https://akatech.vercel.app" }],
  publisher: "AKATech Studio",
  category: "business",
  openGraph: { type: "website", locale: "fr_FR", siteName: "REKOLLECTE", title: "REKOLLECTE | Logiciel de gestion des visiteurs par QR Code", description: SITE_DESCRIPTION, url: SITE_URL, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: "REKOLLECTE | Logiciel de gestion des visiteurs par QR Code", description: SITE_DESCRIPTION, images: [OG_IMAGE.url] },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#173426",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={sans.variable} suppressHydrationWarning>
      <body>
        {/* Applique la classe .dark avant l’hydratation React : evite un flash du
            mauvais theme au chargement (lit localStorage puis prefers-color-scheme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
