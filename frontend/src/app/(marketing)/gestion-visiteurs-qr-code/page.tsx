import Link from "next/link";

import SeoPage, { SeoTable, type SeoFaq, type SeoLink } from "@/components/marketing/SeoPage";
import { pageMeta } from "@/lib/seo";

const PATH = "/gestion-visiteurs-qr-code";
const H1 = "Gestion des visiteurs par QR Code : scanner, remplir, signer";

const FAQ: SeoFaq[] = [
  { question: "Comment fonctionne la gestion des visiteurs par QR Code ?", answer: "L’établissement affiche un QR Code à l’accueil. Le visiteur le scanne avec son téléphone, remplit le formulaire d’accueil dans son navigateur et signe à l’écran. La visite arrive dans le registre de l’établissement, consultable par l’équipe selon son rôle." },
  { question: "Le visiteur doit-il installer une application ?", answer: "Non. Le formulaire s’ouvre dans le navigateur : la plupart des téléphones récents scannent un QR Code directement avec l’appareil photo. Aucun compte n’est à créer." },
  { question: "Peut-on gérer les visiteurs sans QR Code, avec une tablette ?", answer: "Oui. Le formulaire peut rester ouvert sur une tablette d’accueil dédiée : le visiteur le remplit sur place. Le QR Code convient quand on préfère que chacun utilise son propre téléphone." },
  { question: "Que se passe-t-il si le réseau est coupé à l’accueil ?", answer: "Les visites sont gardées sur l’appareil, puis synchronisées automatiquement au retour de la connexion. L’accueil continue de fonctionner pendant la coupure." },
  { question: "Que faire si le QR Code est abîmé ou ne doit plus être utilisé ?", answer: "Le Patron peut régénérer le QR Code à tout moment depuis son espace : l’ancien code cesse de fonctionner et le nouveau peut être réimprimé." },
  { question: "Peut-on avoir plusieurs QR Codes ?", answer: "Oui, un établissement peut disposer de plusieurs formulaires et de plusieurs QR Codes, par exemple un par entrée ou un par activité." },
];

const RELATED: SeoLink[] = [
  { href: "/logiciel-gestion-visiteurs", title: "Logiciel de gestion des visiteurs", text: "Les critères pour choisir son outil et la mise en place en 5 étapes." },
  { href: "/guide/registre-visiteurs-numerique", title: "Registre numérique des visiteurs : le guide", text: "Papier ou numérique : ce qui change, les champs à demander et les repères sur les données." },
  { href: "/#comment-ca-marche", title: "Comment ça marche", text: "Le parcours en quatre étapes, présenté sur la page d’accueil." },
  { href: "/aide", title: "Centre d’aide", text: "Générer et imprimer ses QR Codes, configurer le formulaire et l’équipe." },
];

const DESCRIPTION = "Gestion des visiteurs par QR Code : le visiteur scanne, remplit et signe sans compte, même hors ligne. Parcours, emplacement du QR Code, formulaire d’accueil.";

export const metadata = pageMeta({
  title: "Gestion des visiteurs par QR Code : sans compte, hors ligne",
  description: DESCRIPTION,
  path: PATH,
});

export default function GestionVisiteursQrCodePage() {
  return (
    <SeoPage
      path={PATH}
      h1={H1}
      crumb="Gestion des visiteurs par QR Code"
      description={DESCRIPTION}
      faqs={FAQ}
      related={RELATED}
      answer={
        <p>
          <strong>La gestion des visiteurs par QR Code consiste à afficher à l’accueil un QR Code qui ouvre le formulaire d’accueil de l’établissement :</strong> le
          visiteur le scanne avec son téléphone, remplit les champs demandés et signe à l’écran, sans compte ni application. Chaque visite est enregistrée dans un
          registre numérique, même quand le réseau est coupé. C’est le principe de <Link href="/a-propos" className="underline underline-offset-4">REKOLLECTE</Link>.
        </p>
      }
    >
      <h2>Le parcours du visiteur en 4 étapes</h2>
      <ol>
        <li><strong>Scanner.</strong> Le visiteur scanne le QR Code affiché à l’entrée, ou trouve le formulaire déjà ouvert sur la tablette d’accueil.</li>
        <li><strong>Remplir.</strong> Nom, contact, motif : uniquement les champs que l’établissement a choisis.</li>
        <li><strong>Signer.</strong> La signature se fait au doigt, directement à l’écran.</li>
        <li><strong>Synchroniser.</strong> La visite part vers le registre dès que l’appareil a une connexion. Le Patron la voit depuis son tableau de bord.</li>
      </ol>

      <h2>Où afficher le QR Code ?</h2>
      <ul>
        <li><strong>À l’entrée ou au comptoir d’accueil,</strong> imprimé, à hauteur des yeux et bien éclairé.</li>
        <li><strong>Sur une tablette d’accueil dédiée,</strong> avec le formulaire ouvert en permanence : pratique quand les visiteurs n’ont pas leur téléphone.</li>
      </ul>

      <h2>Le formulaire d’accueil numérique</h2>
      <p>
        Le QR Code ouvre un formulaire adapté à l’activité : modèles pour le bureau, le restaurant, l’hôtel et le chantier, modifiables ensuite. Champs disponibles : texte, téléphone,
        e-mail, nombre, date, liste, case à cocher et signature. Un formulaire court accélère l’accueil et limite les données à protéger ; voir le{" "}
        <Link href="/guide/registre-visiteurs-numerique">guide du registre numérique des visiteurs</Link>.
      </p>

      <h2>Et sans réseau ?</h2>

      <p>
        La connexion n’est jamais garantie à l’accueil d’un bureau ou d’un chantier : quand le réseau coupe, le formulaire continue d’enregistrer les visites sur l’appareil,
        puis les envoie au retour de la connexion.
      </p>

      <h2>Ce que voit l’établissement</h2>
      <ul>
        <li><strong>Le registre du jour</strong> et l’historique, consultables par l’équipe selon son rôle (Patron, Gérant, Agent).</li>
        <li><strong>Des statistiques :</strong> courbe horaire de fréquentation et motifs de visite les plus fréquents.</li>
        <li><strong>L’export CSV,</strong> réservé au Patron et au Gérant, pour archiver ou contrôler.</li>
      </ul>

      <h2>QR Code, tablette ou cahier : que choisir ?</h2>
      <SeoTable
        caption="Comparaison du cahier papier, de la tablette d’accueil et du QR Code pour enregistrer les visiteurs"
        head={["Critère", "Cahier papier", "Tablette d’accueil", "QR Code"]}
        rows={[
          ["Confidentialité", "Chaque visiteur lit les lignes précédentes.", "Les données restent dans le registre.", "Les données restent dans le registre."],
          ["Équipement", "Un cahier et un stylo.", "Une tablette dédiée, à surveiller et à recharger.", "Un QR Code imprimé ; le visiteur utilise son téléphone."],
          ["Affluence", "Une seule personne écrit à la fois.", "Une seule personne à la fois sur la tablette.", "Plusieurs visiteurs peuvent remplir en même temps."],
          ["Recherche d’une visite", "Feuilleter le cahier.", "Recherche dans le registre numérique.", "Recherche dans le registre numérique."],
          ["Sans réseau", "Aucun besoin de réseau.", "Visites gardées sur l’appareil puis synchronisées.", "Visites gardées sur l’appareil puis synchronisées."],
        ]}
      />
      <p>
        Les deux approches se combinent : un QR Code pour les visiteurs équipés d’un téléphone, et une tablette d’accueil pour les autres.
      </p>

      <h2>Sécurité et données personnelles</h2>
      <p>
        Le visiteur ne crée aucun compte et ne renseigne que les champs choisis par l’établissement. Aucune donnée biométrique n’est collectée. L’établissement reste
        responsable du traitement : en Côte d’Ivoire, il effectue les formalités auprès de l’ARTCI et informe ses visiteurs. Repères informatifs, sans valeur d’avis juridique.
      </p>
    </SeoPage>
  );
}
