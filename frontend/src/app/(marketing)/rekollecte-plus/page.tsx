import Link from "next/link";

import JsonLd from "@/components/marketing/JsonLd";
import LegalLayout from "@/components/marketing/LegalLayout";
import { breadcrumb, faqPage } from "@/lib/jsonld";
import { pageMeta } from "@/lib/seo";
import { CONTENT_UPDATED_ISO, CONTENT_UPDATED_LABEL, IDS, SITE_URL } from "@/lib/site";

const FAQ = [
  { question: "Qu’est-ce que REKOLLECTE+ ?", answer: "REKOLLECTE+ est le niveau 2 de REKOLLECTE. Il transforme les visiteurs enregistrés à l’accueil en fiches clients et ajoute la gestion des ressources (chambre, table, salle…), des réservations, des encaissements et des rappels de fin de créneau." },
  { question: "Comment activer REKOLLECTE+ ?", answer: "Le Patron l’active depuis Paramètres > Administration. Le registre devient alors l’espace « Clients » et les sections Ressources, Réservations, Paiements et Rappels apparaissent." },
  { question: "Peut-on désactiver REKOLLECTE+ ?", answer: "Oui. Les sections disparaissent de la navigation mais rien n’est supprimé : l’établissement peut le réactiver plus tard." },
  { question: "REKOLLECTE+ propose-t-il un paiement en ligne ?", answer: "Non. Aucun agrégateur de paiement en ligne n’est activé à ce stade : REKOLLECTE+ enregistre les encaissements de l’établissement." },
  { question: "Qui peut annuler un encaissement ?", answer: "Toute l’équipe peut encaisser, mais annuler un encaissement déjà enregistré est réservé au Patron et au Gérant." },
];

export const metadata = pageMeta({
  title: "REKOLLECTE+ : clients, ressources, réservations et encaissements (niveau 2)",
  description: "REKOLLECTE+ prolonge le registre visiteurs REKOLLECTE : fiches clients, ressources (chambre, table, salle), réservations numérotées, encaissements et rappels de fin de créneau. Activable depuis les paramètres.",
  path: "/rekollecte-plus",
});

export default function RekollectePlusPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/rekollecte-plus#page`,
        url: `${SITE_URL}/rekollecte-plus`,
        name: "REKOLLECTE+",
        inLanguage: "fr",
        dateModified: CONTENT_UPDATED_ISO,
        isPartOf: { "@id": IDS.website },
        about: { "@id": IDS.appPlus },
      },
      breadcrumb([{ name: "Accueil", path: "/" }, { name: "REKOLLECTE+", path: "/rekollecte-plus" }]),
      faqPage(`${SITE_URL}/rekollecte-plus#faq`, FAQ),
    ],
  };

  return (
    <LegalLayout title="REKOLLECTE+ : la gestion qui prolonge le registre" lastUpdated={CONTENT_UPDATED_LABEL}>
      <JsonLd data={jsonLd} />

      <p>
        <strong>REKOLLECTE+ est le niveau 2 de <Link href="/a-propos">REKOLLECTE</Link>.</strong> Les visiteurs enregistrés à l’accueil deviennent des fiches
        clients, et l’établissement gère en plus ses ressources, ses réservations, ses encaissements et ses rappels de fin de créneau, au même
        endroit que son registre.
      </p>

      <h2>Ce que REKOLLECTE+ ajoute</h2>
      <ul>
        <li><strong>Fiches clients :</strong> chaque visiteur identifié à l’accueil devient un client, avec son historique de passages et de réservations.</li>
        <li><strong>Ressources :</strong> chambre, table, salle, bureau, emplacement… créées à partir de types prêts à l’emploi, avec capacité, équipements et tarif.</li>
        <li><strong>Réservations numérotées :</strong> calcul de la durée et du montant, et détection des conflits quand une ressource est déjà occupée.</li>
        <li><strong>Encaissements :</strong> les paiements sont enregistrés et suivis (à encaisser, historique des encaissements).</li>
        <li><strong>Rappels :</strong> une sonnerie prévient l’équipe à la fin de chaque créneau ; elle valide le paiement ou annule.</li>
      </ul>

      <h2>Des ressources adaptées à chaque activité</h2>
      <p>
        Le catalogue est organisé par catégorie : hébergement, beauté et soins, espaces professionnels, événementiel et restauration, stationnement,
        sport et loisirs, et autre. Le tarif se règle par heure ou séance, par jour ou nuit, ou au forfait mensuel, selon la ressource.
      </p>

      <h2>Comment l’activer</h2>
      <ul>
        <li><strong>1.</strong> Le Patron ouvre Paramètres, puis Administration.</li>
        <li><strong>2.</strong> Il active REKOLLECTE+ : le registre devient l’espace Clients.</li>
        <li><strong>3.</strong> Il crée ses premières ressources (proposé juste après l’activation, avec une option « Plus tard »).</li>
        <li><strong>4.</strong> L’équipe crée les réservations ; Patron, Gérant et Staff peuvent encaisser.</li>
      </ul>
      <p>La désactivation est possible à tout moment : rien n’est supprimé et l’établissement peut réactiver plus tard.</p>

      <h2>Rôles et sécurité</h2>
      <p>
        Le Patron et le Gérant gèrent les ressources et les prix. Toute l’équipe peut créer des réservations et encaisser. Annuler un encaissement
        déjà enregistré est réservé au Patron et au Gérant, et les actions sensibles sont tracées dans le journal d’audit.
      </p>

      <h2>Questions fréquentes</h2>
      {FAQ.map((item) => (
        <div key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}

      <p>
        Pour commencer par le registre visiteurs, voir le <Link href="/guide/registre-visiteurs-numerique">guide du registre numérique</Link>.{" "}
        <Link href="/connexion" className="lp-btn" style={{ textDecoration: "none", color: "rgb(var(--c-cta-ink))" }}>Créer mon espace</Link>
      </p>
    </LegalLayout>
  );
}
