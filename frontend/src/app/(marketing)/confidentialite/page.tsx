import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/marketing/LegalLayout";
import { DocHero } from "@/components/marketing/figures/DocHero";
import { DataFlowFigure } from "@/components/marketing/figures/DataFlowFigure";
import { CookiesFigure } from "@/components/marketing/figures/CookiesFigure";
import { RightsFigure } from "@/components/marketing/figures/RightsFigure";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import CookiePreferencesButton from "@/components/privacy/CookiePreferencesButton";

export const metadata: Metadata = { title: "Politique de confidentialité", robots: { index: false } };

export default function ConfidentialitePage() {
  return <LegalLayout title="Politique de confidentialité" art={<DocHero icon={LockKey} />}>
    <h2>Responsable du service</h2>
    <p>REKOLLECTE est édité à Abidjan, Côte d’Ivoire. Contact : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> — <a href="tel:+2250142507750">+225 01 42 50 77 50</a>. L’éditeur est responsable du traitement des comptes des membres, de la mesure d’audience de la vitrine, de la facturation et des avis reçus.</p>
    <p>Pour les données collectées auprès de ses propres visiteurs, chaque établissement utilisateur détermine les finalités, les champs et la durée de conservation et assume les responsabilités qui lui incombent ; l’éditeur agit alors comme prestataire technique : il héberge et traite ces données pour le compte de l’établissement. Son identité et son contact peuvent être affichés dans son propre parcours d’information.</p>

    <h2>Données traitées</h2>
    <h3>Membres de l’établissement</h3><p>Lors de la connexion avec Google ou Facebook, le service reçoit l’identifiant du compte chez le fournisseur, l’adresse e-mail, le nom et la photo de profil. Ces données servent à authentifier le membre, rattacher une invitation et appliquer son rôle Patron, Gérant ou Agent. Aucun mot de passe REKOLLECTE n’est stocké. Pour chaque session de connexion, le service enregistre aussi l’appareil (navigateur et système), l’adresse IP et les dates d’utilisation, afin de sécuriser le compte et de pouvoir révoquer une session ; ces informations suivent la durée de la session (14 jours). Un journal d’audit garde la trace des changements d’accès et d’administration de l’équipe (invitation, rôle, suspension).</p>
    <h3>Visiteurs</h3><p>Les champs collectés dépendent du formulaire configuré par l’établissement : par exemple nom, téléphone, email, société, motif ou signature. L’établissement choisit ces champs et demeure responsable de leur pertinence, de leur information préalable et de leur licéité.</p>
    <h3>Clients et réservations (REKOLLECTE+)</h3><p>Avec REKOLLECTE+, l’établissement peut tenir des fiches clients (nom, téléphone, e-mail, note), des ressources, des réservations, des encaissements et des rappels. L’établissement reste responsable de ces données et de l’information préalable de ses clients.</p>
    <h3>Abonnement et paiements</h3><p>Le paiement de l’abonnement se fait hors de l’application (par exemple Wave, Orange Money ou MTN MoMo) : aucun numéro de carte ni code de paiement n’est saisi dans REKOLLECTE. L’éditeur enregistre le nom de l’établissement, le plan, le montant, le mode de paiement, la référence et la période couverte.</p>
    <h3>Avis envoyés depuis le service</h3><p>Le bouton d’avis enregistre la catégorie, le message, la page d’où il est envoyé et, si la personne le souhaite, une adresse e-mail pour être recontactée.</p>
    <h3>Données techniques</h3><p>Des journaux techniques nécessaires à la sécurité et à la limitation des abus peuvent être traités. Le service conserve également, pour chaque point d’accueil, son nom, le formulaire associé, l’état du QR et, lorsque l’appareil contacte le serveur, une date de dernière activité. L’appareil kiosque peut conserver localement le formulaire et des soumissions en attente dans son stockage navigateur avant synchronisation.</p>

    <h3>Mesure d’audience de la vitrine</h3><p>Sur les pages publiques du site (accueil, pages de présentation, connexion, pages légales), et <strong>uniquement si vous l’acceptez</strong> dans le bandeau cookies, REKOLLECTE enregistre : les pages consultées, la date, le type d’appareil (ordinateur, téléphone, tablette), le navigateur et le système, la provenance (site référent ou paramètre <code>utm_source</code>, sans l’adresse complète) et quelques clics d’action (bouton de connexion, téléphone, e-mail, WhatsApp). Ne sont <strong>jamais</strong> enregistrés : l’adresse IP, le nom, l’e-mail, le contenu de ce que vous saisissez, ni quoi que ce soit venant de l’application connectée, de l’administration ou des formulaires remplis par les visiteurs des établissements. Si vous refusez, seul un compteur anonyme du nombre de refus est incrémenté, sans identifiant ni cookie. Ces mesures servent à comprendre la fréquentation du site et sont consultables par l’administration de la plateforme. Elles sont conservées 13 mois au maximum.</p>

    <h2>Finalités</h2><ul><li>Authentifier les membres et gérer les invitations.</li><li>Créer plusieurs formulaires et les affecter à plusieurs points d’accueil ou tablettes.</li><li>Fournir le formulaire, le registre, le mode kiosque et la synchronisation offline par appareil.</li><li>Afficher les signatures et produire les statistiques opérationnelles du registre.</li><li>Prévenir les doublons, les abus et les accès non autorisés.</li><li>Tenir les fiches clients et les réservations (REKOLLECTE+).</li><li>Gérer l’abonnement et la facturation.</li><li>Traiter les avis reçus pour corriger et améliorer le service.</li></ul>

    <h2>Destinataires et infrastructure</h2><p>Les données sont accessibles aux membres autorisés de l’établissement selon leur rôle. Le projet est versionné depuis GitHub et déployé avec une infrastructure composée de <strong>Vercel</strong> pour le frontend, <strong>Render</strong> pour le backend applicatif et <strong>Neon</strong> pour la base PostgreSQL. <strong>Cloudinary</strong> héberge les images (logos, photos de profil, visuels du site). <strong>Google</strong> et <strong>Facebook</strong> interviennent pour la connexion. Ces prestataires peuvent être situés hors de Côte d’Ivoire : les données peuvent donc y être transférées. Aucun service publicitaire ni outil de mesure d’audience tiers n’est intégré : la mesure d’audience de la vitrine est réalisée par REKOLLECTE elle-même, sur l’infrastructure décrite ci-dessus, sans transmission à un tiers.</p>

        <DataFlowFigure />
    <h2>Cookies et stockage local</h2><p>Un cookie httpOnly de renouvellement, strictement nécessaire, peut être utilisé pour maintenir la connexion des membres après actualisation. L’interface visiteur utilise le stockage local du navigateur pour le mode offline et la file de synchronisation. Aucun cookie publicitaire n’est nécessaire au fonctionnement du service. Des informations de courte durée en session peuvent servir à afficher un accueil de connexion ou de déconnexion adapté. Votre choix dans le bandeau cookies est mémorisé dans le stockage local de votre navigateur (<code>rk_cookie_consent</code>) pendant 6 mois, puis le bandeau vous le redemande.</p>
    <CookiesFigure />
    <div className="table-wrap"><table>
      <thead><tr><th>Nom</th><th>Rôle</th><th>Durée</th><th>Consentement</th></tr></thead>
      <tbody>
        <tr><td><code>qr_refresh_token</code></td><td>Maintenir la connexion des membres (httpOnly)</td><td>14 jours</td><td>Non requis (strictement nécessaire)</td></tr>
        <tr><td><code>rk_vid</code></td><td>Reconnaître un navigateur d’une visite à l’autre (identifiant aléatoire, sans lien avec votre identité)</td><td>13 mois</td><td>Requis — mesure d’audience</td></tr>
        <tr><td><code>rk_sid</code></td><td>Regrouper les pages d’une même visite</td><td>30 minutes d’inactivité</td><td>Requis — mesure d’audience</td></tr>
        <tr><td><code>rk_cookie_consent</code> (stockage local)</td><td>Mémoriser votre choix</td><td>6 mois</td><td>Non requis</td></tr>
      </tbody>
    </table></div>
    <p>Vous pouvez changer d’avis à tout moment, et faire effacer les données de mesure rattachées à votre navigateur depuis le modal ci-dessous ou depuis « Gérer les cookies » en bas de chaque page.</p>
    <p><CookiePreferencesButton /></p>

    <h2>Conservation et sécurité</h2><p>Les données sont conservées uniquement pendant la durée nécessaire à leur finalité. Durées appliquées par défaut :</p>
    <div className="table-wrap"><table>
      <thead><tr><th>Données</th><th>Durée</th><th>Suppression</th></tr></thead>
      <tbody>
        <tr><td>Visites du registre</td><td>365 jours (l’établissement peut choisir de 30 à 3 650 jours)</td><td>Automatique</td></tr>
        <tr><td>Fiches clients (REKOLLECTE+)</td><td>730 jours après la dernière activité</td><td>À la demande de la personne ou de l’établissement</td></tr>
        <tr><td>Journal d’audit</td><td>365 jours</td><td>Manuelle à ce jour</td></tr>
        <tr><td>Comptes des membres</td><td>Tant que le compte est actif</td><td>À la désactivation du compte</td></tr>
        <tr><td>Paiements et reçus</td><td>10 ans (obligation comptable)</td><td>Hors suppression des visites</td></tr>
        <tr><td>Mesure d’audience de la vitrine</td><td>13 mois maximum</td><td>Automatique</td></tr>
      </tbody>
    </table></div>
    <p>Le service applique notamment une isolation par organisation, une validation serveur, un contrôle de rôle, une limitation des requêtes publiques et la possibilité de régénérer le QR.</p>

    <h2>Droits des personnes</h2><p>Selon la réglementation applicable, les personnes peuvent demander l’accès, la rectification ou la suppression de leurs données. La demande doit être adressée en priorité à l’établissement qui a collecté les informations : le Patron peut, depuis Paramètres › Données, exporter ou supprimer toutes les données d’une personne retrouvée par son téléphone ou son e-mail. Les membres peuvent également demander la désactivation de leur compte ; le Patron peut suspendre ou supprimer l’espace de l’établissement selon les droits prévus. Pour contacter l’éditeur : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> ou <a href="tel:+2250142507750">+225 01 42 50 77 50</a>.</p>
        <RightsFigure />
    <div className="legal-warning">Cette politique sera relue juridiquement avant toute commercialisation payante. Identité de l’éditeur : voir les <Link href="/mentions-legales">mentions légales</Link>.</div>
  </LegalLayout>;
}
