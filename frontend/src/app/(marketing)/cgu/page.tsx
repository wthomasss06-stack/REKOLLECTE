import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/marketing/LegalLayout";
import { FREE_UNTIL_LABEL } from "@/lib/pricing";

export const metadata: Metadata = { title: "Conditions Générales d’Utilisation", robots: { index: false } };

export default function CguPage() {
  return <LegalLayout title="Conditions Générales d’Utilisation">
    <h2>1. Objet</h2>
    <p>Les présentes CGU encadrent l’accès et l’utilisation de REKOLLECTE, service édité à Abidjan, Côte d’Ivoire. Contact : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> — <a href="tel:+2250142507750">+225 01 42 50 77 50</a>.</p>

    <h2>2. Comptes, rôles et invitations</h2>
    <ul><li>Les membres de l’établissement se connectent avec Google ou Facebook. Aucun mot de passe REKOLLECTE n’est créé, et un même compte peut être relié à plusieurs méthodes de connexion depuis les paramètres.</li><li>Le Patron crée et administre l’espace de son établissement. Il peut configurer le formulaire, gérer le QR Code, inviter les membres et exporter le registre.</li><li>Le Gérant dispose des droits opérationnels nécessaires au fonctionnement quotidien, sans accès aux actions sensibles réservées au Patron.</li><li>L’Agent consulte le registre et utilise le mode Accueil / tablette, sans pouvoir modifier la configuration de l’établissement.</li><li>Le rattachement à un établissement se fait par invitation et correspondance avec l’adresse e-mail invitée. Aucun utilisateur ne peut s’attribuer un rôle lui-même.</li></ul>

    <h2>3. Utilisation du service</h2>
    <p>Le Patron est responsable du contenu du formulaire, des motifs de visite demandés, de la base légale de la collecte et de l’information donnée à ses visiteurs. Le visiteur reste responsable de l’exactitude des informations qu’il transmet.</p>
    <p>Le service propose plusieurs formulaires et points d’accueil par établissement. Une tablette ou un téléphone peut conserver temporairement les soumissions hors ligne, puis les synchroniser au retour du réseau.</p>

    <h2>4. Registre et statistiques</h2>
    <p>Les statistiques affichées sont des indicateurs opérationnels et ne constituent pas un service d’analyse indépendant.</p>

    <h2>5. Disponibilité</h2>
    <p>Le service est fourni en l’état. Le fonctionnement hors ligne dépend de chaque appareil kiosque et de son cache local. L’établissement est responsable de l’installation, de la sécurité physique et de l’utilisation de ses tablettes. Un QR est rattaché à un point d’accueil et à un formulaire ; sa désactivation ou sa suppression peut interrompre ce parcours. Un appareil resté hors ligne peut toutefois conserver temporairement son ancien cache jusqu’à sa reconnexion.</p>

    <h2>6. Tarification et résiliation</h2>
    <p>Le service est gratuit jusqu’au {FREE_UNTIL_LABEL} : jusqu’à cette date, toutes les fonctions sont accessibles sans limite de plan. À compter de cette date, des offres payantes (Essentiel, REKOLLECTE+ et, sur devis, Entreprise) s’appliquent selon la grille publiée sur la page d’accueil, en FCFA, par établissement et par mois. Les prix et les limites de chaque offre peuvent être ajustés avant cette date.</p>
    <p>Les modalités de facturation (taxes, paiement, renouvellement, suspension, remboursement) seront précisées par l’éditeur avant la première facturation, et chaque établissement sera prévenu par écrit avant toute limitation de son accès. À la fin d’un essai ou en cas d’impayé, l’espace repasse à l’offre gratuite : les données ne sont pas supprimées, l’enregistrement des visiteurs n’est jamais interrompu et l’export de sortie reste disponible. Le service ne comporte pas de paiement intégré en ligne à ce stade.</p>

    <h2>7. Responsabilité</h2>
    <p>L’éditeur fournit l’outil technique. L’établissement utilisateur reste responsable de ses obligations légales, de ses formulaires, de ses visiteurs et de la conservation des données. L’éditeur ne saurait être responsable d’une utilisation contraire à la réglementation applicable.</p>

    <h2>8. Paramètres, départ et suspension</h2>
    <p>Le Patron peut modifier le nom et le logo de l’établissement, suspendre l’espace ou le supprimer après confirmation. Un Gérant ou un Agent peut quitter l’équipe et désactiver son compte. Les droits restent contrôlés par le serveur selon le rôle attribué.</p>

    <h2>9. Données personnelles, droit applicable et contact</h2>
    <p>Le traitement des données personnelles est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>. Les présentes CGU sont soumises au droit ivoirien, sous réserve des règles impératives applicables. Pour toute question relative au service : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> ou <a href="tel:+2250142507750">+225 01 42 50 77 50</a>.</p>
    <div className="legal-warning">Ces conditions seront validées juridiquement avant toute commercialisation payante. Identité de l’éditeur : voir les <Link href="/mentions-legales">mentions légales</Link>.</div>
  </LegalLayout>;
}
