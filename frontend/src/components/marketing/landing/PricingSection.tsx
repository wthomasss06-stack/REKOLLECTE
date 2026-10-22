import Link from "next/link";

import { ArrowUpRight, CheckMark } from "@/components/icons";
import { FREE_PERIOD_ACTIVE, FREE_UNTIL_LABEL, PLANS, PRICING_FOOTNOTES } from "@/lib/pricing";

const secondaryBtn =
  "mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-ink transition-colors hover:border-ink";

/** Grille tarifaire de la landing. Pas d’état, pas d’effet : rendu identique côté serveur et côté client.
 *  Pendant la période de lancement (FREE_PERIOD_ACTIVE), les prix payants sont barrés : tout est libre jusqu’à la date annoncée. */
export default function PricingSection() {
  return (
    <section id="tarifs" aria-labelledby="tarifs-titre" className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <span className="lp-label">Tarifs</span>
        <h2 id="tarifs-titre" className="mt-5 text-[clamp(2rem,4.6vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.03em] text-ink">
          {FREE_PERIOD_ACTIVE ? <>Tout est gratuit jusqu’au {FREE_UNTIL_LABEL}.</> : <>Des offres simples, en FCFA.</>}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
          {FREE_PERIOD_ACTIVE
            ? "Toutes les fonctions sont ouvertes. Les prix barrés s’appliquent ensuite."
            : "Pensées pour remplacer le cahier et Excel : claires, en FCFA, sans mauvaise surprise."}
        </p>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-reveal>
        {PLANS.map((plan) => {
          const strike = FREE_PERIOD_ACTIVE && plan.price !== "0" && plan.price !== "Sur devis";
          return (
            <li
              key={plan.id}
              className={`flex flex-col rounded-[1.5rem] border bg-surface p-6 ${plan.highlight ? "border-cta shadow-subtle" : "border-border"}`}
            >
              {plan.badge && (
                <span className="mb-3 w-fit rounded-full bg-cta px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cta-ink">{plan.badge}</span>
              )}
              <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
              <p className="mt-1 min-h-[2.4rem] text-xs leading-relaxed text-ink-soft">{plan.audience}</p>

              <div className="mt-5">
                <p className={`flex flex-wrap items-baseline gap-x-1.5 ${strike ? "text-ink-soft" : "text-ink"}`}>
                  {strike ? (
                    <>
                      <s className="text-3xl font-bold tracking-[-0.03em] decoration-2">{plan.price}</s>
                      <span className="text-xs">{plan.unit}</span>
                      <span className="sr-only">, prix à partir du {FREE_UNTIL_LABEL}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold tracking-[-0.03em]">{plan.price}</span>
                      {plan.unit && <span className="text-xs text-ink-soft">{plan.unit}</span>}
                    </>
                  )}
                </p>
                {plan.id === "free" && <p className="mt-2 text-[11px] font-medium text-ink-soft">Gratuit, sans limite de durée</p>}
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-[0.82rem] leading-snug text-ink">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-cta" aria-hidden="true"><CheckMark size={13} /></span>
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.missing?.map((item) => (
                  <li key={item} className="flex gap-2 text-ink-soft">
                    <span className="mt-0.5 w-[13px] shrink-0 text-center" aria-hidden="true">–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {plan.cta.href.startsWith("mailto:") ? (
                <a href={plan.cta.href} className={secondaryBtn}>{plan.cta.label} <ArrowUpRight size={14} /></a>
              ) : plan.highlight ? (
                <Link href={plan.cta.href} className="lp-btn mt-6 w-full justify-center">{plan.cta.label} <ArrowUpRight size={14} /></Link>
              ) : (
                <Link href={plan.cta.href} className={secondaryBtn}>{plan.cta.label} <ArrowUpRight size={14} /></Link>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="mx-auto mt-8 max-w-3xl space-y-1.5 text-center text-xs leading-relaxed text-ink-soft" data-reveal>
        {PRICING_FOOTNOTES.map((note) => <li key={note}>{note}</li>)}
        <li>Détails de facturation : <Link href="/cgu" className="underline underline-offset-4 hover:text-ink">conditions d’utilisation, article 6</Link>.</li>
      </ul>
    </section>
  );
}
