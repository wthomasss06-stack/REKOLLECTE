import Link from "next/link";

import JsonLd from "@/components/marketing/JsonLd";
import LegalLayout from "@/components/marketing/LegalLayout";
import { breadcrumb, faqPage } from "@/lib/jsonld";
import { pageMeta } from "@/lib/seo";
import { CONTENT_UPDATED_ISO, CONTENT_UPDATED_LABEL, IDS, SITE_URL } from "@/lib/site";

const FAQ = [
  { question: "Qui édite REKOLLECTE ?", answer: "REKOLLECTE est édité par AKATech Studio, un studio de développement basé à Abidjan, en Côte d’Ivoire." },
  { question: "REKOLLECTE est-il lié à reCollect ?", answer: "Non. REKOLLECTE (avec un K) est un registre visiteurs par QR Code créé à Abidjan. Il n’a aucun lien avec l’application reCollect de suivi de médias ni avec d’autres produits au nom proche." },
  { question: "Le visiteur doit-il installer une application ?", answer: "Non. Il scanne le QR Code avec l’appareil photo de son téléphone, le formulaire s’ouvre dans le navigateur, il le remplit et signe à l’écran. Aucun compte et aucune application ne sont nécessaires." },
  { question: "REKOLLECTE fonctionne-t-il sans internet ?", answer: "Oui. La tablette d’accueil continue d’enregistrer les visites hors ligne ; les fiches sont gardées sur l’appareil puis synchronisées automatiquement dès que la connexion revient." },
  { question: "REKOLLECTE est-il payant ?", answer: "Non, le service est gratuit à ce jour." },
];

export const metadata = pageMeta({
  title: "À propos de REKOLLECTE : le registre visiteurs par QR Code conçu à Abidjan",
  description: "REKOLLECTE est un registre visiteurs numérique par QR Code, conçu à Abidjan par AKATech Studio : le visiteur scanne, remplit et signe sans compte, même hors ligne. Voir comment il fonctionne et pour qui.",
  path: "/a-propos",
});

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/a-propos#page`,
        url: `${SITE_URL}/a-propos`,
        name: "À propos de REKOLLECTE",
        inLanguage: "fr",
        dateModified: CONTENT_UPDATED_ISO,
        isPartOf: { "@id": IDS.website },
        about: { "@id": IDS.app },
        publisher: { "@id": IDS.publisher },
      },
      breadcrumb([{ name: "Accueil", path: "/" }, { name: "À propos", path: "/a-propos" }]),
      faqPage(`${SITE_URL}/a-propos#faq`, FAQ),
    ],
  };

  return (
    <LegalLayout title="Qu’est-ce que REKOLLECTE ?" lastUpdated={CONTENT_UPDATED_LABEL}>
      <JsonLd data={jsonLd} />

      <p>
        <strong>REKOLLECTE est un registre visiteurs numérique par QR Code, conçu à Abidjan (Côte d’Ivoire) par AKATech Studio.</strong>{" "}
        Il remplace le cahier de visites papier des bureaux, restaurants, hôtels et accès chantier : le visiteur scanne un QR Code, remplit un
        formulaire et signe à l’écran, sans créer de compte, même sans connexion internet.
      </p>

      <h2>REKOLLECTE en bref</h2>
      <ul>
        <li><strong>Éditeur :</strong> AKATech Studio, Abidjan (Côte d’Ivoire).</li>
        <li><strong>Type de produit :</strong> application web installable (PWA), utilisable sur téléphone, tablette et ordinateur.</li>
        <li><strong>Pour qui :</strong> bureaux, restaurants, hôtels, chantiers et tout lieu qui accueille des visiteurs.</li>
        <li><strong>Côté visiteur :</strong> aucun compte, aucune application, signature à l’écran.</li>
        <li><strong>Hors ligne :</strong> oui, avec synchronisation automatique au retour de la connexion.</li>
        <li><strong>Côté équipe :</strong> connexion avec un compte Google ; rôles Patron, Gérant et Staff.</li>
        <li><strong>Données :</strong> registre consultable, statistiques de fréquentation et export CSV.</li>
        <li><strong>Langue :</strong> français.</li>
        <li><strong>Prix :</strong> gratuit à ce jour.</li>
      </ul>

      <h2>Comment ça marche</h2>
      <ul>
        <li><strong>1. Créer l’espace.</strong> Le patron se connecte avec Google et renseigne le nom et le logo de son établissement.</li>
        <li><strong>2. Préparer le formulaire.</strong> Il part d’un modèle (bureau, restaurant, hôtel, chantier), ajuste les champs et génère un ou plusieurs QR Codes.</li>
        <li><strong>3. Accueillir.</strong> Le visiteur scanne le QR Code (ou utilise la tablette d’accueil), remplit le formulaire et signe.</li>
        <li><strong>4. Piloter.</strong> Le registre, les statistiques, l’export CSV et l’équipe se gèrent depuis le tableau de bord.</li>
      </ul>
      <p>Le détail pas à pas est dans l’<Link href="/aide">aide</Link> et dans le <Link href="/guide/registre-visiteurs-numerique">guide du registre visiteurs numérique</Link>.</p>

      <h2>REKOLLECTE et REKOLLECTE+</h2>
      <p>
        <strong>REKOLLECTE</strong> est le registre visiteurs (niveau 1). <strong>REKOLLECTE+</strong> est le niveau 2, activable depuis les
        paramètres : les visiteurs deviennent des fiches clients et l’établissement gère en plus ses ressources, ses réservations, ses encaissements
        et ses rappels de fin de créneau. Voir la page <Link href="/rekollecte-plus">REKOLLECTE+</Link>.
      </p>

      <h2>Pour qui</h2>
      <ul>
        <li>Bureaux et espaces professionnels : suivre qui est venu, pour qui et pourquoi.</li>
        <li>Restaurants et hôtels : accueillir sans file d’attente, puis gérer clients et réservations avec REKOLLECTE+.</li>
        <li>Chantiers et sites à accès contrôlé : tenir un registre d’entrée lisible, même sans réseau.</li>
        <li>Salles, écoles, cabinets, agences : tout lieu qui veut remplacer le cahier sans imposer d’application à ses visiteurs.</li>
      </ul>

      <h2>Qui est derrière REKOLLECTE</h2>
      <p>
        REKOLLECTE est conçu et développé par <a href="https://akatech.vercel.app" rel="noopener">AKATech Studio</a>, un studio de développement basé à
        Abidjan. Le produit est pensé pour les réalités du terrain : accueil sur tablette, connexion instable et visiteurs qui n’ont pas le temps
        d’installer quoi que ce soit.
      </p>

      <h2>Ne pas confondre</h2>
      <p>
        REKOLLECTE (avec un K) n’a aucun lien avec l’application <em>reCollect</em> de suivi de médias, ni avec d’autres produits au nom proche.
        L’adresse officielle du produit est <a href={SITE_URL}>{SITE_URL.replace("https://", "")}</a>.
      </p>

      <h2>Données et vie privée</h2>
      <p>
        Le formulaire ne demande que les champs choisis par l’établissement. REKOLLECTE ne collecte aucune donnée biométrique. Les visites sont
        enregistrées dans l’espace sécurisé de l’établissement, qui reste responsable de l’usage qu’il en fait. Voir la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
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
