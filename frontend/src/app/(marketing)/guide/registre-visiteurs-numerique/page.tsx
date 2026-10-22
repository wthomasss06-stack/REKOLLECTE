import Link from "next/link";

import SeoPage, { SeoTable, type SeoFaq, type SeoLink } from "@/components/marketing/SeoPage";
import { pageMeta } from "@/lib/seo";
import { CONTENT_UPDATED_ISO } from "@/lib/site";

const PATH = "/guide/registre-visiteurs-numerique";
const H1 = "Registre numérique des visiteurs : remplacer le cahier de visites par un QR Code";

const FAQ: SeoFaq[] = [
  { question: "Qu’est-ce qu’un registre numérique des visiteurs ?", answer: "C’est un formulaire en ligne qui remplace le cahier de visites papier : le visiteur renseigne son identité et le motif de sa visite sur un écran ou via un QR Code, et l’établissement retrouve toutes les visites dans un registre consultable et exportable. On parle aussi de registre de visite en ligne ou de cahier de visites digital." },
  { question: "Un registre numérique fonctionne-t-il sans internet ?", answer: "Cela dépend de l’outil. Un registre pensé pour le terrain enregistre les visites sur l’appareil hors ligne puis les synchronise au retour de la connexion, ce que fait REKOLLECTE." },
  { question: "Le visiteur doit-il créer un compte ?", answer: "Il ne devrait pas : plus il y a d’étapes, plus l’accueil ralentit. Avec REKOLLECTE, le visiteur scanne le QR Code, remplit le formulaire et signe, sans compte ni application." },
  { question: "Quelles informations demander aux visiteurs ?", answer: "Seulement celles qui sont utiles : nom, entreprise, personne visitée, motif, et un téléphone si un rappel est nécessaire. Moins de champs, c’est un accueil plus rapide et moins de données personnelles à protéger." },
  { question: "Peut-on exporter les visites ?", answer: "Oui, un bon registre numérique permet l’export (CSV, par exemple) pour archiver, contrôler ou analyser la fréquentation. REKOLLECTE propose l’export CSV aux rôles Patron et Gérant." },
  { question: "Un registre numérique remplace-t-il les formalités sur les données personnelles ?", answer: "Non. L’établissement reste responsable du traitement et doit effectuer ses démarches auprès de l’autorité compétente (en Côte d’Ivoire, l’ARTCI). L’outil collecte les données, il ne remplace pas ces formalités. Ces repères sont informatifs et ne constituent pas un avis juridique." },
];

const RELATED: SeoLink[] = [
  { href: "/gestion-visiteurs-qr-code", title: "Gestion des visiteurs par QR Code", text: "Le parcours du visiteur, l’emplacement du QR Code et le fonctionnement hors ligne." },
  { href: "/logiciel-gestion-visiteurs", title: "Logiciel de gestion des visiteurs", text: "Les critères pour choisir son outil, par secteur, et la mise en place." },
  { href: "/rekollecte-plus", title: "REKOLLECTE+", text: "Quand le registre doit aussi gérer clients, ressources et réservations." },
  { href: "/a-propos", title: "Qu’est-ce que REKOLLECTE ?", text: "Définition et public visé." },
];

const DESCRIPTION = "Registre numérique des visiteurs : pourquoi quitter le cahier papier, comment choisir son outil et le mettre en place en 5 étapes avec un QR Code.";

export const metadata = pageMeta({
  title: "Registre numérique des visiteurs : le guide complet",
  description: DESCRIPTION,
  path: PATH,
  type: "article",
});

export default function GuidePage() {
  return (
    <SeoPage
      path={PATH}
      h1={H1}
      crumb="Guide du registre numérique des visiteurs"
      description={DESCRIPTION}
      faqs={FAQ}
      related={RELATED}
      kind="Article"
      publishedIso={CONTENT_UPDATED_ISO}
      answer={
        <p>
          <strong>Un registre numérique des visiteurs remplace le cahier papier par un formulaire que le visiteur remplit sur un écran ou en scannant un
          QR Code.</strong> L’établissement retrouve ensuite chaque visite dans un registre lisible, filtrable et exportable. Ce guide explique quand
          passer au numérique, quoi exiger d’un outil et comment s’y prendre, avec l’exemple de{" "}
          <Link href="/a-propos" className="underline underline-offset-4">REKOLLECTE</Link>, conçu à Abidjan.
        </p>
      }
    >
      <h2>Pourquoi le cahier de visites papier atteint ses limites</h2>
      <p>
        Écritures illisibles, champs oubliés, visiteurs qui lisent les lignes précédentes, visite introuvable, cahier perdu ou plein : le papier donne vite une image
        incomplète de l’accueil, sans aucune vue d’ensemble sur l’affluence.
      </p>

      <h2>Cahier papier ou registre de visite en ligne : le comparatif</h2>
      <SeoTable
        caption="Comparaison du cahier de visites papier et du registre numérique des visiteurs"
        head={["Critère", "Cahier papier", "Registre numérique"]}
        rows={[
          ["Lisibilité", "Dépend de l’écriture de chacun.", "Champs saisis au même format."],
          ["Confidentialité", "Les lignes précédentes sont visibles.", "Chaque visiteur ne voit que son formulaire ; l’équipe accède selon son rôle."],
          ["Recherche", "Feuilleter le cahier page par page.", "Registre du jour, historique et filtres."],
          ["Statistiques", "À compter à la main.", "Courbe d’affluence et motifs fréquents."],
          ["Archivage", "Le cahier se perd, se remplit ou s’abîme.", "Export CSV conservable."],
          ["Sans réseau", "Aucun réseau nécessaire.", "Avec un outil pensé pour le terrain : enregistrement hors ligne, synchronisation au retour de la connexion."],
        ]}
      />

      <h2>Ce qu’un bon registre numérique des visiteurs doit permettre</h2>
      <ul>
        <li>Un accueil <strong>sans compte</strong> ni application pour le visiteur.</li>
        <li>Un fonctionnement <strong>hors ligne</strong>, avec synchronisation automatique : la connexion n’est jamais garantie à l’accueil.</li>
        <li>Une <strong>signature</strong> à l’écran quand l’établissement en a besoin.</li>
        <li>Des <strong>champs adaptés au métier</strong> (bureau, restaurant, hôtel, chantier), modifiables à tout moment.</li>
        <li>Des <strong>rôles</strong> : le patron voit tout, le personnel d’accueil enregistre.</li>
        <li>Un <strong>export</strong> pour archiver ou contrôler.</li>
      </ul>
      <p>
        Pour comparer les outils point par point, voir notre page sur le <Link href="/logiciel-gestion-visiteurs">logiciel de gestion des visiteurs</Link>.
      </p>

      <h2>Remplacer le cahier en 5 étapes avec REKOLLECTE</h2>
      <ol>
        <li><strong>Créer l’espace.</strong> Connexion avec Google ou Facebook, puis nom et logo de l’établissement.</li>
        <li><strong>Choisir un modèle de formulaire.</strong> Bureau, restaurant, hôtel ou chantier : un point de départ prêt à l’emploi.</li>
        <li><strong>Ajuster les champs.</strong> Texte, téléphone, e-mail, nombre, date, liste, case à cocher et signature.</li>
        <li><strong>Afficher le QR Code.</strong> Imprimé à l’entrée, ou formulaire ouvert sur une tablette d’accueil dédiée. Le détail est dans la page{" "}
          <Link href="/gestion-visiteurs-qr-code">gestion des visiteurs par QR Code</Link>.</li>
        <li><strong>Suivre et exporter.</strong> Registre du jour, statistiques d’affluence, motifs fréquents et export CSV.</li>
      </ol>
      <p>
        Quand l’établissement veut aller plus loin (clients, réservations, encaissements), il active{" "}
        <Link href="/rekollecte-plus">REKOLLECTE+</Link> depuis ses paramètres.
      </p>

      <h2>Quels champs demander aux visiteurs ?</h2>
      <p>
        N’exiger que le nécessaire : un formulaire court accélère l’accueil et limite les données à protéger. En général : nom et prénom, entreprise, personne ou service
        visité, motif, et un téléphone uniquement si l’établissement doit rappeler la personne. Un chantier ajoutera une société et une zone d’accès ; un restaurant ou un
        hôtel, un contact pour la réservation.
      </p>

      <h2>Et la protection des données en Côte d’Ivoire ?</h2>
      <p>
        La loi n° 2013-450 du 19 juin 2013 encadre la protection des données à caractère personnel, sous le contrôle de l’ARTCI. Un établissement qui tient un registre de
        visiteurs est le « responsable du traitement » : il effectue les formalités prévues auprès de l’autorité et informe ses visiteurs. REKOLLECTE fournit l’outil de
        collecte, pas ces démarches. Repères informatifs, sans valeur d’avis juridique.
      </p>
    </SeoPage>
  );
}
