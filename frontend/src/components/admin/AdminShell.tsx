"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowsClockwise, Buildings, ChartLineUp, ChatCircleDots, Pulse, ShieldCheck, SignOut, SquaresFour, UsersThree } from "@phosphor-icons/react";
import AppNav, { type NavItem } from "@/components/dashboard/AppNav";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export type AdminTab = "overview" | "traffic" | "organizations" | "members" | "feedback" | "audit";

export const ADMIN_TABS: { key: AdminTab; label: string; short: string; title: string; hint: string; hash: string }[] = [
  { key: "overview", label: "Vue d’ensemble", short: "Accueil", title: "Vue d’ensemble", hint: "L’essentiel de la plateforme en un coup d’œil.", hash: "accueil" },
  { key: "traffic", label: "Trafic du site", short: "Trafic", title: "Trafic du site", hint: "La fréquentation de la vitrine, mesurée avec l’accord des visiteurs.", hash: "trafic" },
  { key: "organizations", label: "Entreprises", short: "Clients", title: "Entreprises", hint: "Les établissements qui utilisent REKOLLECTE.", hash: "entreprises" },
  { key: "members", label: "Personnel", short: "Équipe", title: "Personnel", hint: "Les comptes rattachés à chaque entreprise.", hash: "personnel" },
  { key: "feedback", label: "Feedbacks", short: "Retours", title: "Feedbacks", hint: "Ce que disent les utilisateurs et les visiteurs.", hash: "feedbacks" },
  { key: "audit", label: "Journal d’audit", short: "Journal", title: "Journal d’audit", hint: "Qui a fait quoi, entreprise par entreprise.", hash: "journal" },
];

const ICONS = { overview: SquaresFour, traffic: ChartLineUp, organizations: Buildings, members: UsersThree, feedback: ChatCircleDots, audit: ShieldCheck } as const;

/** Cadre de l’administration : en-tête, navigation (la même que l’espace connecté : AppNav) et zone de contenu. */
export default function AdminShell({ tab, onTab, newFeedback, liveNow, loading, onRefresh, onLogout, children }: {
  tab: AdminTab;
  onTab: (tab: AdminTab) => void;
  newFeedback: number;
  liveNow: number;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const items: NavItem[] = ADMIN_TABS.map((entry) => ({ key: entry.key, label: entry.label, short: entry.short, icon: ICONS[entry.key], badge: entry.key === "feedback" ? newFeedback : null }));
  const current = ADMIN_TABS.find((entry) => entry.key === tab) ?? ADMIN_TABS[0]!;
  const iconButton = "grid h-10 w-10 place-items-center rounded-full border border-border bg-canvas text-ink-soft transition-colors hover:border-cta hover:text-ink";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="REKOLLECTE — retour à l’accueil du site">
          <Logo size={30} className="shrink-0" />
          <span className="hidden truncate font-heading text-[15px] font-bold tracking-tight text-ink min-[400px]:inline">REKOLLECTE <span className="font-medium text-ink-soft">· Admin</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => onTab("traffic")} className="hidden items-center gap-2 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-cta hover:text-ink sm:flex" aria-label={`${liveNow} visite${liveNow > 1 ? "s" : ""} en cours sur le site — ouvrir le trafic`}>
            <span className="relative flex h-2 w-2" aria-hidden="true">{liveNow > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cta opacity-60" />}<span className={`relative inline-flex h-2 w-2 rounded-full ${liveNow > 0 ? "bg-cta" : "bg-ink-soft/40"}`} /></span>
            <Pulse size={14} weight="bold" aria-hidden="true" />{liveNow} en ligne
          </button>
          <button type="button" onClick={onRefresh} className={iconButton} aria-label="Actualiser les données" title="Actualiser"><ArrowsClockwise size={18} weight="bold" className={loading ? "animate-spin" : ""} /></button>
          <span className="md:hidden"><ThemeToggle /></span>
          <button type="button" onClick={onLogout} className={`${iconButton} md:hidden`} aria-label="Se déconnecter" title="Se déconnecter"><SignOut size={18} weight="bold" /></button>
        </div>
      </header>
      <AppNav items={items} activeKey={tab} onSelect={(key) => onTab(key as AdminTab)} brand={<div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cta text-xs font-bold text-cta-ink">AK</div>} eyebrow="Plateforme" title="AKATech Studio" onLogout={onLogout} />
      <main className="px-4 pb-28 pt-20 sm:px-6 md:ml-[72px] md:p-10 md:pb-10 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Administration</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-ink sm:text-3xl">{current.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">{current.hint}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
