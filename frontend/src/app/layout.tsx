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
  title: { default: "REKOLLECTE | Registre visiteurs QR Code & gestion d’établissement", template: "%s — REKOLLECTE" },
  description: SITE_DESCRIPTION,
  keywords: ["registre visiteurs numérique", "QR Code accueil", "registre digital", "cahier de visite digital", "tablette accueil", "visiteurs sans compte", "gestion d’établissement", "logiciel de réservation", "logiciel gestion hôtel", "REKOLLECTE", "REKOLLECTE+", "Abidjan", "Côte d’Ivoire"],
  applicationName: "REKOLLECTE",
  authors: [{ name: "AKATech Studio", url: "https://akatech.vercel.app" }],
  publisher: "AKATech Studio",
  category: "business",
  openGraph: { type: "website", locale: "fr_FR", siteName: "REKOLLECTE", title: "REKOLLECTE | Registre visiteurs QR Code & gestion d’établissement", description: SITE_DESCRIPTION, url: SITE_URL, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: "REKOLLECTE | Registre visiteurs & gestion d’établissement", description: SITE_DESCRIPTION, images: [OG_IMAGE.url] },
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
    <html lang="fr" className={sans.variable}>
      <body>
        {/* Applique la classe .dark avant l'hydratation React : evite un flash du
            mauvais theme au chargement (lit localStorage puis prefers-color-scheme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
