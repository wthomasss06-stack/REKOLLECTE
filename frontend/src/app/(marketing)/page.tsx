"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { ArrowDownRight, ArrowUpRight, CheckMark } from "@/components/icons";
import Logo from "@/components/Logo";
import AutoSlide from "@/components/marketing/AutoSlide";
import PwaInstallButton from "@/components/marketing/PwaInstallButton";
import { SITE_URL } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FAQS = [
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
// texte affiché plus bas dans la page.
const JSON_LD = {
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

const FEATURES = [
  {
    n: "01",
    title: "Aucune connexion pour le visiteur",
    body: "Il scanne le QR affiché à l'accueil, remplit le formulaire, signe du doigt. Aucun compte, aucune donnée mobile à lui demander.",
    image: "/landing-images/kiosque-wide.webp",
  },
  {
    n: "02",
    title: "Hors-ligne, vraiment",
    body: "La tablette d'accueil continue d'enregistrer même sans réseau pendant plusieurs jours. Tout part vers le dashboard dès que la connexion revient.",
    image: "/landing-images/offline.webp",
  },
  {
    n: "03",
    title: "Un formulaire par métier",
    body: "Bureau, restaurant, hôtel, accès chantier — un modèle de départ pour chaque secteur, entièrement modifiable ensuite.",
    image: "/landing-images/secteurs.webp",
  },
  {
    n: "04",
    title: "Un dashboard qui s'adapte",
    body: "Le tableau de bord affiche automatiquement les champs choisis. Export CSV et régénération du QR en un clic.",
    image: "/landing-images/dashboard.webp",
  },
];

const STEPS = [
  { n: "01", title: "Scanner", body: "Le visiteur scanne le QR affiché à l'accueil, ou trouve le formulaire déjà ouvert sur la tablette dédiée." },
  { n: "02", title: "Remplir", body: "Nom, contact, motif — uniquement les champs que le patron a choisis pour son établissement." },
  { n: "03", title: "Signer", body: "Signature au doigt, comme dans une application de lecture PDF." },
  { n: "04", title: "Synchroniser", body: "Envoi automatique dès que l'appareil retrouve une connexion. Le patron voit tout depuis son dashboard." },
];

// Même parcours en quatre temps, côté REKOLLECTE+ (niveau 2) : deuxième diapositive
// du bloc "Le parcours", une fois le registre activé en gestion complète.
const REKOLLECTE_STEPS = [
  { n: "01", title: "Activer", body: "Depuis les paramètres, active REKOLLECTE+ pour ton établissement — le registre continue de tourner sans interruption." },
  { n: "02", title: "Créer une ressource", body: "Choisis un type, un sous-type : la ressource est prête. Le prix s'ajuste ensuite, en un clic." },
  { n: "03", title: "Réserver", body: "Le client réserve une ressource ; la réservation est numérotée et déjà réglée, sans calcul à faire." },
  { n: "04", title: "Être alerté", body: "À la fin du créneau, une sonnerie prévient l'équipe. Un geste suffit pour valider ou annuler." },
];

const KARNET_HIGHLIGHTS: { title: string; body: string; image?: string }[] = [
  { title: "Visiteurs & clients", body: "Chaque client a sa fiche : passages, réservations, numéros — tout l'historique en un clic, sans ressaisir son nom.", image: "/landing-images/securite-carre+.webp" },
  { title: "Ressources", body: "Chambre, table ou salle : un modèle suffit pour créer la ressource, prix à ajuster ensuite.", image: "/landing-images/offline+.webp" },
  { title: "Réservations", body: "Numérotées, calculées, payées d'avance — chaque réservation part déjà réglée." },
  { title: "Paiements & rappels", body: "Sonnerie à la fin du créneau, jour ou heure — à toi de valider ou d'annuler." },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useGSAP(() => {
    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .from(".hero-kicker", { opacity: 0, x: -20, duration: 0.6 })
      .from(".hero-h1", { y: 40, opacity: 0, duration: 0.9 }, "-=0.3")
      .from(".hero-lead", { y: 20, opacity: 0, duration: 0.7 }, "-=0.5")
      .from(".hero-actions", { y: 20, opacity: 0, duration: 0.6 }, "-=0.4");

    // Visuel du bas de hero : se révèle depuis le coin bas-droit au fil du scroll
    // (clip-path scrubbé, pas de pin — reste léger et sûr sur mobile). Les valeurs
    // de départ sont adoucies sur petit écran via matchMedia, comme dans la
    // référence corner-scroll fournie.
    const heroVisualMM = gsap.matchMedia();
    heroVisualMM.add(
      { isMobile: "(max-width: 639px)", isDesktop: "(min-width: 640px)" },
      (context) => {
        const { isMobile } = context.conditions as { isMobile: boolean };
        gsap.fromTo(
          ".hero-corner-visual",
          { clipPath: isMobile ? "inset(18% 0% 0% 0%)" : "inset(38% 0% 0% 42%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "none",
            scrollTrigger: { trigger: ".hero-corner-visual", start: "top 95%", end: "top 55%", scrub: 0.6 },
          },
        );
      },
    );

    gsap.from(".big-statement", {
      scrollTrigger: { trigger: ".manifesto", start: "top 75%" },
      y: 50,
      opacity: 0,
      duration: 1,
    });

    gsap.utils.toArray<HTMLElement>(".feature-card").forEach((card) => {
      gsap.from(card, {
        scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none reverse" },
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      });
    });

    gsap.utils.toArray<HTMLElement>(".karnet-card").forEach((card) => {
      gsap.from(card, {
        scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none reverse" },
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      });
    });

    gsap.from(".method-steps-list li", {
      scrollTrigger: { trigger: ".method-steps", start: "top 80%" },
      x: 30,
      opacity: 0,
      duration: 0.7,
      stagger: 0.18,
      ease: "power2.out",
    });

    gsap.from(".promise-item", {
      scrollTrigger: { trigger: ".promise-list", start: "top 80%" },
      y: 16,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
    });

    gsap.from(".faq-card", {
      scrollTrigger: { trigger: ".faq-section", start: "top 78%" },
      y: 36,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
    });
  }, { scope: heroRef });

  return (
    <div ref={heroRef} className="min-w-0 max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {/* Hero */}
      <section className="relative w-full max-w-full overflow-hidden px-5 pb-16 pt-24 sm:px-10 sm:pb-20 sm:pt-28">
        <div className="mx-auto max-w-2xl">
          <div className="hero-kicker flex items-center gap-2.5 font-mk-mono text-[10px] uppercase tracking-[0.12em] text-mk-ink">
            <span className="h-px w-7 bg-current" /> Registre d&apos;accueil sans papier
          </div>
          <h1 className="hero-h1 mt-6 max-w-full break-words text-[clamp(2.45rem,9vw,6rem)] font-bold leading-[0.9] tracking-[-0.07em]">
            Le registre visiteurs numérique
          </h1>
          <p className="hero-lead mt-6 max-w-md text-[1.05rem] leading-relaxed text-mk-ink/70">
            REKOLLECTE remplace le registre papier des bureaux, restaurants, hôtels et accès chantier — par un
            QR Code que le visiteur scanne sans jamais créer de compte.
          </p>
          <div className="hero-actions mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/connexion"
              className="inline-flex items-center gap-3 rounded-full bg-cta px-6 py-4 text-xs font-bold uppercase tracking-[0.05em] text-cta-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-cta-hover hover:shadow-[0_10px_20px_rgba(23,52,38,0.15)]"
            >
              Se connecter <ArrowUpRight />
            </Link>
            <Link
              href="/#comment-ca-marche"
              className="inline-flex items-center gap-2 text-xs font-bold underline decoration-1 underline-offset-[5px] transition-opacity hover:opacity-75"
            >
              Voir comment ça marche <ArrowDownRight />
            </Link>
          </div>
          <PwaInstallButton />
          <div className="mt-14 flex items-center gap-2 font-mk-mono text-[10px] text-mk-moss">
            <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-mk-moss" />
            Enregistre les visiteurs même sans réseau, des jours durant.
          </div>
        </div>

        {/* Visuel en bas du hero : révélé au scroll (clip-path depuis le coin bas-droit,
            scrub lié au scroll — même esprit que l'effet "corner scroll", sans pin pour
            rester léger et sûr sur mobile), puis slide auto entre Niveau 1 et Niveau 2. */}
        <div className="hero-corner-visual relative mx-auto mt-16 max-w-4xl overflow-hidden rounded-[1.4rem] shadow-[0_30px_70px_rgba(23,52,38,0.18)] will-change-[clip-path]">
          <AutoSlide
            interval={7000}
            showDots={false}
            slides={[
              <Image
                key="niveau1"
                src="/landing-images/hero.webp"
                alt="Formulaire REKOLLECTE sur tablette, badge visiteur avec QR Code"
                width={1200}
                height={1200}
                className="h-auto w-full"
                priority
              />,
              <Image
                key="niveau2"
                src="/landing-images/Hero+.webp"
                alt="REKOLLECTE+ : fini le surbooking, des réservations claires pour l'équipe"
                width={1254}
                height={1254}
                className="h-auto w-full"
              />,
            ]}
          />
        </div>
        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap justify-between gap-x-4 gap-y-1 px-2 font-mk-mono text-[10px] uppercase tracking-[0.08em] text-mk-ink">
          <span className="min-w-0">Une prise en main immédiate.</span>
          <span className="min-w-0">Un accueil qui reste fluide.</span>
        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto grid gap-12 bg-mk-deep px-5 py-24 text-deep-ink sm:px-10 lg:grid-cols-[1fr_3fr] lg:py-36">
        <div className="flex items-start justify-between font-mk-mono text-[10px] uppercase tracking-[0.12em] text-mk-sage lg:flex-col lg:gap-4">
          <span>D&apos;où ça vient</span>
        </div>
        <div>
          <p className="big-statement max-w-3xl text-[2.4rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[3.5rem] lg:text-[4.2rem]">
            Un cahier à 1000 FCFA reste imbattable sur le terrain. <em className="font-mk-serif font-bold not-italic text-mk-lime italic">Jusqu&apos;à ce qu&apos;il faille relire l&apos;écriture de quelqu&apos;un.</em>
          </p>
          <div className="mt-16 max-w-sm border-t border-deep-ink/15 pt-6">
            <p className="text-sm leading-relaxed text-mk-sage">
              Le papier ne tombe jamais en panne, ne demande pas de réseau. Mais il se perd, s&apos;abîme, et
              personne ne peut le consulter à distance. REKOLLECTE garde la simplicité du cahier et ajoute
              ce qu&apos;il ne pourra jamais faire.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-mk-sage">
              Et le jour où ce visiteur devient client — il réserve, il consomme, il doit payer et
              repartir à l&apos;heure — un deuxième cahier entre en scène, avec ses propres pages
              raturées. C&apos;est celui-là que <em className="font-mk-serif italic font-bold text-mk-lime">REKOLLECTE+</em> remplace.
            </p>
            <div className="mt-8 flex items-center gap-4 font-mk-mono text-[10px] leading-relaxed text-mk-sage">
              <Logo size={40} className="rounded-full border border-mk-sage/40 bg-deep-ink/5 p-1.5" />
              <span>
                Conçu pour le terrain
                <br />à Abidjan
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="px-5 py-24 sm:px-10 lg:py-36">
        <div className="mb-16 max-w-xl">
          <div className="flex items-center gap-2.5 font-mk-mono text-[10px] uppercase tracking-[0.12em] text-mk-ink">
            <span className="h-px w-7 bg-current" /> Ce que ça change
          </div>
          <h2 className="mt-6 text-[2.6rem] leading-[0.95] tracking-[-0.03em] sm:text-[3.5rem]">
            Le strict nécessaire, <em className="font-mk-serif italic font-bold text-mk-moss">rien à installer.</em>
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.n} className="feature-card overflow-hidden rounded-[1.4rem] border border-mk-ink/10 bg-white/40">
              <div className="aspect-[4/3] overflow-hidden">
                <Image
                  src={f.image}
                  alt={f.title}
                  width={640}
                  height={480}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-8">
                <span className="font-mk-mono text-xs text-mk-moss">{f.n}</span>
                <h3 className="mt-4 text-xl font-bold tracking-[-0.01em]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mk-ink/70">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Niveau 2 — REKOLLECTE+ */}
      <section className="grid gap-10 bg-mk-deep px-5 py-24 text-deep-ink sm:px-10 lg:grid-cols-[1fr_1.4fr] lg:py-36">
        <div>
          <div className="flex items-center gap-2.5 font-mk-mono text-[10px] uppercase tracking-[0.12em] text-mk-sage">
            <span className="h-px w-7 bg-current" /> Niveau 2
          </div>
          <h2 className="mt-6 text-[2.6rem] leading-[0.95] tracking-[-0.03em] sm:text-[3.5rem]">
            Ton registre peut <em className="font-mk-serif italic font-bold text-mk-lime">devenir REKOLLECTE+.</em>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-mk-sage">
            Le registre reste le socle : rien n&apos;y change. Mais un visiteur qui réserve, paie
            et attend un rappel mérite mieux qu&apos;un carnet à part. Active REKOLLECTE+ depuis tes
            paramètres — réservations, paiements et rappels rejoignent le même endroit que le
            registre.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {KARNET_HIGHLIGHTS.map((item) => (
            <div key={item.title} className="karnet-card overflow-hidden rounded-[1.2rem] border border-deep-ink/15">
              {item.image && (
                <div className="aspect-square overflow-hidden">
                  <Image src={item.image} alt={item.title} width={640} height={640} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <p className="font-bold text-deep-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-mk-sage">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="comment-ca-marche" className="grid gap-12 px-5 py-24 sm:px-10 lg:grid-cols-[1fr_1.4fr] lg:py-36">
        <div>
          <div className="flex items-center gap-2.5 font-mk-mono text-[10px] uppercase tracking-[0.12em] text-mk-ink">
            <span className="h-px w-7 bg-current" /> Le parcours
          </div>
          <h2 className="mt-6 text-[2.6rem] leading-[0.95] tracking-[-0.03em] sm:text-[3.5rem]">
            Du scan <br />
            <em className="font-mk-serif italic font-bold text-mk-moss">au dashboard.</em>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-mk-ink/70">
            Quatre étapes, pensées pour un accueil qui n&apos;a pas le temps d&apos;expliquer une application à
            chaque visiteur.
          </p>
        </div>
        <div className="method-steps">
          <AutoSlide
            interval={7500}
            slides={[
              <div key="niveau1">
                <p className="mb-5 font-mk-mono text-[10px] uppercase tracking-[0.1em] text-mk-moss">R3NS3IGN3M3NT — niveau 1</p>
                <ol className="method-steps-list flex flex-col gap-8">
                  {STEPS.map((step) => (
                    <li key={step.n} className="flex gap-6 border-t border-mk-ink/10 pt-6 first:border-t-0 first:pt-0">
                      <span className="font-mk-mono text-sm text-mk-moss">{step.n}</span>
                      <div>
                        <h3 className="text-lg font-bold">{step.title}</h3>
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-mk-ink/70">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>,
              <div key="niveau2">
                <p className="mb-5 font-mk-mono text-[10px] uppercase tracking-[0.1em] text-mk-moss">REKOLLECTE+ — niveau 2</p>
                <ol className="flex flex-col gap-8">
                  {REKOLLECTE_STEPS.map((step) => (
                    <li key={step.n} className="flex gap-6 border-t border-mk-ink/10 pt-6 first:border-t-0 first:pt-0">
                      <span className="font-mk-mono text-sm text-mk-moss">{step.n}</span>
                      <div>
                        <h3 className="text-lg font-bold">{step.title}</h3>
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-mk-ink/70">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>,
            ]}
          />
        </div>
      </section>

      {/* Promesses */}
      <section className="border-t border-mk-ink/10 px-5 py-20 sm:px-10">
        <div className="flex justify-between font-mk-mono text-[10px] uppercase tracking-[0.08em] text-mk-moss">
          <span>Pensé pour le terrain</span>
          <span>REKOLLECTE / 2026</span>
        </div>
        <p className="mt-10 max-w-3xl text-2xl font-bold leading-snug tracking-[-0.02em] sm:text-4xl">
          Une bonne expérience d&apos;accueil <em className="font-mk-serif italic font-bold text-mk-moss">se remarque quand elle ne pose aucun problème.</em>
        </p>
        <div className="promise-list mt-10 grid gap-4 sm:grid-cols-2">
          {[
            "Zéro compte, zéro friction pour le visiteur",
            "Hors-ligne par défaut, pas en option",
            "Un formulaire adapté à chaque secteur",
            "Export CSV et QR régénérable à tout moment",
          ].map((item) => (
            <div key={item} className="promise-item flex items-center gap-3 text-sm text-mk-ink">
              <CheckMark size={16} />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section px-5 py-20 sm:px-10 lg:py-28">
        <div className="faq-card mx-auto max-w-5xl rounded-[1.6rem] border border-mk-ink/10 bg-mk-stone p-7 sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <div className="flex items-center gap-2.5 font-mk-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mk-ink"><span className="h-px w-7 bg-current" /> Questions fréquentes</div>
              <h2 className="mt-5 text-3xl font-bold leading-[0.98] tracking-[-0.03em] sm:text-4xl">Tout savoir avant de commencer.</h2>
              <p className="mt-4 text-sm leading-relaxed text-mk-ink/70">Les réponses aux questions que se posent les équipes d’accueil avant de remplacer leur registre papier.</p>
              <Link href="/connexion" className="mt-7 inline-flex items-center gap-3 rounded-full bg-cta px-6 py-3.5 text-xs font-bold uppercase tracking-[0.05em] text-cta-ink transition hover:-translate-y-0.5 hover:bg-cta-hover">Créer mon espace <ArrowUpRight /></Link>
            </div>
            <div className="divide-y divide-mk-ink/10 border-y border-mk-ink/10">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={faq.question}>
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)} className="flex w-full items-center justify-between gap-6 py-5 text-left text-sm font-bold text-mk-ink transition-opacity hover:opacity-70">
                      <span>{faq.question}</span>
                      <span aria-hidden="true" className={`relative h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}><span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 bg-current" /><span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-current" /></span>
                    </button>
                    <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden"><p className="pb-5 pr-10 text-sm leading-relaxed text-mk-ink/70">{faq.answer}</p></div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final — le carrousel Sécurité (Niveau 1 / REKOLLECTE+) sert de fond */}
      <section className="px-5 py-24 sm:px-10 lg:py-32">
        <div className="relative isolate overflow-hidden rounded-[1.4rem] px-8 py-20 text-center sm:px-16">
          <div className="absolute inset-0 -z-20">
            <AutoSlide
              interval={7500}
              showDots={false}
              className="h-full"
              slides={[
                <Image key="niveau1" src="/landing-images/securite-wide.webp" alt="" width={2000} height={780} className="h-full w-full object-cover" />,
                <Image key="niveau2" src="/landing-images/securite-wide+.webp" alt="" width={2007} height={784} className="h-full w-full object-cover" />,
              ]}
            />
          </div>
          <div className="absolute inset-0 -z-10 bg-deep-ink/72" />
          <h2 className="relative mx-auto max-w-lg text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
            Prêt à ranger le cahier ?
          </h2>
          <p className="relative mx-auto mt-4 max-w-sm text-sm text-white/80">
            Connecte-toi avec Google — ton espace, ton QR et ton premier formulaire sont prêts en quelques secondes.
          </p>
          <Link
            href="/connexion"
            className="relative mt-8 inline-flex items-center gap-3 rounded-full bg-cta px-7 py-4 text-xs font-bold uppercase tracking-[0.05em] text-cta-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-cta-hover"
          >
            Se connecter <ArrowUpRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
