import Link from "next/link";

import SeoPage, { SeoTable, type SeoFaq, type SeoLink } from "@/components/marketing/SeoPage";
import { pageMeta } from "@/lib/seo";

const PATH = "/logiciel-gestion-visiteurs";
const H1 = "Logiciel de gestion des visiteurs : comment bien choisir son outil";

const FAQ: SeoFaq[] = [
  { question: "Qu’est-ce qu’un logiciel de gestion des visiteurs ?", answer: "C’est un outil qui enregistre les personnes qui se présentent à l’accueil d’un établissement (qui, quand, pour qui, pourquoi) et conserve ces informations dans un registre numérique consultable et exportable. Il remplace le cahier de visites papier et sert aussi de logiciel de suivi des visiteurs." },
  { question: "Quelle différence entre un logiciel de gestion des visiteurs et un registre papier ?", answer: "Le logiciel garde un historique lisible et filtrable, protège les données de chaque visiteur (personne ne lit les lignes des autres) et produit des statistiques et des exports. Le cahier papier reste utilisable, mais il est difficile à relire, à rechercher et à archiver." },
  { question: "Faut-il un logiciel de gestion de l’accueil complet ou un simple registre ?", answer: "Cela dépend du besoin. Si l’objectif est de savoir qui est entré et pourquoi, un registre numérique suffit. Si l’établissement veut aussi gérer ses clients, ses ressources (chambre, table, salle) et ses réservations, il lui faut un niveau supérieur : c’est le rôle de REKOLLECTE+, activable depuis les paramètres." },
  { question: "REKOLLECTE est-il adapté aux entreprises ivoiriennes ?", answer: "Oui, il a été conçu à Abidjan par AKATech Studio : interface en français, utilisation sur téléphone, tablette ou ordinateur, et fonctionnement hors ligne avec synchronisation automatique quand le réseau est instable." },
  { question: "Combien coûte REKOLLECTE ?", answer: "REKOLLECTE est gratuit à ce jour. Les conditions pourront évoluer ; la page d’accueil et les conditions d’utilisation restent la référence." },
  { question: "Un logiciel de gestion des visiteurs suffit-il pour être en règle sur les données personnelles ?", answer: "Non. L’établissement qui tient le registre est le responsable du traitement et doit effectuer ses propres formalités (en Côte d’Ivoire, auprès de l’ARTCI) et informer ses visiteurs. Le logiciel est l’outil de collecte, pas une garantie de conformité. Ces repères sont informatifs et ne constituent pas un avis juridique." },
];

const RELATED: SeoLink[] = [
  { href: "/gestion-visiteurs-qr-code", title: "Gestion des visiteurs par QR Code", text: "Le parcours du visiteur, où afficher le QR Code et ce qui se passe sans réseau." },
  { href: "/guide/registre-visiteurs-numerique", title: "Registre numérique des visiteurs : le guide", text: "Pourquoi quitter le cahier papier et comment remplacer le registre en 5 étapes." },
  { href: "/rekollecte-plus", title: "REKOLLECTE+", text: "Fiches clients, ressources, réservations et encaissements pour aller plus loin que le registre." },
  { href: "/aide", title: "Centre d’aide", text: "Créer l’espace, préparer le formulaire, QR Codes, équipe et rôles." },
];

const DESCRIPTION = "Qu’est-ce qu’un logiciel de gestion des visiteurs, quelles fonctions exiger et comment l’installer en quelques minutes. Exemple avec REKOLLECTE, à Abidjan.";

export const metadata = pageMeta({
  title: "Logiciel de gestion des visiteurs : bien choisir son outil",
  description: DESCRIPTION,
  path: PATH,
});

export default function LogicielGestionVisiteursPage() {
  return (
    <SeoPage
      path={PATH}
      h1={H1}
      crumb="Logiciel de gestion des visiteurs"
      description={DESCRIPTION}
      faqs={FAQ}
      related={RELATED}
      answer={
        <p>
          <strong>Un logiciel de gestion des visiteurs enregistre qui se présente à l’accueil, quand, pour qui et pourquoi, puis garde tout dans un registre
          numérique que l’on peut rechercher, filtrer et exporter.</strong> Il remplace le cahier de visites papier. <Link href="/a-propos" className="underline underline-offset-4">REKOLLECTE</Link> est
          un logiciel de gestion des visiteurs par QR Code, conçu à Abidjan : le visiteur scanne, remplit et signe sans créer de compte, même sans internet. Il est gratuit à ce jour.
        </p>
      }
    >
      <h2>Ce que fait un logiciel de gestion des visiteurs</h2>
      <ul>
        <li><strong>Accueillir et enregistrer :</strong> identité, entreprise, personne visitée, motif, signature. Chaque visite est saisie au même format, sans écriture à déchiffrer.</li>
        <li><strong>Suivre :</strong> c’est aussi un logiciel de suivi des visiteurs. Registre du jour, historique, courbe de fréquentation par heure et motifs les plus fréquents.</li>
        <li><strong>Protéger :</strong> le visiteur ne voit pas les lignes de ceux qui l’ont précédé, et l’équipe n’accède qu’à ce que son rôle autorise.</li>
        <li><strong>Archiver et prouver :</strong> export CSV pour conserver ou contrôler, à la place d’un cahier qui se perd ou se remplit.</li>
      </ul>

      <h2>Les critères pour choisir son logiciel de gestion des visiteurs</h2>
      <p>
        Tous les outils ne se valent pas à l’accueil. Voici les points qui font la différence au quotidien, et ce que propose REKOLLECTE sur chacun.
      </p>
      <SeoTable
        caption="Critères de choix d’un logiciel de gestion des visiteurs et réponse de REKOLLECTE"
        head={["Critère", "Pourquoi c’est important", "Avec REKOLLECTE"]}
        rows={[
          ["Compte visiteur", "Chaque étape ralentit la file d’attente.", "Aucun compte ni application : scan, formulaire, signature."],
          ["Hors ligne", "Le réseau n’est pas garanti à l’entrée d’un bureau ou d’un chantier.", "Les visites restent sur l’appareil puis se synchronisent au retour de la connexion."],
          ["Formulaire adaptable", "Un hôtel, un restaurant et un chantier ne demandent pas la même chose.", "Modèles par secteur (bureau, restaurant, hôtel, chantier), champs modifiables à tout moment."],
          ["Rôles et accès", "Le patron voit tout, l’accueil enregistre.", "Rôles Patron, Gérant et Staff avec des permissions distinctes."],
          ["Export et statistiques", "Pour archiver, contrôler et comprendre l’affluence.", "Export CSV (Patron et Gérant), courbe horaire, motifs fréquents."],
          ["Mise en route", "Un outil trop long à configurer n’est jamais déployé.", "Connexion avec Google, formulaire choisi, QR Code affiché : quelques minutes."],
          ["Coût", "Un registre doit rester accessible aux petites structures.", "Gratuit à ce jour."],
        ]}
      />
      <p>
        Selon votre besoin, vérifiez aussi les fonctions qui ne figurent pas dans REKOLLECTE aujourd’hui : impression de badges, pré-enregistrement des
        invités ou contrôle biométrique (REKOLLECTE n’en collecte aucune donnée). Il est centré sur un registre rapide, sans contrainte pour le visiteur.
      </p>

      <h2>Gestion des visiteurs en entreprise et par secteur</h2>
      <p>
        La gestion des visiteurs en entreprise ne se limite pas aux grands sièges. Elle sert partout où des personnes extérieures entrent dans un lieu
        qu’il faut pouvoir retracer :
      </p>
      <ul>
        <li><strong>Bureaux et agences :</strong> nom, société, personne visitée, motif. Le logiciel de gestion de l’accueil remplace le cahier posé sur le comptoir.</li>
        <li><strong>Hôtels et restaurants :</strong> contact pour la réservation et suivi des passages ; avec <Link href="/rekollecte-plus">REKOLLECTE+</Link>, fiches clients et réservations.</li>
        <li><strong>Chantiers et sites à accès contrôlé :</strong> société, zone d’accès et signature, utiles en cas de contrôle.</li>
        <li><strong>Cliniques, cabinets et écoles :</strong> motif de la visite et personne attendue, sans demander plus que nécessaire.</li>
      </ul>

      <h2>Un logiciel de registre des visiteurs en Côte d’Ivoire</h2>
      <p>
        REKOLLECTE est conçu à Abidjan par AKATech Studio, avec les contraintes locales en tête : une interface en français, un usage mobile d’abord, un
        fonctionnement hors ligne quand la connexion est instable et un accès gratuit à ce jour. Pour la protection des données, la loi n° 2013-450 du
        19 juin 2013 encadre les données à caractère personnel sous le contrôle de l’ARTCI : l’établissement qui tient le registre est le responsable du traitement.
        Le <Link href="/guide/registre-visiteurs-numerique">guide du registre numérique</Link> détaille ces repères.
      </p>
      <p>
        <em>Ces repères sont informatifs et ne constituent pas un avis juridique : vérifiez vos obligations auprès de l’ARTCI ou d’un conseil juridique.</em>
      </p>

      <h2>Mettre en place un logiciel de gestion des visiteurs en 5 étapes</h2>
      <ol>
        <li><strong>Créer l’espace :</strong> connexion avec Google, nom et logo de l’établissement.</li>
        <li><strong>Choisir le formulaire :</strong> partir d’un modèle (bureau, restaurant, hôtel, chantier) puis garder uniquement les champs utiles.</li>
        <li><strong>Inviter l’équipe :</strong> attribuer les rôles Patron, Gérant ou Staff.</li>
        <li><strong>Afficher le QR Code :</strong> imprimé à l’entrée ou formulaire ouvert sur une tablette d’accueil, comme expliqué dans la page{" "}
          <Link href="/gestion-visiteurs-qr-code">gestion des visiteurs par QR Code</Link>.</li>
        <li><strong>Suivre le registre :</strong> consulter les visites, les statistiques et exporter en CSV.</li>
      </ol>
    </SeoPage>
  );
}
