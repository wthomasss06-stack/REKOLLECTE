import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Aide REKOLLECTE : créer son espace, QR Code, équipe et rôles",
  description: "Guide pas à pas de REKOLLECTE : créer l’espace de votre établissement, préparer le formulaire visiteur, générer les QR Codes, inviter l’équipe et comprendre les rôles Patron, Gérant et Agent.",
  path: "/aide",
});

export default function AideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
