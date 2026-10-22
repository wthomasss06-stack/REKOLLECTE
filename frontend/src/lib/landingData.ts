import { faqPage } from "@/lib/jsonld";
import { IDS, PUBLISHER, SITE_NAME, SITE_URL } from "@/lib/site";
import { FREE_UNTIL_ISO } from "@/lib/pricing";

/** Données éditoriales de la landing — une seule source pour l’affichage et le JSON-LD. */

export const FAQS = [
  { question: "Qu’est-ce que REKOLLECTE ?", answer: "REKOLLECTE est un registre visiteurs numérique par QR Code, conçu à Abidjan. Il remplace le cahier de visites des bureaux, restaurants, hôtels et accès chantier : le visiteur scanne, remplit le formulaire et signe à l’écran, sans compte, même sans connexion internet." },
  { question: "REKOLLECTE est-il un logiciel de gestion des visiteurs ?", answer: "Oui. C’est un logiciel de gestion des visiteurs par QR Code : formulaire adapté à l’activité, rôles Patron, Gérant et Agent, statistiques de fréquentation et export CSV. Il est gratuit pendant le lancement." },
  { question: "Combien coûte REKOLLECTE ?", answer: "REKOLLECTE est gratuit pendant le lancement. Ensuite : Gratuit à 0 FCFA, Essentiel à 3 000 FCFA par mois, REKOLLECTE+ à 7 000 FCFA par mois, Entreprise sur devis. L’enregistrement des visiteurs n’est jamais bloqué par un plan." },
  { question: "Quelle différence entre REKOLLECTE et REKOLLECTE+ ?", answer: "REKOLLECTE est le registre visiteurs. REKOLLECTE+ y ajoute les fiches clients, les ressources (chambre, table, salle…), les réservations, les encaissements et les rappels de fin de créneau. Il s’active depuis les paramètres ; après le lancement, il faut le plan REKOLLECTE+." },
  { question: "Le visiteur doit-il créer un compte ?", answer: "Non. Il scanne le QR Code, remplit le formulaire sur son téléphone ou la tablette d’accueil, puis signe. Aucune application ni inscription n’est nécessaire." },
  { question: "Est-ce que REKOLLECTE fonctionne sans connexion ?", answer: "Oui. Le formulaire continue d’enregistrer les visites sur l’appareil, hors ligne. Les données se synchronisent automatiquement dès que la connexion revient." },
  { question: "Puis-je adapter le formulaire à mon activité ?", answer: "Oui. Vous choisissez les champs utiles à votre établissement (bureau, restaurant, hôtel, chantier…) et vous les modifiez à tout moment depuis les paramètres." },
  { question: "Qui peut consulter les visites enregistrées ?", answer: "Vous contrôlez les accès. Le Patron gère l’ensemble du registre et invite un Gérant ou un Agent, avec des permissions adaptées à chaque rôle." },
  { question: "Que deviennent les données des visiteurs ?", answer: "Elles sont enregistrées dans l’espace sécurisé de votre établissement et consultables depuis votre tableau de bord. Vous suivez les motifs de visite et exportez le registre en CSV." },
  { question: "Combien de temps faut-il pour commencer ?", answer: "Quelques minutes. Connectez-vous avec Google ou Facebook, renseignez votre établissement, choisissez un formulaire et affichez le QR Code à l’accueil. Le reste peut attendre." },
];

const FEATURES_BASE = [
  "Registre visiteurs par QR Code",
  "Aucun compte requis pour le visiteur",
  "Signature à l’écran",
  "Fonctionne hors ligne avec synchronisation automatique",
  "Formulaires adaptés au secteur (bureau, restaurant, hôtel, chantier)",
  "Rôles Patron, Gérant et Agent",
  "Export CSV et statistiques de fréquentation",
];

const FEATURES_PLUS = [
  "Fiches clients avec historique complet",
  "Ressources par catégorie (hébergement, espaces, restauration, événementiel…)",
  "Réservations numérotées avec détection de conflit",
  "Enregistrement des encaissements",
  "Rappels de fin de créneau",
];

const FREE = { "@type": "Offer", price: "0", priceCurrency: "XOF", priceValidUntil: FREE_UNTIL_ISO, availability: "https://schema.org/OnlineOnly" };
const AREA = { "@type": "Country", name: "Côte d’Ivoire" };

// Graphe relié par @id (éditeur -> site -> applications) : Google et les moteurs de réponse comprennent
// qu’il s’agit d’UNE entité « REKOLLECTE » éditée par AKATech Studio, distincte des homonymes (ex. reCollect).
// Aucune note, aucun avis ni aucune distinction inventée : uniquement des faits vérifiables sur le produit.
export const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": IDS.publisher,
      name: PUBLISHER.name,
      url: PUBLISHER.url,
      logo: { "@type": "ImageObject", url: `${SITE_URL}${PUBLISHER.logo}` },
      address: { "@type": "PostalAddress", addressLocality: "Abidjan", addressCountry: "CI" },
      areaServed: AREA,
    },
    {
      "@type": "WebSite",
      "@id": IDS.website,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: ["REKOLLECTE+", "REKOLLECTE registre visiteurs"],
      inLanguage: "fr",
      publisher: { "@id": IDS.publisher },
    },
    {
      "@type": "SoftwareApplication",
      "@id": IDS.app,
      name: SITE_NAME,
      alternateName: ["REKOLLECTE registre visiteurs QR Code", "REKOLLECTE logiciel de gestion des visiteurs"],
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web (application installable PWA)",
      inLanguage: "fr",
      description: "REKOLLECTE est un logiciel de gestion des visiteurs par QR Code (registre numérique des visiteurs), conçu à Abidjan : le visiteur scanne, remplit et signe sans compte, même hors ligne.",
      featureList: FEATURES_BASE,
      isAccessibleForFree: true,
      offers: FREE,
      areaServed: AREA,
      publisher: { "@id": IDS.publisher },
    },
    {
      "@type": "SoftwareApplication",
      "@id": IDS.appPlus,
      name: "REKOLLECTE+",
      url: `${SITE_URL}/rekollecte-plus`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web (application installable PWA)",
      inLanguage: "fr",
      description: "REKOLLECTE+ complète REKOLLECTE : fiches clients, ressources, réservations, encaissements et rappels, activable depuis les paramètres.",
      featureList: FEATURES_PLUS,
      isAccessibleForFree: true,
      offers: FREE,
      areaServed: AREA,
      isPartOf: { "@id": IDS.app },
      publisher: { "@id": IDS.publisher },
    },
    faqPage(`${SITE_URL}/#faq`, FAQS),
  ],
};

export const SECTORS = ["Bureaux", "Restaurants", "Hôtels", "Salles & événements", "Accès chantier", "Cliniques & cabinets", "Écoles", "Agences"];

export const WHY = [
  { n: "01", title: "Aucun compte à créer", body: "Le visiteur scanne le QR, remplit le formulaire et signe du doigt. Aucun compte à créer, aucune application à installer." },
  { n: "02", title: "Hors ligne, vraiment", body: "La tablette d’accueil continue d’enregistrer sans réseau. Tout part vers le tableau de bord dès que la connexion revient." },
  { n: "03", title: "Un formulaire par métier", body: "Bureau, restaurant, hôtel, chantier : un modèle de départ par secteur, entièrement modifiable." },
  { n: "04", title: "Un tableau de bord sur mesure", body: "Il affiche les champs que vous avez choisis. Export CSV et régénération du QR en un clic." },
];

export const STEPS = [
  { n: "01", title: "Scanner", body: "Le visiteur scanne le QR affiché à l’accueil, ou ouvre le formulaire déjà affiché sur la tablette." },
  { n: "02", title: "Remplir", body: "Nom, contact, motif : uniquement les champs choisis par le Patron." },
  { n: "03", title: "Signer", body: "Signature au doigt, directement à l’écran." },
  { n: "04", title: "Synchroniser", body: "Envoi automatique dès que l’appareil retrouve une connexion. Le Patron voit tout dans son tableau de bord." },
];

export const STEPS_PLUS = [
  { n: "01", title: "Activer", body: "Dans les paramètres, activez REKOLLECTE+ : le registre continue de tourner sans interruption." },
  { n: "02", title: "Créer une ressource", body: "Choisissez un type et un sous-type : la ressource est prête. Le prix s’ajuste ensuite en un clic." },
  { n: "03", title: "Réserver", body: "Le client réserve une ressource ; la réservation est numérotée, sans conflit de créneaux." },
  { n: "04", title: "Être alerté", body: "À la fin du créneau, une sonnerie prévient l’équipe. Un geste suffit pour valider ou annuler." },
];

export const PROMISES: { text: string; tag: string }[] = [
  { text: "Zéro compte, zéro friction pour le visiteur.", tag: "Accueil" },
  { text: "Hors ligne par défaut, pas en option.", tag: "Terrain" },
  { text: "Un formulaire adapté à chaque secteur.", tag: "Formulaires" },
  { text: "Export CSV et QR régénérable à tout moment.", tag: "Tableau de bord" },
  { text: "Le Patron voit tout, l’Agent enregistre.", tag: "Rôles" },
  { text: "Prêt en quelques minutes, avec Google ou Facebook.", tag: "Démarrage" },
  { text: "Réservations numérotées, sans conflit de créneaux.", tag: "REKOLLECTE+" },
  { text: "Une sonnerie en fin de créneau, un geste pour valider.", tag: "REKOLLECTE+" },
];

export const FEATURE_ROWS = [
  {
    id: "registre",
    image: { src: "/landing-images/offlinnnnnnne.webp", alt: "Accueille, enregistre, avance : un visiteur signe le registre REKOLLECTE sur une tablette", w: 1254, h: 1254 },
    title: "Un registre qui se remplit au scan",
    body: "Chaque visite est enregistrée proprement, lisible par tous. Le visiteur n’a rien à installer.",
    checks: ["Aucun compte à créer pour le visiteur", "Signature au doigt, directement à l’écran", "Uniquement les champs que vous avez choisis"],
    cta: { label: "Créer mon espace", href: "/connexion" },
  },
  {
    id: "hors-ligne",
    image: { src: "/landing-images/offline.webp", alt: "Sans réseau, pas de problème : les fiches restent enregistrées sur l’appareil", w: 1254, h: 1254 },
    title: "Hors ligne, puis synchro automatique",
    body: "Le réseau coupe, l’accueil continue. Les visites restent sur l’appareil et partent seules vers le tableau de bord au retour de la connexion.",
    checks: ["Enregistre sans réseau", "Synchronise dès que la connexion revient", "Chaque fiche reste sur l’appareil jusqu’à sa synchronisation"],
    cta: { label: "Voir comment ça marche", href: "/#comment-ca-marche" },
  },
  {
    id: "roles",
    image: { src: "/landing-images/securite-carre.webp", alt: "Vos visiteurs, vos données, votre contrôle : des accès adaptés à chaque rôle", w: 1920, h: 1920 },
    title: "Chacun voit ce qu’il doit voir",
    body: "Invitez un Gérant ou un Agent avec des permissions adaptées à son rôle. Le Patron garde la main sur l’ensemble du registre.",
    checks: ["Patron, Gérant, Agent : trois rôles distincts", "Export CSV et régénération du QR en un clic", "Données dans l’espace sécurisé de votre établissement"],
    cta: { label: "Lire l’aide", href: "/aide" },
  },
  {
    id: "plus",
    image: { src: "/landing-images/offline+.webp", alt: "REKOLLECTE+ : réservations, clients et ressources pour toute l’équipe", w: 1254, h: 1254 },
    title: "REKOLLECTE+ : du visiteur au client",
    body: "Quand un visiteur réserve, consomme et doit payer, le deuxième cahier disparaît aussi. Activez REKOLLECTE+ depuis vos paramètres.",
    checks: ["Fiches clients avec tout l’historique", "Ressources : chambre, table ou salle", "Réservations numérotées, paiements et rappels"],
    cta: { label: "Activer REKOLLECTE+", href: "/connexion" },
  },
];

type Visual = { src: string; alt: string; w: number; h: number };

/** Aperçu sous le hero : une affiche par niveau (bascule REKOLLECTE / REKOLLECTE+). */
export const SHOTS: Visual[] = [
  { src: "/landing-images/hero.webp", alt: "Formulaire REKOLLECTE sur tablette, badge visiteur avec QR Code", w: 1920, h: 1920 },
  { src: "/landing-images/Hero+.webp", alt: "REKOLLECTE+ : fini le surbooking, des réservations claires pour l’équipe", w: 1254, h: 1254 },
];

/** Fonds photo : une version PC (paysage) et une version mobile (portrait). */
export const HERO_BG = {
  desktop: { src: "/landing-images/hero-fond-pc.webp", w: 1672, h: 941 },
  mobile: { src: "/landing-images/hero-fond-mobile.webp", w: 941, h: 1672 },
};

export const CTA_BG = {
  desktop: { src: "/landing-images/cta-fond-pc.webp", w: 1672, h: 941 },
  mobile: { src: "/landing-images/cta-fond-mobile.webp", w: 940, h: 1672 },
};
