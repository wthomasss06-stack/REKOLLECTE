import { SITE_URL } from "@/lib/site";

/** Données éditoriales de la landing — une seule source pour l'affichage et le JSON-LD. */

export const FAQS = [
  { question: "Le visiteur doit-il créer un compte ?", answer: "Non. Il scanne simplement le QR Code, remplit le formulaire depuis son téléphone ou la tablette d’accueil, puis signe. Aucune application ni inscription n’est nécessaire." },
  { question: "Est-ce que REKOLLECTE fonctionne sans connexion ?", answer: "Oui. Le formulaire continue d’enregistrer les visites hors-ligne sur l’appareil. Les données se synchronisent automatiquement dès que la connexion revient." },
  { question: "Puis-je adapter le formulaire à mon activité ?", answer: "Oui. Tu peux choisir les champs utiles à ton établissement — bureau, restaurant, hôtel, chantier ou autre — puis les modifier à tout moment depuis les paramètres." },
  { question: "Qui peut consulter les visites enregistrées ?", answer: "Tu contrôles les accès depuis ton espace. Le patron peut gérer l’ensemble du registre et inviter un gérant ou un membre du staff avec des permissions adaptées à son rôle." },
  { question: "Que deviennent les données des visiteurs ?", answer: "Elles sont enregistrées dans l’espace sécurisé de ton établissement et restent accessibles depuis ton dashboard. Tu peux consulter le registre, suivre les motifs de visite et exporter les données en CSV." },
  { question: "Combien de temps faut-il pour commencer ?", answer: "Quelques minutes suffisent. Connecte-toi avec Google, renseigne ton établissement, choisis ton formulaire et affiche le QR Code à l’accueil. Tu peux compléter la configuration plus tard." },
];

// Organisation ombrelle (REKOLLECTE) + ses deux produits, en @graph pour que Google
// relie les deux SoftwareApplication à la même entité sans les dupliquer. Le schéma
// FAQPage est dérivé de FAQS : une seule source de vérité, jamais désynchronisée du
// texte affiché dans la page.
export const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "REKOLLECTE",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#rekollecte`,
      name: "REKOLLECTE",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "Registre visiteurs numérique par QR Code à Abidjan, sans compte pour le visiteur, fonctionnant hors ligne.",
      provider: { "@id": `${SITE_URL}/#organization` },
      isPartOf: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#rekollecte-plus`,
      name: "REKOLLECTE+",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "Gestion des clients, ressources, réservations, paiements et rappels — niveau 2 de REKOLLECTE, activable depuis les paramètres.",
      provider: { "@id": `${SITE_URL}/#organization` },
      isPartOf: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

export const SECTORS = ["Bureaux", "Restaurants", "Hôtels", "Salles & événements", "Accès chantier", "Cliniques & cabinets", "Écoles", "Agences"];

export const WHY = [
  { n: "01", title: "Aucun compte à créer", body: "Il scanne le QR affiché à l'accueil, remplit le formulaire, signe du doigt. Aucun compte, aucune donnée mobile à lui demander." },
  { n: "02", title: "Hors-ligne, vraiment", body: "La tablette d'accueil continue d'enregistrer même sans réseau pendant plusieurs jours. Tout part vers le dashboard dès que la connexion revient." },
  { n: "03", title: "Un formulaire par métier", body: "Bureau, restaurant, hôtel, accès chantier — un modèle de départ pour chaque secteur, entièrement modifiable ensuite." },
  { n: "04", title: "Un dashboard qui s'adapte", body: "Le tableau de bord affiche automatiquement les champs choisis. Export CSV et régénération du QR en un clic." },
];

export const STEPS = [
  { n: "01", title: "Scanner", body: "Le visiteur scanne le QR affiché à l'accueil, ou trouve le formulaire déjà ouvert sur la tablette dédiée." },
  { n: "02", title: "Remplir", body: "Nom, contact, motif — uniquement les champs que le patron a choisis pour son établissement." },
  { n: "03", title: "Signer", body: "Signature au doigt, comme dans une application de lecture PDF." },
  { n: "04", title: "Synchroniser", body: "Envoi automatique dès que l'appareil retrouve une connexion. Le patron voit tout depuis son dashboard." },
];

export const STEPS_PLUS = [
  { n: "01", title: "Activer", body: "Depuis les paramètres, active REKOLLECTE+ pour ton établissement — le registre continue de tourner sans interruption." },
  { n: "02", title: "Créer une ressource", body: "Choisis un type, un sous-type : la ressource est prête. Le prix s'ajuste ensuite, en un clic." },
  { n: "03", title: "Réserver", body: "Le client réserve une ressource ; la réservation est numérotée et déjà réglée, sans calcul à faire." },
  { n: "04", title: "Être alerté", body: "À la fin du créneau, une sonnerie prévient l'équipe. Un geste suffit pour valider ou annuler." },
];

export const PROMISES: { text: string; tag: string }[] = [
  { text: "Zéro compte, zéro friction pour le visiteur.", tag: "Accueil" },
  { text: "Hors-ligne par défaut, pas en option.", tag: "Terrain" },
  { text: "Un formulaire adapté à chaque secteur.", tag: "Formulaires" },
  { text: "Export CSV et QR régénérable à tout moment.", tag: "Dashboard" },
  { text: "Le patron voit tout, le staff enregistre.", tag: "Rôles" },
  { text: "Prêt en quelques minutes, avec ton compte Google.", tag: "Démarrage" },
  { text: "Réservations numérotées, déjà réglées d'avance.", tag: "REKOLLECTE+" },
  { text: "Une sonnerie en fin de créneau, un geste pour valider.", tag: "REKOLLECTE+" },
];

export const FEATURE_ROWS = [
  {
    id: "registre",
    image: { src: "/landing-images/offlinnnnnnne.webp", alt: "Accueille, enregistre, avance : un visiteur signe le registre REKOLLECTE sur une tablette", w: 1254, h: 1254 },
    title: "Un registre qui se remplit au scan",
    body: "Chaque visite est enregistrée proprement, lisible par tous, sans relire l'écriture de quelqu'un. Le visiteur n'a rien à installer.",
    checks: ["Aucun compte à créer pour le visiteur", "Signature au doigt, directement à l'écran", "Les champs que tu as choisis, rien de plus"],
    cta: { label: "Créer mon espace", href: "/connexion" },
  },
  {
    id: "hors-ligne",
    image: { src: "/landing-images/offline.webp", alt: "Sans réseau, pas de problème : les fiches restent enregistrées sur l'appareil", w: 1254, h: 1254 },
    title: "Hors-ligne, puis synchro automatique",
    body: "Le réseau coupe, l'accueil continue. Les visites restent sur l'appareil et partent seules vers le dashboard au retour de la connexion.",
    checks: ["Enregistre des jours durant sans réseau", "Synchronise dès que la connexion revient", "Rien ne se perd en route"],
    cta: { label: "Voir comment ça marche", href: "/#comment-ca-marche" },
  },
  {
    id: "roles",
    image: { src: "/landing-images/securite-carre.webp", alt: "Vos visiteurs, vos données, votre contrôle : des accès adaptés à chaque rôle", w: 1920, h: 1920 },
    title: "Chacun voit ce qu'il doit voir",
    body: "Invite un gérant ou un membre du staff avec des permissions adaptées à son rôle. Le patron garde la main sur l'ensemble du registre.",
    checks: ["Patron, gérant, staff : trois niveaux d'accès", "Export CSV et régénération du QR en un clic", "Données dans l'espace sécurisé de ton établissement"],
    cta: { label: "Lire l'aide", href: "/aide" },
  },
  {
    id: "plus",
    image: { src: "/landing-images/offline+.webp", alt: "REKOLLECTE+ : réservations, clients et ressources pour toute l'équipe", w: 1254, h: 1254 },
    title: "REKOLLECTE+ : du visiteur au client",
    body: "Quand un visiteur réserve, consomme et doit payer, le deuxième cahier disparaît aussi. Active REKOLLECTE+ depuis tes paramètres.",
    checks: ["Fiches clients avec tout l'historique", "Ressources : chambre, table ou salle", "Réservations numérotées, paiements et rappels"],
    cta: { label: "Activer REKOLLECTE+", href: "/connexion" },
  },
];

type Visual = { src: string; alt: string; w: number; h: number };

/** Aperçu sous le hero : une affiche par niveau (bascule REKOLLECTE / REKOLLECTE+). */
export const SHOTS: Visual[] = [
  { src: "/landing-images/hero.webp", alt: "Formulaire REKOLLECTE sur tablette, badge visiteur avec QR Code", w: 1920, h: 1920 },
  { src: "/landing-images/Hero+.webp", alt: "REKOLLECTE+ : fini le surbooking, des réservations claires pour l'équipe", w: 1254, h: 1254 },
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
