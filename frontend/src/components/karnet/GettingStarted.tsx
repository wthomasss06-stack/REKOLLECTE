"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle, Lock } from "@phosphor-icons/react";

import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { onKarnetChanged, type KarnetSummary } from "@/lib/karnet";
import { buildGuideSteps, type GuideStep } from "@/lib/karnetGuide";

/**
 * Guide « Premiers pas » de REKOLLECTE+ : ressource -> client -> première réservation -> encaissement.
 * L'ordre est celui des dépendances réelles : sans ressource on ne peut pas réserver, sans client non plus.
 * Les étapes se cochent TOUTES SEULES d'après les données (GET /karnet/summary/), pas d'un clic « fait ».
 */

interface GuideApi {
  summary: KarnetSummary | null;
  steps: GuideStep[];
  current: GuideStep | null;
  doneCount: number;
  visible: boolean;
  dismiss: () => void;
  refresh: () => Promise<void>;
}

const GuideContext = createContext<GuideApi | null>(null);

export function useGuide(): GuideApi {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error("useGuide doit être utilisé dans GuideProvider");
  return ctx;
}

const flag = (name: string, orgId: string) => `qr_gs_${name}:${orgId}`;
const read = (key: string) => { try { return window.localStorage.getItem(key) === "1"; } catch { return false; } };
const write = (key: string) => { try { window.localStorage.setItem(key, "1"); } catch { /* ignoré */ } };

export function GuideProvider({ children }: { children: ReactNode }) {
  const { organization, user } = useAuthContext();
  const pathname = usePathname();
  const orgId = organization?.id ?? "org";
  const canManage = user?.role === "BOSS" || user?.role === "GERANT";
  const [summary, setSummary] = useState<KarnetSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paymentsSeen, setPaymentsSeen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get<KarnetSummary>("/karnet/summary/");
      setSummary(res.data);
    } catch {
      /* le guide est un confort : en cas d'échec il reste simplement caché */
    }
  }, []);

  useEffect(() => {
    setDismissed(read(flag("off", orgId)));
    setCompleted(read(flag("done", orgId)));
    setPaymentsSeen(read(flag("pay", orgId)));
  }, [orgId]);

  // Ouvrir Paiements = avoir « contrôlé » l'encaissement (dernière étape).
  useEffect(() => {
    if (pathname.startsWith("/dashboard/karnet/paiements") && !read(flag("pay", orgId))) {
      write(flag("pay", orgId));
      setPaymentsSeen(true);
    }
  }, [pathname, orgId]);

  useEffect(() => {
    void refresh();
    return onKarnetChanged(() => void refresh());
  }, [refresh, pathname]);

  const steps = useMemo(() => buildGuideSteps(summary, { paymentsSeen, canManage }), [summary, paymentsSeen, canManage]);

  const doneCount = steps.filter((step) => step.done).length;
  const allDone = doneCount === steps.length;
  const current = steps.find((step) => !step.done) ?? null;

  useEffect(() => {
    if (summary && allDone && !completed) {
      write(flag("done", orgId));
      setCompleted(true);
    }
  }, [summary, allDone, completed, orgId]);

  const dismiss = useCallback(() => {
    write(flag("off", orgId));
    setDismissed(true);
  }, [orgId]);

  const visible = summary !== null && !dismissed && !completed && !allDone;
  const value = useMemo<GuideApi>(() => ({ summary, steps, current, doneCount, visible, dismiss, refresh }), [summary, steps, current, doneCount, visible, dismiss, refresh]);
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

const ctaClass = "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-cta px-5 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover";

/** Carte complète (page d'accueil REKOLLECTE+) ou bandeau compact (autres onglets). */
export default function GettingStarted({ variant }: { variant: "full" | "compact" }) {
  const { steps, current, doneCount, visible, dismiss } = useGuide();
  if (!visible || !current) return null;

  const progress = (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {steps.map((step) => <span key={step.key} className={`h-1.5 w-8 rounded-full ${step.done ? "bg-cta" : "bg-border"}`} />)}
    </div>
  );

  if (variant === "compact") {
    return (
      <section aria-label="Premiers pas" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 pl-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-3">{progress}<span className="text-xs font-medium text-ink-soft">Étape {doneCount + 1} sur {steps.length}</span></div>
          <p className="truncate text-sm font-semibold text-ink">{current.title}</p>
        </div>
        {current.cta && !current.locked ? (
          <Link href={current.href} className={ctaClass}>{current.cta} <ArrowRight size={16} weight="bold" /></Link>
        ) : (
          <p className="text-xs text-ink-soft">{current.lockedHint}</p>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Premiers pas" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Premiers pas avec REKOLLECTE+</h2>
          <p className="mt-1 text-sm text-ink-soft">{doneCount} étape{doneCount > 1 ? "s" : ""} sur {steps.length} — dans cet ordre, c’est le plus court chemin jusqu’à ton premier encaissement.</p>
        </div>
        {progress}
      </div>
      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const isCurrent = step.key === current.key;
          return (
            <li key={step.key} className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 ${isCurrent ? "border-cta bg-canvas" : "border-border"} ${step.done ? "opacity-70" : ""}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-sm font-bold text-ink-soft" aria-hidden="true">
                {step.done ? <CheckCircle size={26} weight="fill" className="text-success-text" /> : step.locked ? <Lock size={16} weight="bold" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{step.title}{step.done && <span className="sr-only"> (terminée)</span>}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{step.locked || (step.lockedHint && !step.cta && !step.done) ? step.lockedHint : step.hint}</p>
              </div>
              {isCurrent && step.cta && !step.locked && <Link href={step.href} className={ctaClass}>{step.cta} <ArrowRight size={16} weight="bold" /></Link>}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={dismiss} className="mt-4 min-h-[44px] text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">Masquer ce guide</button>
    </section>
  );
}
