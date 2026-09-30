import type { Metadata } from "next";
import LegalLayout from "@/components/marketing/LegalLayout";

export const metadata: Metadata = { title: "Conditions Générales d’Utilisation", robots: { index: false } };

export default function CguPage() {
  return <LegalLayout title="Conditions Générales d’Utilisation">
    <h2>1. Objet</h2>
    <p>Les présentes CGU encadrent l’accès et l’utilisation de REKOLLECTE, produit conçu et édité par <strong>AKATech Studio</strong>, entreprise digitale basée à Abidjan, Côte d’Ivoire. Contact : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> — <a href="tel:+2250142507750">+225 01 42 50 77 50</a>.</p>

    <h2>2. Comptes, rôles et invitations</h2>
    <ul><li>L’authentification des membres de l’établissement se fait exclusivement avec Google. Aucun mot de passe REKOLLECTE n’est créé.</li><li>Le Patron crée et administre l’espace de son établissement. Il peut configurer le formulaire, gérer le QR Code, inviter les membres et exporter le registre.</li><li>Le Gérant dispose des droits opérationnels nécessaires au fonctionnement quotidien, sans accès aux actions sensibles réservées au Patron.</li><li>Le Staff consulte le registre et utilise le mode Accueil / tablette, sans pouvoir modifier la configuration de l’établissement.</li><li>Le rattachement à une entreprise se fait par invitation et correspondance avec l’adresse Google invitée. Aucun utilisateur ne peut s’attribuer un rôle lui-même.</li></ul>

    <h2>3. Utilisation du service</h2>
    <p>Le Patron est responsable du contenu du formulaire, des motifs de visite demandés, de la base légale de la collecte et de l’information donnée à ses visiteurs. Le visiteur reste responsable de l’exactitude des informations qu’il transmet.</p>
    <p>Le service propose plusieurs formulaires par établissement. Chaque formulaire peut être activé, nommé et affecté à un ou plusieurs points d’accueil. Un établissement peut donc distinguer, par exemple, l’accueil visiteurs, les livraisons et l’accès chantier.</p>
    <p>Chaque point d’accueil peut disposer de son propre QR Code, de son nom de lieu et d’une tablette identifiée. Une tablette ou un téléphone peut conserver temporairement le formulaire et les soumissions hors connexion, puis les synchroniser dès que le réseau revient. Les signatures peuvent être collectées lorsque le formulaire le prévoit.</p>

    <h2>4. Registre et statistiques</h2>
    <p>Le dashboard permet de consulter le registre, les signatures enregistrées, le volume de visites, les heures de pointe et les motifs fréquents. Le registre se rafraîchit automatiquement pendant qu’il est ouvert. Ces indicateurs sont des agrégats opérationnels et ne constituent pas un service d’analyse indépendant.</p>

    <h2>5. Disponibilité</h2>
    <p>Le service est fourni en l’état. Le fonctionnement hors connexion dépend de chaque appareil kiosque et de son cache local. L’établissement est responsable de l’installation, de la sécurité physique et de l’utilisation de ses tablettes. Un QR est rattaché à un point d’accueil et à un formulaire ; sa désactivation ou sa suppression peut interrompre ce parcours. Un appareil resté hors connexion peut toutefois conserver temporairement son ancien cache jusqu’à sa reconnexion.</p>

    <h2>6. Tarification et résiliation</h2>
    <p>Le service ne comporte pas de paiement intégré dans la version actuelle. Les conditions commerciales, la tarification et les modalités de suppression définitive d’un espace devront être précisées par AKATech Studio avant une commercialisation payante.</p>

    <h2>7. Responsabilité</h2>
    <p>AKATech Studio fournit l’outil technique. L’établissement utilisateur reste responsable de ses obligations légales, de ses formulaires, de ses visiteurs et de la conservation des données. L’éditeur ne saurait être responsable d’une utilisation contraire à la réglementation applicable.</p>

    <h2>8. Paramètres, départ et suspension</h2>
    <p>La création d’un formulaire ou d’un QR supplémentaire se fait depuis les paramètres, au moyen d’une modale de création. Le Patron peut modifier le nom et le logo de l’entreprise, suspendre l’espace ou le supprimer après confirmation. Un Gérant ou un membre du Staff peut quitter l’équipe et désactiver son compte. Les droits restent contrôlés par le serveur selon le rôle attribué.</p>

    <h2>9. Droit applicable et contact</h2>
    <p>Les présentes CGU sont soumises au droit ivoirien, sous réserve des règles impératives applicables. Pour toute question relative au service : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> ou <a href="tel:+2250142507750">+225 01 42 50 77 50</a>.</p>
    <div className="legal-warning">La forme juridique, le numéro RCCM et l’adresse physique complète d’AKATech Studio sont en cours de formalisation et seront ajoutés dès leur disponibilité. Les présentes CGU devront être validées juridiquement avant une commercialisation payante.</div>
  </LegalLayout>;
}
