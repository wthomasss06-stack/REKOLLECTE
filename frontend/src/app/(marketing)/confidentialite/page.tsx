import type { Metadata } from "next";
import LegalLayout from "@/components/marketing/LegalLayout";
import CookiePreferencesButton from "@/components/privacy/CookiePreferencesButton";

export const metadata: Metadata = { title: "Politique de confidentialité", robots: { index: false } };

export default function ConfidentialitePage() {
  return <LegalLayout title="Politique de confidentialité">
    <h2>Responsable du service</h2>
    <p><strong>AKATech Studio.</strong>, entreprise digitale basée à Abidjan, Côte d’Ivoire, conçoit et édite REKOLLECTE. Contact : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> — <a href="tel:+2250142507750">+225 01 42 50 77 50</a>. Site public : <a href="https://akatech.vercel.app/" target="_blank" rel="noreferrer">AKATech Studio.</a>.</p>
    <p>Pour les données collectées auprès de ses propres visiteurs, chaque établissement utilisateur détermine les finalités, les champs et la durée de conservation et assume les responsabilités qui lui incombent. Son identité et son contact peuvent être affichés dans son propre parcours d’information.</p>

    <h2>Données traitées</h2>
    <h3>Membres de l’établissement</h3><p>Lors de la connexion Google, le service reçoit notamment l’adresse email, le nom et l’avatar disponibles auprès de Google. Ces données servent à authentifier le membre, rattacher une invitation et appliquer son rôle Patron, Gérant ou Staff. Aucun mot de passe REKOLLECTE n’est stocké.</p>
    <h3>Visiteurs</h3><p>Les champs collectés dépendent du formulaire configuré par l’établissement : par exemple nom, téléphone, email, société, motif ou signature. L’établissement choisit ces champs et demeure responsable de leur pertinence, de leur information préalable et de leur licéité.</p>
    <h3>Données techniques</h3><p>Des journaux techniques nécessaires à la sécurité et à la limitation des abus peuvent être traités. Le service conserve également, pour chaque point d’accueil, son nom, le formulaire associé, l’état du QR et, lorsque l’appareil contacte le serveur, une date de dernière activité. L’appareil kiosque peut conserver localement le formulaire et des soumissions en attente dans son stockage navigateur avant synchronisation.</p>

    <h3>Mesure d’audience de la vitrine</h3><p>Sur les pages publiques du site (accueil, pages de présentation, connexion, pages légales), et <strong>uniquement si tu l’acceptes</strong> dans le bandeau cookies, REKOLLECTE enregistre : les pages consultées, la date, le type d’appareil (ordinateur, téléphone, tablette), le navigateur et le système, la provenance (site référent ou paramètre <code>utm_source</code>, sans l’adresse complète) et quelques clics d’action (bouton de connexion, téléphone, e-mail, WhatsApp). Ne sont <strong>jamais</strong> enregistrés : l’adresse IP, le nom, l’e-mail, le contenu de ce que tu saisis, ni quoi que ce soit venant de l’application connectée, de l’administration ou des formulaires remplis par les visiteurs des établissements. Si tu refuses, seul un compteur anonyme du nombre de refus est incrémenté, sans identifiant ni cookie. Ces mesures servent à comprendre la fréquentation du site et sont consultables par l’administration de la plateforme. Elles sont conservées 13 mois au maximum.</p>

    <h2>Finalités</h2><ul><li>Authentifier les membres et gérer les invitations.</li><li>Créer plusieurs formulaires et les affecter à plusieurs points d’accueil ou tablettes.</li><li>Fournir le formulaire, le registre, le mode kiosque et la synchronisation offline par appareil.</li><li>Afficher les signatures et produire les statistiques opérationnelles du registre.</li><li>Prévenir les doublons, les abus et les accès non autorisés.</li></ul>

    <h2>Destinataires et infrastructure</h2><p>Les données sont accessibles aux membres autorisés de l’établissement selon leur rôle. Le projet est versionné depuis GitHub et déployé avec une infrastructure composée de <strong>Vercel</strong> pour le frontend, <strong>Render</strong> pour le backend applicatif et <strong>Neon</strong> pour la base PostgreSQL. Google intervient pour l’authentification. Aucun service publicitaire ni outil de mesure d’audience tiers n’est intégré : la mesure d’audience de la vitrine est réalisée par REKOLLECTE elle-même, sur l’infrastructure décrite ci-dessus, sans transmission à un tiers.</p>

    <h2>Cookies et stockage local</h2><p>Un cookie httpOnly de renouvellement, strictement nécessaire, peut être utilisé pour maintenir la connexion des membres après actualisation. L’interface visiteur utilise le stockage local du navigateur pour le mode offline et la file de synchronisation. Aucun cookie publicitaire n’est nécessaire au fonctionnement du service. Des informations de courte durée en session peuvent servir à afficher un accueil de connexion ou de déconnexion adapté. Ton choix dans le bandeau cookies est mémorisé dans le stockage local de ton navigateur (<code>rk_cookie_consent</code>) pendant 6 mois, puis le bandeau te le redemande.</p>
    <div className="table-wrap"><table>
      <thead><tr><th>Nom</th><th>Rôle</th><th>Durée</th><th>Consentement</th></tr></thead>
      <tbody>
        <tr><td><code>refresh</code></td><td>Maintenir la connexion des membres (httpOnly)</td><td>Durée de la session de connexion</td><td>Non requis (strictement nécessaire)</td></tr>
        <tr><td><code>rk_vid</code></td><td>Reconnaître un navigateur d’une visite à l’autre (identifiant aléatoire, sans lien avec ton identité)</td><td>13 mois</td><td>Requis — mesure d’audience</td></tr>
        <tr><td><code>rk_sid</code></td><td>Regrouper les pages d’une même visite</td><td>30 minutes d’inactivité</td><td>Requis — mesure d’audience</td></tr>
        <tr><td><code>rk_cookie_consent</code> (stockage local)</td><td>Mémoriser ton choix</td><td>6 mois</td><td>Non requis</td></tr>
      </tbody>
    </table></div>
    <p>Tu peux changer d’avis à tout moment, et faire effacer les données de mesure rattachées à ton navigateur depuis le modal ci-dessous ou depuis « Gérer les cookies » en bas de chaque page.</p>
    <p><CookiePreferencesButton /></p>

    <h2>Conservation et sécurité</h2><p>Les données de visiteurs, les signatures, les comptes et les éléments de configuration doivent être conservés uniquement pendant la durée nécessaire à la finalité définie par l’établissement. La durée exacte doit être fixée par AKATech Studio. et chaque établissement selon les obligations applicables. Le service applique notamment une isolation par organisation, une validation serveur, un contrôle de rôle, une limitation des requêtes publiques et la possibilité de régénérer le QR.</p>

    <h2>Droits des personnes</h2><p>Selon la réglementation applicable, les personnes peuvent demander l’accès, la rectification ou la suppression de leurs données. La demande doit être adressée en priorité à l’établissement qui a collecté les informations. Les membres peuvent également demander la désactivation de leur compte ; le Patron peut suspendre ou supprimer l’espace de l’entreprise selon les droits prévus. Pour contacter AKATech Studio. : <a href="mailto:wthomasss06@gmail.com">wthomasss06@gmail.com</a> ou <a href="tel:+2250142507750">+225 01 42 50 77 50</a>.</p>
    <div className="legal-warning">La forme juridique, le numéro RCCM et l’adresse physique complète d’AKATech Studio. sont en cours de formalisation et seront ajoutés dès leur disponibilité. La présente politique doit être relue par un professionnel compétent avant la mise en ligne commerciale.</div>
  </LegalLayout>;
}
