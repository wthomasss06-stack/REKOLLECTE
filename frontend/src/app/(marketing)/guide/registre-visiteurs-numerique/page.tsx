import Link from "next/link";

import JsonLd from "@/components/marketing/JsonLd";
import LegalLayout from "@/components/marketing/LegalLayout";
import { breadcrumb, faqPage } from "@/lib/jsonld";
import { pageMeta } from "@/lib/seo";
import { CONTENT_UPDATED_ISO, CONTENT_UPDATED_LABEL, IDS, SITE_URL } from "@/lib/site";

const PATH = "/guide/registre-visiteurs-numerique";
const TITLE = "Registre visiteurs numérique : remplacer le cahier de visites par un QR Code";

const FAQ = [
  { question: "Qu’est-ce qu’un registre visiteurs numérique ?", answer: "C’est un formulaire en ligne qui remplace le cahier de visites papier : le visiteur renseigne son identité et le motif de sa visite sur un écran ou via un QR Code, et l’établissement retrouve toutes les visites dans un registre consultable et exportable." },
  { question: "Un registre numérique fonctionne-t-il sans internet ?", answer: "Cela dépend de l’outil. Un registre pensé pour le terrain enregistre les visites sur l’appareil hors ligne puis les synchronise au retour de la connexion, ce que fait REKOLLECTE." },
  { question: "Le visiteur doit-il créer un compte ?", answer: "Il ne devrait pas : plus il y a d’étapes, plus l’accueil ralentit. Avec REKOLLECTE, le visiteur scanne le QR Code, remplit le formulaire et signe, sans compte ni application." },
  { question: "Quelles informations demander aux visiteurs ?", answer: "Seulement celles qui sont utiles : nom, entreprise, personne visitée, motif, et un téléphone si un rappel est nécessaire. Moins de champs, c’est un accueil plus rapide et moins de données personnelles à protéger." },
  { question: "Peut-on exporter les visites ?", answer: "Oui, un bon registre numérique permet l’export (CSV, par exemple) pour archiver, contrôler ou analyser la fréquentation. REKOLLECTE propose l’export CSV aux rôles Patron et Gérant." },
];

export const metadata = pageMeta({
  title: `${TITLE} (guide)`,
  description: "Pourquoi et comment remplacer le cahier de visites par un registre numérique : critères de choix, mise en place en 5 étapes avec un QR Code, champs à demander et repères sur la protection des données en Côte d’Ivoire.",
  path: PATH,
  type: "article",
});

export default function GuidePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${SITE_URL}${PATH}#article`,
        headline: TITLE,
        description: "Guide pour remplacer le cahier de visites par un registre visiteurs numérique avec QR Code.",
        inLanguage: "fr",
        datePublished: CONTENT_UPDATED_ISO,
        dateModified: CONTENT_UPDATED_ISO,
        mainEntityOfPage: `${SITE_URL}${PATH}`,
        author: { "@id": IDS.publisher },
        publisher: { "@id": IDS.publisher },
        about: { "@id": IDS.app },
      },
      breadcrumb([{ name: "Accueil", path: "/" }, { name: "Guide du registre visiteurs numérique", path: PATH }]),
      faqPage(`${SITE_URL}${PATH}#faq`, FAQ),
    ],
  };

  return (
    <LegalLayout title={TITLE} lastUpdated={CONTENT_UPDATED_LABEL}>
      <JsonLd data={jsonLd} />

      <p>
        <strong>Un registre visiteurs numérique remplace le cahier papier par un formulaire que le visiteur remplit sur un écran ou en scannant un
        QR Code.</strong> L’établissement retrouve ensuite chaque visite dans un registre lisible, filtrable et exportable. Ce guide explique quand
        passer au numérique, quoi exiger d’un outil et comment s’y prendre, avec l’exemple de{" "}
        <Link href="/a-propos">REKOLLECTE</Link>, conçu à Abidjan.
      </p>

      <h2>Pourquoi le cahier de visites papier atteint ses limites</h2>
      <ul>
        <li><strong>Illisible ou incomplet :</strong> écritures difficiles à relire, champs oubliés, motifs jamais renseignés.</li>
        <li><strong>Confidentialité :</strong> chaque visiteur voit les noms et numéros de ceux qui l’ont précédé.</li>
        <li><strong>Introuvable :</strong> retrouver une visite d’il y a trois semaines oblige à feuilleter tout le cahier.</li>
        <li><strong>Aucune vue d’ensemble :</strong> pas de statistiques sur les heures d’affluence ni sur les motifs fréquents.</li>
        <li><strong>Fragile :</strong> un cahier perdu, mouillé ou plein, et l’historique disparaît.</li>
      </ul>

      <h2>Ce qu’un bon registre visiteurs numérique doit permettre</h2>
      <ul>
        <li>Un accueil <strong>sans compte</strong> ni application pour le visiteur.</li>
        <li>Un fonctionnement <strong>hors ligne</strong>, avec synchronisation automatique : la connexion n’est jamais garantie à l’accueil.</li>
        <li>Une <strong>signature</strong> à l’écran quand l’établissement en a besoin.</li>
        <li>Des <strong>champs adaptés au métier</strong> (bureau, restaurant, hôtel, chantier), modifiables à tout moment.</li>
        <li>Des <strong>rôles</strong> : le patron voit tout, le personnel d’accueil enregistre.</li>
        <li>Un <strong>export</strong> pour archiver ou contrôler.</li>
      </ul>

      <h2>Remplacer le cahier en 5 étapes avec REKOLLECTE</h2>
      <ul>
        <li><strong>1. Créer l’espace.</strong> Connexion avec Google, puis nom et logo de l’établissement.</li>
        <li><strong>2. Choisir un modèle de formulaire.</strong> Bureau, restaurant, hôtel ou chantier : un point de départ prêt à l’emploi.</li>
        <li><strong>3. Ajuster les champs.</strong> Texte, téléphone, e-mail, nombre, date, liste, case à cocher et signature.</li>
        <li><strong>4. Afficher le QR Code.</strong> Imprimé à l’entrée, ou formulaire ouvert sur une tablette d’accueil dédiée.</li>
        <li><strong>5. Suivre et exporter.</strong> Registre du jour, statistiques d’affluence, motifs fréquents et export CSV.</li>
      </ul>
      <p>
        Quand l’établissement veut aller plus loin (clients, réservations, encaissements), il active{" "}
        <Link href="/rekollecte-plus">REKOLLECTE+</Link> depuis ses paramètres.
      </p>

      <h2>Quels champs demander aux visiteurs ?</h2>
      <p>
        Le bon réflexe est de n’exiger que le nécessaire. Un formulaire court accélère l’accueil et limite les données personnelles à protéger. En
        général : nom et prénom, entreprise, personne ou service visité, motif de la visite, et un numéro de téléphone uniquement si l’établissement
        doit pouvoir rappeler la personne. Un chantier ajoutera plutôt une société et une zone d’accès ; un restaurant ou un hôtel, un contact pour
        la réservation.
      </p>

      <h2>Et la protection des données en Côte d’Ivoire ?</h2>
      <p>
        En Côte d’Ivoire, la loi n° 2013-450 du 19 juin 2013 encadre la protection des données à caractère personnel, sous le contrôle de l’ARTCI.
        Un établissement qui tient un registre de visiteurs est le « responsable du traitement » : c’est à lui d’effectuer les formalités prévues
        auprès de l’autorité et d’informer ses visiteurs. REKOLLECTE fournit l’outil de collecte ; il ne remplace pas ces démarches.
      </p>
      <p>
        <em>Ces repères sont informatifs et ne constituent pas un avis juridique : vérifiez les obligations qui s’appliquent à votre activité auprès de
        l’ARTCI ou d’un conseil juridique.</em>
      </p>

      <h2>Questions fréquentes</h2>
      {FAQ.map((item) => (
        <div key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}

      <p>
        <Link href="/connexion" className="lp-btn" style={{ textDecoration: "none", color: "rgb(var(--c-cta-ink))" }}>Créer mon espace</Link>
      </p>
    </LegalLayout>
  );
}
