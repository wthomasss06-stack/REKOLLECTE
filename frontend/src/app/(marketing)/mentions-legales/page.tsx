import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/marketing/LegalLayout";

export const metadata: Metadata = { title: "Mentions légales", robots: { index: false } };

export default function MentionsLegalesPage() {
  return <LegalLayout title="Mentions légales">
    <h2>Éditeur du site</h2>
    <p>REKOLLECTE est édité à Abidjan, Côte d’Ivoire.</p>
    <p>Conception et développement : voir la page <Link href="/credits">Crédits</Link>.</p>
    <p>Contact officiel : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a><br />Téléphone : <a href="tel:+2250142507750">+225 01 42 50 77 50</a></p>
    <p>La forme juridique, le numéro RCCM et l’adresse physique complète de l’éditeur sont en cours de formalisation et seront ajoutés dès leur disponibilité.</p>

    <h2>Objet du service</h2>
    <p>REKOLLECTE est un service numérique qui digitalise le registre d’accueil des établissements. Le service permet de configurer plusieurs formulaires, de les diffuser par QR Code sur plusieurs points d’accueil ou tablettes, puis de consulter les entrées, signatures et statistiques selon le rôle des membres. Les parcours de création sont guidés par modale ; le branding de l’établissement est réservé au Patron et les comptes peuvent être désactivés selon leur rôle.</p>

    <h2>Hébergement et infrastructure</h2>
    <p>Le projet est versionné et déployé depuis GitHub. L’hébergement technique est réparti comme suit :</p>
    <ul><li><strong>Frontend :</strong> Vercel.</li><li><strong>Backend applicatif :</strong> Render.</li><li><strong>Base de données :</strong> Neon, PostgreSQL.</li><li><strong>Images (logos, photos de profil) :</strong> Cloudinary.</li></ul>
    <p>Les conditions contractuelles des fournisseurs d’infrastructure sont distinctes des présentes mentions légales.</p>

    <h2>Propriété intellectuelle</h2>
    <p>La structure, les textes, le logo, les interfaces et le code de REKOLLECTE sont protégés par les règles applicables de propriété intellectuelle, sauf éléments appartenant à des tiers. Toute reproduction ou réutilisation non autorisée est interdite.</p>

    <h2>Responsabilité des données visiteurs</h2>
    <p>L’éditeur conçoit et opère l’outil technique. Chaque établissement utilisateur détermine les données demandées à ses visiteurs, les finalités de collecte et les durées de conservation ; il lui appartient d’informer les personnes concernées et de respecter les obligations applicables.</p>

    <h2>Droit applicable</h2>
    <p>Le site et le service sont soumis au droit ivoirien, sous réserve des règles impératives applicables.</p>
    <div className="legal-warning">Les coordonnées de contact sont publiées. La forme juridique, le numéro RCCM et l’adresse physique complète seront ajoutés dès la finalisation des documents légaux de l’éditeur.</div>
  </LegalLayout>;
}
