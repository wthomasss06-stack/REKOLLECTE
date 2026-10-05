import type { Metadata } from "next";

import JsonLd from "@/components/marketing/JsonLd";
import Landing from "@/components/marketing/landing/Landing";
import { JSON_LD } from "@/lib/landingData";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Page serveur : le JSON-LD (éditeur, site, applications, FAQ) part dans le HTML initial ;
// toute l'interactivité (Lenis, GSAP) vit dans <Landing /> côté client.
export default function LandingPage() {
  return (
    <>
      <JsonLd data={JSON_LD} />
      <Landing />
    </>
  );
}
