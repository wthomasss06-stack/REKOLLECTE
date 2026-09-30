import type { Metadata } from "next";
import LegalLayout from "@/components/marketing/LegalLayout";

export const metadata: Metadata = { title: "Mentions légales", robots: { index: false } };

export default function MentionsLegalesPage() {
  return <LegalLayout title="Mentions légales">
    <h2>Éditeur du site et concepteur du produit</h2>
    <p><strong>AKATech Studio</strong>, entreprise digitale basée à Abidjan, Côte d’Ivoire.</p>
    <p>AKATech Studio conçoit et développe le produit R3NS3IGN3M3NT ainsi que ses interfaces, son infrastructure applicative et sa documentation.</p>
    <p>Contact officiel : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a><br />Téléphone : <a href="tel:+2250142507750">+225 01 42 50 77 50</a><br />Site : <a href="https://rekollecte.vercel.app/" target="_blank" rel="noreferrer">renseignement.vercel.app</a></p>
    <p>La forme juridique, le numéro RCCM et l’adresse physique complète de l’entreprise sont en cours de formalisation et seront ajoutés dès leur disponibilité.</p>

    <h2>Objet du service</h2>
    <p>R3NS3IGN3M3NT est un produit conçu par AKATech Studio pour digitaliser le registre d’accueil des établissements. Le service permet de configurer plusieurs formulaires, de les diffuser par QR Code sur plusieurs points d’accueil ou tablettes, puis de consulter les entrées, signatures et statistiques selon le rôle des membres. Les parcours de création sont guidés par modale ; le branding de l’entreprise est réservé au Patron et les comptes peuvent être désactivés selon leur rôle.</p>

    <h2>Hébergement et infrastructure</h2>
    <p>Le projet est versionné et déployé depuis GitHub. L’hébergement technique est réparti comme suit :</p>
    <ul><li><strong>Frontend :</strong> Vercel.</li><li><strong>Backend applicatif :</strong> Render.</li><li><strong>Base de données :</strong> Neon, PostgreSQL.</li></ul>
    <p>Les conditions contractuelles des fournisseurs d’infrastructure sont distinctes des présentes mentions légales.</p>

    <h2>Propriété intellectuelle</h2>
    <p>La structure, les textes, le logo, les interfaces et le code de R3NS3IGN3M3NT sont protégés par les règles applicables de propriété intellectuelle, sauf éléments appartenant à des tiers. Toute reproduction ou réutilisation non autorisée est interdite.</p>

    <h2>Responsabilité des données visiteurs</h2>
    <p>AKATech Studio conçoit et opère l’outil technique. Chaque établissement utilisateur détermine les données demandées à ses visiteurs, les finalités de collecte et les durées de conservation ; il lui appartient d’informer les personnes concernées et de respecter les obligations applicables.</p>

    <h2>Droit applicable</h2>
    <p>Le site et le service sont soumis au droit ivoirien, sous réserve des règles impératives applicables.</p>
    <div className="legal-warning">Les coordonnées de contact sont publiées. La forme juridique, le numéro RCCM et l’adresse physique complète seront ajoutés dès la finalisation des documents légaux d’AKATech Studio.</div>
  </LegalLayout>;
}
