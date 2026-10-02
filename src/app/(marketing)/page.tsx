"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { ArrowDownRight, ArrowUpRight, CheckMark } from "@/components/icons";
import Logo from "@/components/Logo";
import PwaInstallButton from "@/components/marketing/PwaInstallButton";
import { SITE_URL } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FAQS = [
  { question: "Le visiteur doit-il créer un compte ?", answer: "Non. Il scanne simplement le QR Code, remplit le formulaire depuis son téléphone ou la tablette d’accueil, puis signe. Aucune application ni inscription n’est nécessaire." },
  { question: "Est-ce que ça fonctionne sans connexion ?", answer: "Oui. Le formulaire continue d’enregistrer les visites hors-ligne sur l’appareil. Les données se synchronisent automatiquement dès que la connexion revient." },
  { question: "Puis-je adapter le formulaire à mon activité ?", answer: "Oui. Tu choisis les champs utiles à ton établissement — bureau, restaurant, hôtel, chantier ou autre — puis tu peux les modifier à tout moment." },
  { question: "Qui peut consulter les visites enregistrées ?", answer: "Tu contrôles les accès depuis ton espace. Le patron peut gérer l’ensemble du registre et inviter un gérant ou un membre du staff avec des permissions adaptées à son rôle." },
];

const FEATURES = [
  { number: "01", eyebrow: "Entrée sans friction", title: "Un scan. Pas de compte. Pas de file.", body: "Le visiteur arrive, scanne le QR Code et avance. Le formulaire s’adapte à ton activité, pas l’inverse.", image: "/landing-images/hero.webp", tone: "light" },
  { number: "02", eyebrow: "Fiabilité terrain", title: "Même quand le réseau décide de partir.", body: "La tablette continue d’enregistrer. Dès que la connexion revient, les visites partent vers le dashboard sans action supplémentaire.", image: "/landing-images/offline.webp", tone: "blue" },
  { number: "03", eyebrow: "Clarté opérationnelle", title: "Tout ce qui compte, au même endroit.", body: "Retrouve une visite en quelques secondes, filtre ton registre, exporte tes données et garde un œil sur chaque point d’accueil.", image: "/landing-images/secteurs.webp", tone: "lime" },
];

const STEPS = [
  { n: "01", title: "Tu configures", body: "Ton établissement, tes champs, ton logo. Le premier formulaire est prêt en quelques minutes." },
  { n: "02", title: "Tu affiches", body: "Un QR Code à l’accueil, sur une table ou à l’entrée du chantier. Le parcours devient évident." },
  { n: "03", title: "Tu retrouves", body: "Chaque passage remonte dans ton espace. Même les journées où le réseau n’a pas coopéré." },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "REKOLLECTE", url: SITE_URL, logo: `${SITE_URL}/icons/icon-512.png` },
    { "@type": "SoftwareApplication", "@id": `${SITE_URL}/#rekollecte`, name: "REKOLLECTE", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "Registre visiteurs numérique par QR Code, sans compte pour le visiteur et fonctionnant hors ligne.", provider: { "@id": `${SITE_URL}/#organization` } },
    { "@type": "FAQPage", "@id": `${SITE_URL}/#faq`, mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) },
  ],
};

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useGSAP(() => {
    const hero = gsap.timeline({ defaults: { ease: "power3.out" } });
    hero.from(".hero-reveal", { y: 26, opacity: 0, duration: 0.75, stagger: 0.08, delay: 0.18 })
      .from(".hero-product", { y: 52, opacity: 0, scale: 0.96, duration: 1.1 }, "-=0.5")
      .from(".hero-float", { y: 22, opacity: 0, duration: 0.65 }, "-=0.6");

    gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
      gsap.from(element, { scrollTrigger: { trigger: element, start: "top 84%", toggleActions: "play none none reverse" }, y: 42, opacity: 0, duration: 0.8, ease: "power3.out" });
    });

    gsap.utils.toArray<HTMLElement>(".parallax").forEach((element) => {
      const speed = Number(element.dataset.speed || 0.12);
      gsap.to(element, { yPercent: speed * -28, ease: "none", scrollTrigger: { trigger: element, start: "top bottom", end: "bottom top", scrub: true } });
    });

    gsap.to(".hero-glow", { xPercent: 12, yPercent: -10, ease: "none", scrollTrigger: { trigger: ".landing-hero", start: "top top", end: "bottom top", scrub: true } });
  }, { scope: root });

  return (
    <div ref={root} className="landing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <section id="produit" className="landing-hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-noise" aria-hidden="true" />
        <div className="landing-container landing-hero__grid">
          <div className="landing-hero__copy">
            <div className="hero-reveal eyebrow"><span className="status-dot" /> Registre visiteurs numérique / Abidjan</div>
            <h1 className="hero-reveal">Le registre visiteurs.<br /><em>Sans le stress.</em></h1>
            <p className="hero-reveal landing-hero__lead">Un QR Code à l&apos;accueil. Une trace propre derrière. REKOLLECTE remplace le cahier papier pour les bureaux, hôtels, restaurants et accès chantier — même hors-ligne.</p>
            <div className="hero-reveal landing-actions">
              <Link href="/connexion" className="button button--primary">Créer mon espace <ArrowUpRight size={17} /></Link>
              <Link href="#comment-ca-marche" className="button button--text">Voir comment ça marche <ArrowDownRight size={16} /></Link>
            </div>
            <div className="hero-reveal landing-hero__proof"><span><CheckMark size={14} /> Sans compte visiteur</span><span><CheckMark size={14} /> Hors-ligne</span><span><CheckMark size={14} /> Prêt en 2 min</span></div>
            <PwaInstallButton />
          </div>

          <div className="hero-stage">
            <div className="hero-stage__ring hero-stage__ring--one" />
            <div className="hero-stage__ring hero-stage__ring--two" />
            <div className="hero-product parallax" data-speed="0.28">
              <div className="product-window__bar"><span className="window-dots"><i /><i /><i /></span><span>app.rekollecte / registre</span><span className="window-live">LIVE</span></div>
              <div className="product-window__image"><Image src="/landing-images/hero.webp" alt="Interface REKOLLECTE sur une tablette à l'accueil" fill priority sizes="(max-width: 900px) 92vw, 600px" /></div>
              <div className="product-window__footer"><span><i className="signal-bars"><b /><b /><b /></i> Synchronisé il y a 4 sec</span><span>03 points d&apos;accueil <ArrowUpRight size={13} /></span></div>
            </div>
            <div className="hero-float hero-float--top"><span className="hero-float__icon">✓</span><span><strong>12 visites</strong><small>enregistrées aujourd&apos;hui</small></span></div>
            <div className="hero-float hero-float--bottom"><span className="hero-float__pulse" /><span><strong>Mode hors-ligne</strong><small>La collecte continue</small></span></div>
            <div className="hero-stage__caption"><span>01 / 03</span><span>Un accueil qui avance</span></div>
          </div>
        </div>
        <div className="landing-container hero-scroll-cue"><span>Défiler pour découvrir</span><span className="hero-scroll-cue__line" /></div>
      </section>

      <section className="logo-strip" aria-label="Secteurs couverts">
        <div className="landing-container logo-strip__inner"><span className="logo-strip__label">Pensé pour les lieux qui accueillent</span><div className="logo-strip__items"><span>HÔTELS</span><span>BUREAUX</span><span>RESTAURANTS</span><span>CHANTIERS</span><span>ÉCOLES</span></div></div>
      </section>

      <section className="landing-manifesto">
        <div className="landing-container landing-manifesto__grid">
          <div className="eyebrow eyebrow--light reveal"><span className="eyebrow-line" /> Le vrai problème</div>
          <div className="landing-manifesto__content reveal"><h2>Le cahier papier avait une mission.<br /><em>Donne-lui une meilleure suite.</em></h2><p>Le papier ne tombe jamais en panne. Mais il se perd, s&apos;abîme, et personne ne peut le consulter à distance. REKOLLECTE garde la simplicité du cahier et ajoute ce qu&apos;il ne pourra jamais faire.</p><div className="manifesto-metrics"><div><strong>0</strong><span>compte à créer<br />pour le visiteur</span></div><div><strong>24/7</strong><span>registre disponible<br />quand tu en as besoin</span></div><div><strong>2 min</strong><span>pour passer du cahier<br />à ton premier QR</span></div></div></div>
        </div>
      </section>

      <section id="fonctionnalites" className="landing-features landing-section">
        <div className="landing-container">
          <div className="section-intro reveal"><div className="eyebrow"><span className="eyebrow-line" /> Le produit</div><h2>Moins de clics.<br /><em>Plus de contrôle.</em></h2><p>Une expérience légère pour le visiteur. Une vue nette pour l&apos;équipe. Tout ce qui compte, sans couche inutile.</p></div>
          <div className="feature-stack">
            {FEATURES.map((feature, index) => <article key={feature.number} className={`feature-row feature-row--${feature.tone} reveal`}><div className="feature-row__copy"><span className="feature-number">{feature.number}</span><span className="eyebrow">{feature.eyebrow}</span><h3>{feature.title}</h3><p>{feature.body}</p><Link href="/connexion" className="inline-link">Découvrir la fonctionnalité <ArrowUpRight size={15} /></Link></div><div className="feature-row__visual"><div className="feature-image parallax" data-speed={String(0.14 + index * 0.05)}><Image src={feature.image} alt="" fill sizes="(max-width: 900px) 88vw, 540px" /></div>{index === 1 && <div className="feature-badge feature-badge--offline"><span className="hero-float__pulse" /> Pas de réseau ? Pas de problème.</div>}{index === 2 && <div className="feature-badge feature-badge--secure"><span>✦</span> Données protégées</div>}</div></article>)}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="landing-journey">
        <div className="landing-container landing-journey__grid"><div className="landing-journey__intro reveal"><div className="eyebrow"><span className="eyebrow-line" /> Mise en place</div><h2>Du premier scan<br /><em>au registre clair.</em></h2><p>Pas de déploiement interminable. Pas de formation à organiser. Tu configures, tu affiches, tu avances.</p><Link href="/connexion" className="button button--dark">Configurer mon registre <ArrowUpRight size={17} /></Link></div><div className="steps-list">{STEPS.map((step, index) => <div key={step.n} className="step-item reveal"><div className="step-item__number">{step.n}</div><div className="step-item__content"><h3>{step.title}</h3><p>{step.body}</p></div><div className={`step-item__marker ${index === 2 ? "step-item__marker--active" : ""}`} /></div>)}</div></div>
      </section>

      <section className="landing-usecases landing-section"><div className="landing-container"><div className="usecases-header reveal"><div className="eyebrow"><span className="eyebrow-line" /> Adapté à ton terrain</div><h2>Un accueil cohérent,<br /><em>partout où tu en as un.</em></h2></div><div className="usecases-grid"><div className="usecase-card usecase-card--blue reveal"><span className="usecase-index">01 / 04</span><h3>Hôtel & résidence</h3><p>Une arrivée fluide, un historique retrouvé, une équipe qui sait qui est passé.</p><span className="usecase-arrow">↗</span></div><div className="usecase-card usecase-card--image reveal"><Image src="/landing-images/REKOLLECTE+.webp" alt="Dashboard de gestion REKOLLECTE+" fill sizes="(max-width: 900px) 88vw, 360px" /><div className="usecase-card__overlay"><span className="usecase-index">02 / 04</span><h3>Clients & réservations</h3></div></div><div className="usecase-card usecase-card--lime reveal"><span className="usecase-index">03 / 04</span><h3>Bureau & chantier</h3><p>Centralise les passages de tous tes points d&apos;accueil, avec ou sans connexion.</p><span className="usecase-arrow">↗</span></div><div className="usecase-card usecase-card--dark reveal"><span className="usecase-index">04 / 04</span><h3>Équipe informée.</h3><p>Les bonnes données, au bon endroit, au bon moment.</p><Link href="/connexion" className="usecase-link">Voir l&apos;espace <ArrowUpRight size={15} /></Link></div></div></div></section>

      <section className="landing-quote"><div className="landing-container landing-quote__inner reveal"><div className="quote-mark">“</div><blockquote>Une bonne expérience d&apos;accueil se remarque quand elle ne pose aucun problème.</blockquote><div className="quote-credit"><span className="quote-avatar"><Logo size={28} /></span><span><strong>REKOLLECTE</strong><small>Conçu pour le terrain à Abidjan</small></span></div></div></section>

      <section id="faq" className="landing-faq landing-section"><div className="landing-container landing-faq__grid"><div className="section-intro reveal"><div className="eyebrow"><span className="eyebrow-line" /> Questions fréquentes</div><h2>Tout savoir<br /><em>avant de commencer.</em></h2><p>Les réponses aux questions que se posent les équipes d&apos;accueil avant de remplacer leur registre papier.</p><Link href="/aide" className="inline-link">Voir toute l&apos;aide <ArrowUpRight size={15} /></Link></div><div className="faq-list reveal">{FAQS.map((faq, index) => { const isOpen = openFaq === index; return <div key={faq.question} className={`faq-item ${isOpen ? "faq-item--open" : ""}`}><button type="button" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)}><span>{faq.question}</span><span className="faq-plus" aria-hidden="true" /></button><div className="faq-answer"><p>{faq.answer}</p></div></div>; })}</div></div></section>

      <section className="landing-final"><div className="landing-final__grid" /><div className="landing-container landing-final__inner reveal"><div className="eyebrow eyebrow--light"><span className="status-dot status-dot--lime" /> Prêt pour le prochain accueil ?</div><h2>Ranger le cahier.<br /><em>Garder l&apos;essentiel.</em></h2><p>Ton espace, ton QR Code et ton premier formulaire sont prêts en quelques minutes.</p><Link href="/connexion" className="button button--lime">Créer mon espace <ArrowUpRight size={17} /></Link></div><div className="landing-final__wordmark" aria-hidden="true">REKOLLECTE</div></section>
    </div>
  );
}
