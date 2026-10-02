import Landing from "@/components/marketing/landing/Landing";
import { JSON_LD } from "@/lib/landingData";

// Page serveur : le JSON-LD (Organization, SoftwareApplication, FAQPage) part dans le
// HTML initial ; toute l'interactivité (Lenis, GSAP) vit dans <Landing /> côté client.
export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Landing />
    </>
  );
}
