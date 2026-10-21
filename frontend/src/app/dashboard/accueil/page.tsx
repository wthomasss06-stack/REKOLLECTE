"use client";
import TabletSetupGuide from "@/components/dashboard/TabletSetupGuide";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardText, QrCode } from "@phosphor-icons/react";
import Loader from "@/components/Loader";
import AutoRetry from "@/components/ui/AutoRetry";
import QRCodeManager from "@/components/QRCodeManager";
import { apiClient } from "@/lib/api";
import { useAuthContext } from "@/context/AuthContext";
import type { Organization } from "@/types";

type ViewState = "loading" | "ready" | "error";
type Mode = "choose" | "qr";

export default function AccueilPage() {
  const { user } = useAuthContext();
  const [org, setOrg] = useState<Organization | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [mode, setMode] = useState<Mode>("choose");

  const load = useCallback(() => {
    setState("loading");
    apiClient.get<Organization>("/org/me/")
      .then(({ data }) => { setOrg(data); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user?.role, load]);

  if (state === "loading") return <Loader fullScreen={false} label="Ouverture du mode accueil…" />;
  if (state === "error" || !org) return <AutoRetry onRetry={load} label="Ouverture du mode accueil…" />;

  const visitorUrl = `/v/${org.qr_secure_token}`;
  if (mode === "qr") return <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6"><button onClick={() => setMode("choose")} className="self-start inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeft size={17} /> Retour au Mode Accueil</button><div className="w-full rounded-2xl border border-border bg-surface p-4 text-center shadow-subtle sm:p-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Mode QR</p><h1 className="mt-2 text-3xl font-bold text-ink">QR visiteurs</h1><p className="mt-2 text-sm text-ink-soft">Présente ce QR aux visiteurs pour ouvrir le formulaire sur leur téléphone.</p><div className="mt-7 flex justify-center"><QRCodeManager qrToken={org.qr_secure_token} orgName={org.name} logoUrl={org.logo_url} canRegenerate={false} size={320} /></div></div></div>;

  const headingLabel = user?.role === "STAFF" ? "Accueil" : "Accueil · vue de l’équipe";
  return <div className="mx-auto w-full max-w-4xl space-y-8"><header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">{headingLabel}</p><h1 className="mt-2 text-3xl font-bold text-ink">Accueil</h1><p className="mt-2 max-w-2xl text-sm text-ink-soft">Choisis le mode à utiliser pour accueillir les visiteurs.</p></header><section className="grid gap-5 md:grid-cols-2"><button onClick={() => setMode("qr")} className="group flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-subtle transition hover:-translate-y-1 hover:border-cta hover:shadow-lg"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-cta/10 text-cta"><QrCode size={38} weight="bold" /></span><span className="mt-5 text-xl font-bold text-ink">Mode QR</span><span className="mt-2 text-sm text-ink-soft">Afficher le QR pour les visiteurs avec téléphone</span></button><Link href={visitorUrl} className="group flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-subtle transition hover:-translate-y-1 hover:border-cta hover:shadow-lg"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-cta/10 text-cta"><ClipboardText size={38} weight="bold" /></span><span className="mt-5 text-xl font-bold text-ink">Mode formulaire</span><span className="mt-2 text-sm text-ink-soft">Ouvrir directement le formulaire sur la tablette</span></Link></section><TabletSetupGuide /></div>;
}
