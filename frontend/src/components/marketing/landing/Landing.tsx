"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ChartBar, CheckCircle, ClipboardText, QrCode, WifiSlash } from "@phosphor-icons/react";

import { ArrowDownRight, ArrowUpRight, CheckMark } from "@/components/icons";
import Logo from "@/components/Logo";
import Hills from "@/components/marketing/landing/Hills";
import {
  ChartPanel, MiniDash, MiniOffline, MiniScan, MiniSectors, ReservationsPanel, RolesPanel, VisitorsPanel,
} from "@/components/marketing/landing/Mockups";
import Marquee from "@/components/marketing/Marquee";
import PwaInstallButton from "@/components/marketing/PwaInstallButton";
import { useLenis } from "@/components/marketing/SmoothScroll";
import { FAQS, FEATURE_ROWS, PRICING, PROMISES, SECTORS, STEPS, STEPS_PLUS, WHY } from "@/lib/landingData";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ROW_PANELS = [VisitorsPanel, ChartPanel, RolesPanel, ReservationsPanel];
const WHY_VISUALS = [MiniScan, MiniOffline, MiniSectors, MiniDash];
const WHY_GLYPHS = [QrCode, WifiSlash, ClipboardText, ChartBar];

function Label({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <span className={`lp-label ${light ? "lp-label--light" : ""}`}>{children}</span>;
}

function SectionHead({ label, title, lead }: { label: string; title: React.ReactNode; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center" data-reveal>
      <Label>{label}</Label>
      <h2 className="mt-5 text-[clamp(2rem,4.6vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.03em] text-ink">{title}</h2>
      {lead && <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-soft">{lead}</p>}
    </div>
  );
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [whyActive, setWhyActive] = useState(0);
  const [level, setLevel] = useState<0 | 1>(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)", mobile: "(max-width: 767px)" }, (context) => {
        const { motion, mobile } = context.conditions as { motion: boolean; mobile: boolean };
        if (!motion) return;

        // 1. Entrée du hero : les lignes du titre se révèlent depuis un masque.
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .from(".hero-line", { yPercent: 115, duration: 1.25, stagger: 0.12 })
          .from(".hero-fade", { y: 22, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=0.8")
          .from(".hero-chip", { scale: 0.85, opacity: 0, duration: 0.8, stagger: 0.15, ease: "back.out(1.6)" }, "-=0.55");

        // 2. Hero au scroll : la carte se resserre, le texte s'efface légèrement.
        const heroScroll = { trigger: ".lp-hero-wrap", start: 0, end: "bottom top", scrub: true };
        gsap.to(".lp-hero", { scale: 0.95, transformOrigin: "50% 0%", ease: "none", scrollTrigger: heroScroll });
        gsap.to(".hero-content", { yPercent: -10, opacity: 0.25, ease: "none", scrollTrigger: heroScroll });

        // 3. Collines : chaque couche (data-hill) décalée à sa vitesse — transform uniquement.
        gsap.utils.toArray<HTMLElement>(".lp-hills").forEach((wrap) => {
          wrap.querySelectorAll<SVGElement>("[data-hill]").forEach((layer) => {
            const depth = Number(layer.dataset.hill) - 1;
            gsap.to(layer, {
              y: depth * 42,
              ease: "none",
              scrollTrigger: { trigger: wrap.parentElement ?? wrap, start: "top bottom", end: "bottom top", scrub: true },
            });
          });
        });

        // 4. Multi-vitesses (réf. gemini : data-speed) — <1 plus lent, >1 plus rapide.
        gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
          const amp = (1 - (Number(el.dataset.speed) || 1)) * (mobile ? 0.5 : 1);
          gsap.fromTo(
            el,
            { y: () => -amp * window.innerHeight * 0.5 },
            {
              y: () => amp * window.innerHeight * 0.5,
              ease: "none",
              scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
            },
          );
        });

        // 5. Révélations à l'entrée dans le viewport.
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          const dir = el.dataset.reveal;
          gsap.from(el, {
            x: dir === "left" ? -60 : dir === "right" ? 60 : 0,
            y: dir === "left" || dir === "right" ? 0 : 44,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        const stagger = (items: string, trigger: string, y = 50) =>
          gsap.from(items, {
            y,
            opacity: 0,
            duration: 0.9,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger, start: "top 82%", once: true },
          });
        stagger(".lp-why-card", ".lp-why-grid");
        stagger(".lp-price-card", ".lp-price-grid");
        stagger(".lp-step-card", ".lp-steps", 36);
        stagger(".lp-promise-row", ".lp-promises", 36);

        // 6. Ligne du parcours : se remplit au rythme du scroll.
        gsap.fromTo(
          ".lp-line-fill",
          { scaleX: 0 },
          { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".lp-steps", start: "top 70%", end: "bottom 55%", scrub: true } },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // 7. Inclinaison légère selon la vitesse du scroll (vélocité Lenis) sur les maquettes.
  useEffect(() => {
    if (!lenis || !root.current) return undefined;
    const els = gsap.utils.toArray<HTMLElement>("[data-skew]", root.current);
    if (!els.length) return undefined;
    const setters = els.map((el) => gsap.quickTo(el, "skewY", { duration: 0.6, ease: "power3.out" }));
    let timer = 0;
    const onScroll = () => {
      const v = Math.max(-20, Math.min(20, lenis.velocity));
      setters.forEach((set) => set(v * 0.08));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setters.forEach((set) => set(0)), 140);
    };
    lenis.on("scroll", onScroll);
    return () => {
      lenis.off("scroll", onScroll);
      window.clearTimeout(timer);
      gsap.set(els, { skewY: 0 });
    };
  }, [lenis]);

  const steps = level === 0 ? STEPS : STEPS_PLUS;

  return (
    <div ref={root} className="min-w-0 max-w-full overflow-x-clip">
      {/* ——— Hero ——— */}
      <section id="accueil" className="lp-hero-wrap px-3 pb-6 pt-3 sm:px-5">
        <div className="lp-hero relative isolate mx-auto flex min-h-[40rem] max-w-[1280px] flex-col items-center overflow-hidden rounded-[1.75rem] text-center text-white sm:min-h-[45rem] sm:rounded-[2.25rem]">
          <div className="lp-hero-bg absolute inset-0 -z-20" aria-hidden="true" />
          <div className="absolute -left-10 top-16 -z-10 h-40 w-72 rounded-full bg-white/25 blur-3xl" aria-hidden="true" data-speed="0.8" />
          <div className="absolute -right-16 top-36 -z-10 h-48 w-80 rounded-full bg-white/20 blur-3xl" aria-hidden="true" data-speed="0.7" />

          <div className="hero-content relative z-10 flex flex-col items-center px-5 pt-16 sm:pt-24">
            <h1 className="max-w-4xl text-balance text-[clamp(2.2rem,6vw,4.6rem)] font-bold leading-[1.06] tracking-[-0.035em]">
              <span className="block overflow-hidden py-[0.06em]">
                <span className="hero-line block">
                  Le cahier
                  <span className="mx-[0.14em] inline-grid h-[0.9em] w-[0.9em] translate-y-[0.1em] place-items-center rounded-[0.28em] bg-white/90 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)] ring-1 ring-white/70" aria-hidden="true">
                    <Logo size={56} className="h-[68%] w-[68%] object-contain" />
                  </span>
                  de visites
                </span>
              </span>
              <span className="block overflow-hidden py-[0.06em]">
                <span className="hero-line block">devient un simple scan.</span>
              </span>
            </h1>
            <p className="hero-fade mt-6 max-w-xl text-[0.95rem] leading-relaxed text-white/85 sm:text-base">
              REKOLLECTE remplace le registre papier des bureaux, restaurants, hôtels et accès chantier : le visiteur
              scanne, remplit, signe. Sans compte, même hors-ligne.
            </p>
            <div className="hero-fade mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/connexion" className="lp-glass lp-glass--primary">Se connecter <ArrowUpRight size={14} /></Link>
              <Link href="/#comment-ca-marche" className="lp-glass">Voir comment ça marche <ArrowDownRight size={14} /></Link>
            </div>
            <div className="hero-fade [&_button]:!bg-white/90 [&_button]:!text-[#12231a]"><PwaInstallButton /></div>
            <p className="hero-fade mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-bold text-white/75">
              <span className="inline-flex items-center gap-1.5"><CheckMark size={12} /> Hors-ligne</span>
              <span className="inline-flex items-center gap-1.5"><CheckMark size={12} /> Sans carte bancaire</span>
              <span className="inline-flex items-center gap-1.5"><CheckMark size={12} /> Prêt en 2 minutes</span>
            </p>
          </div>

          {/* Pastilles flottantes (parallaxe à vitesses différentes) */}
          <div className="hero-chip absolute bottom-[26%] left-[5%] z-10 hidden items-center gap-2.5 rounded-2xl border border-white/50 bg-white/20 px-3.5 py-2.5 text-left shadow-xl backdrop-blur-md md:flex" data-speed="1.18">
            <CheckCircle size={22} weight="fill" className="text-[#d6e7a8]" />
            <div><p className="text-xs font-bold leading-none">Visiteur enregistré</p><p className="mt-1 text-[10px] leading-none text-white/75">Signé au doigt · 14:22</p></div>
          </div>
          <div className="hero-chip absolute bottom-[34%] right-[5%] z-10 hidden items-center gap-2.5 rounded-2xl border border-white/50 bg-white/20 px-3.5 py-2.5 text-left shadow-xl backdrop-blur-md md:flex" data-speed="0.86">
            <WifiSlash size={22} weight="bold" className="text-[#d6e7a8]" />
            <div><p className="text-xs font-bold leading-none">Hors-ligne</p><p className="mt-1 text-[10px] leading-none text-white/75">3 visites en attente de synchro</p></div>
          </div>

          <div className="lp-hills absolute inset-x-0 bottom-0 z-0 h-[34%] sm:h-[38%]">
            <Hills className="h-full" />
          </div>
        </div>
      </section>

      {/* ——— Pensé pour (bande défilante) ——— */}
      <section className="py-14 sm:py-16" aria-label="Secteurs">
        <p className="mb-7 text-center text-xs font-bold text-ink" data-reveal>Pensé pour tous les lieux qui accueillent du monde</p>
        <Marquee duration={50}>
          {[...SECTORS, ...SECTORS].map((sector, i) => (
            <span key={`${sector}-${i}`} className="flex items-center gap-2.5 px-5 text-base font-bold text-ink/45 sm:text-lg">
              <span className="h-2 w-2 rounded-full bg-cta/60" aria-hidden="true" /> {sector}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ——— Pourquoi REKOLLECTE ——— */}
      <section id="pourquoi" className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end" data-reveal>
          <div>
            <Label>Pourquoi REKOLLECTE ?</Label>
            <h2 className="mt-4 text-[clamp(2rem,4.6vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.03em] text-ink">Fait pour le terrain.</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft lg:justify-self-end">
            Un cahier à 1000 FCFA reste imbattable sur le terrain, jusqu&apos;à ce qu&apos;il faille relire l&apos;écriture de
            quelqu&apos;un. REKOLLECTE garde la simplicité du cahier et ajoute ce qu&apos;il ne pourra jamais faire.
          </p>
        </div>

        <div
          className="lp-why-grid mt-10 grid gap-3 lg:[grid-template-columns:var(--cols)]"
          style={{ "--cols": WHY.map((_, i) => (i === whyActive ? "2.6fr" : "1fr")).join(" ") } as React.CSSProperties}
        >
          {WHY.map((item, i) => {
            const active = i === whyActive;
            const Visual = WHY_VISUALS[i]!;
            const Glyph = WHY_GLYPHS[i]!;
            return (
              <div
                key={item.n}
                role="button"
                tabIndex={0}
                aria-expanded={active}
                onMouseEnter={() => setWhyActive(i)}
                onFocus={() => setWhyActive(i)}
                onClick={() => setWhyActive(i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setWhyActive(i); } }}
                className={`lp-why-card cursor-pointer overflow-hidden rounded-[1.5rem] border border-border bg-surface p-3 outline-none transition-shadow duration-500 focus-visible:ring-2 focus-visible:ring-cta ${active ? "shadow-[0_24px_50px_-24px_rgb(var(--c-ink)/0.35)]" : ""}`}
              >
                <div className={`relative grid place-items-center overflow-hidden rounded-2xl bg-ink/[0.05] transition-[height] duration-500 ease-quiet ${active ? "h-60" : "h-0 lg:h-60"}`}>
                  {active ? (
                    <div className="w-full px-4"><Visual /></div>
                  ) : (
                    <>
                      <span className="absolute left-4 top-3 text-4xl font-bold text-ink/15">{item.n}.</span>
                      <Glyph size={96} weight="thin" className="text-ink/15" aria-hidden="true" />
                    </>
                  )}
                </div>
                <div className="px-3 pb-3 pt-4">
                  <h3 className="text-base font-bold leading-snug text-ink">
                    <span className="mr-2 text-xs text-cta lg:hidden">{item.n}</span>{item.title}
                  </h3>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-quiet ${active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <p className="overflow-hidden text-[0.8rem] leading-relaxed text-ink-soft">
                      <span className="block pt-2">{item.body}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ——— Fonctionnalités ——— */}
      <section id="fonctionnalites" data-lenis-duration="1.8" className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-6 sm:py-24">
        <SectionHead
          label="Fonctionnalités"
          title={<>Tout ce dont l&apos;accueil<br />a besoin.</>}
          lead="Un registre, des accès, des réservations : tout au même endroit, du scan du visiteur jusqu'au dashboard."
        />
        <div className="mt-14 space-y-5">
          {FEATURE_ROWS.map((row, i) => {
            const Panel = ROW_PANELS[i]!;
            const flip = i % 2 === 1;
            return (
              <article key={row.id} className="lp-row grid gap-3 rounded-[1.75rem] border border-border bg-surface p-3 lg:grid-cols-2">
                <div className={`flex flex-col justify-center px-5 py-8 sm:px-10 lg:py-12 ${flip ? "lg:order-2" : ""}`} data-reveal>
                  <h3 className="text-2xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[1.75rem]">{row.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">{row.body}</p>
                  <ul className="mt-6 space-y-3">
                    {row.checks.map((check) => (
                      <li key={check} className="flex items-start gap-2.5 text-[0.82rem] font-bold text-ink">
                        <span className="mt-0.5 text-cta"><CheckMark size={16} /></span> {check}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link href={row.cta.href} className="lp-btn">{row.cta.label} <ArrowUpRight size={14} /></Link>
                  </div>
                </div>
                <div className={`grid place-items-center rounded-[1.25rem] bg-ink/[0.05] p-4 sm:p-8 ${flip ? "lg:order-1" : ""}`}>
                  <div className="w-full max-w-md" data-speed={flip ? "0.94" : "1.06"} data-reveal={flip ? "left" : "right"}>
                    <Panel />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ——— Le parcours ——— */}
      <section id="comment-ca-marche" className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-6 sm:py-24">
        <SectionHead
          label="Le parcours"
          title={<>Du scan<br />au dashboard.</>}
          lead="Quatre étapes, pensées pour un accueil qui n'a pas le temps d'expliquer une application à chaque visiteur."
        />
        <div className="mt-8 flex justify-center" data-reveal>
          <div role="tablist" aria-label="Niveau" className="inline-flex rounded-full border border-border bg-surface p-1 shadow-subtle">
            {(["REKOLLECTE", "REKOLLECTE+"] as const).map((name, i) => (
              <button
                key={name}
                role="tab"
                type="button"
                aria-selected={level === i}
                onClick={() => setLevel(i as 0 | 1)}
                className={`rounded-full px-5 py-2.5 text-xs font-bold transition-colors duration-300 ${level === i ? "bg-cta text-cta-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="lp-steps relative mt-12">
          <div className="absolute left-[12.5%] right-[12.5%] top-[1.35rem] hidden h-px bg-border lg:block" aria-hidden="true">
            <div className="lp-line-fill h-full origin-left bg-cta" />
          </div>
          <ol key={level} className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.n} className="lp-step-card lp-fade-up rounded-[1.5rem] border border-border bg-surface p-6">
                <span className="relative z-10 grid h-11 w-11 place-items-center rounded-full border border-border bg-canvas text-sm font-bold text-cta">{step.n}</span>
                <h3 className="mt-5 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ——— Offres ——— */}
      <section id="offres" className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-6 sm:py-24">
        <SectionHead
          label="Offres"
          title={<>Gratuit pendant<br />la phase pilote.</>}
          lead="Le service reste gratuit le temps d'apprendre avec de vrais établissements. Les tarifs en FCFA seront annoncés ensuite, à partir des usages réels."
        />
        <div className="lp-price-grid mt-14 grid items-stretch gap-4 md:grid-cols-3">
          {PRICING.map((plan) => (
            <article
              key={plan.name}
              className={`lp-price-card relative isolate flex flex-col overflow-hidden rounded-[1.75rem] p-5 ${plan.popular ? "text-white md:-my-4 md:py-9" : "border border-border bg-surface text-ink"}`}
            >
              {plan.popular && (
                <>
                  <div className="lp-hero-bg absolute inset-0 -z-20" aria-hidden="true" />
                  <div className="lp-hills absolute inset-x-0 bottom-0 -z-10 h-1/2 opacity-90" aria-hidden="true"><Hills className="h-full" flowers={false} /></div>
                </>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{plan.name}</p>
                {plan.popular && <span className="rounded-full border border-white/50 bg-white/20 px-3 py-1 text-[10px] font-bold backdrop-blur">Recommandé</span>}
              </div>
              <p className="mt-6 text-center text-[2.6rem] font-bold leading-none tracking-[-0.03em]">{plan.price}</p>
              <p className={`mt-2 text-center text-[11px] font-bold ${plan.popular ? "text-white/80" : "text-ink-soft"}`}>{plan.note}</p>
              <Link href={plan.cta.href} className={`mt-6 ${plan.popular ? "lp-glass lp-glass--primary justify-center" : "lp-btn justify-center"}`}>{plan.cta.label}</Link>
              <div className={`mt-6 flex-1 rounded-2xl p-4 ${plan.popular ? "bg-surface text-ink" : "bg-ink/[0.04]"}`}>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[0.8rem] font-bold leading-snug">
                      <span className="mt-0.5 shrink-0 text-cta"><CheckMark size={15} /></span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
              {plan.popular && <div className="h-28 md:h-32" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      {/* ——— Sur le terrain (bandes défilantes) ——— */}
      <section className="lp-promises py-14 sm:py-24" aria-label="Ce que l'accueil gagne">
        <div className="px-4">
          <SectionHead label="Sur le terrain" title={<>Ce que l&apos;accueil gagne<br />dès le premier jour.</>} lead="Des promesses simples, tenues par le produit — pas par une équipe de support." />
        </div>
        <div className="mt-12 space-y-4">
          {[0, 1].map((row) => {
            const items = row === 0 ? PROMISES : [...PROMISES.slice(4), ...PROMISES.slice(0, 4)];
            return (
              <Marquee key={row} className="lp-promise-row" duration={row === 0 ? 70 : 85} reverse={row === 1}>
                {items.map((p) => (
                  <div key={p.text} className="flex w-[17.5rem] flex-col justify-between gap-6 rounded-2xl border border-border bg-surface p-5 sm:w-[21rem]">
                    <p className="text-[0.95rem] font-bold leading-snug text-ink">{p.text}</p>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-bg px-3 py-1.5 text-[10px] font-bold text-success-text"><CheckMark size={11} /> {p.tag}</span>
                  </div>
                ))}
              </Marquee>
            );
          })}
        </div>
      </section>

      {/* ——— FAQ ——— */}
      <section id="faq" className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-10 rounded-[1.75rem] border border-border bg-surface p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14" data-reveal>
          <div>
            <Label>Questions fréquentes</Label>
            <h2 className="mt-5 text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-4xl">Tout savoir avant de commencer.</h2>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">Les réponses aux questions que se posent les équipes d&apos;accueil avant de remplacer leur registre papier.</p>
            <Link href="/connexion" className="lp-btn mt-7">Créer mon espace <ArrowUpRight size={14} /></Link>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left text-sm font-bold text-ink transition-opacity hover:opacity-70"
                  >
                    <span>{faq.question}</span>
                    <span aria-hidden="true" className={`relative h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                      <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 bg-current" />
                      <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-current" />
                    </span>
                  </button>
                  <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden"><p className="pb-5 pr-10 text-sm leading-relaxed text-ink-soft">{faq.answer}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ——— CTA final ——— */}
      <section className="px-3 pb-16 pt-6 sm:px-5 sm:pb-24">
        <div className="relative isolate mx-auto flex max-w-[1180px] flex-col items-center overflow-hidden rounded-[1.75rem] px-6 pb-44 pt-16 text-center text-white sm:rounded-[2.25rem] sm:pb-52 sm:pt-20" data-reveal>
          <div className="lp-hero-bg absolute inset-0 -z-20" aria-hidden="true" />
          <div className="absolute left-1/2 top-0 -z-10 h-40 w-[28rem] -translate-x-1/2 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
          <Label light>Prêt à ranger le cahier ?</Label>
          <h2 className="mt-5 max-w-xl text-balance text-[clamp(2rem,4.8vw,3.4rem)] font-bold leading-[1.06] tracking-[-0.03em]">
            Ton registre numérique, prêt en quelques secondes.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85">
            Connecte-toi avec Google : ton espace, ton QR et ton premier formulaire sont prêts tout de suite.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/connexion" className="lp-glass lp-glass--primary">Se connecter <ArrowUpRight size={14} /></Link>
            <Link href="/aide" className="lp-glass">Lire l&apos;aide</Link>
          </div>
          <div className="lp-hills absolute inset-x-0 bottom-0 -z-10 h-[42%]"><Hills className="h-full" /></div>
        </div>
      </section>
    </div>
  );
}
