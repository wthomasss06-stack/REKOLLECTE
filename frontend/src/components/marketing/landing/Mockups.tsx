"use client";

import {
  ArrowsClockwise, Bell, Buildings, CalendarCheck, CheckCircle, Crown, DotsThree, ForkKnife, Funnel,
  HardHat, Bed, QrCode, Signature, UserCircle, Users, WifiSlash,
} from "@phosphor-icons/react";

/**
 * Maquettes d'interface 100 % JSX (pas d'images) : nettes à toutes les densités,
 * thémables clair/sombre via les tokens, et sans poids réseau. Les données
 * affichées sont purement illustratives.
 */

const card = "rounded-2xl border border-border bg-surface shadow-[0_8px_30px_-12px_rgb(var(--c-ink)/0.18)]";

function Chip({ tone, children }: { tone: "ok" | "info" | "warn" | "off"; children: React.ReactNode }) {
  const tones = {
    ok: "bg-success-bg text-success-text",
    info: "bg-info-bg text-info-text",
    warn: "bg-[rgb(var(--c-warn-text)/0.14)] text-[rgb(var(--c-warn-text))]",
    off: "bg-ink/[0.07] text-ink-soft",
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold leading-none ${tones[tone]}`}>{children}</span>;
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold leading-none text-ink">
        {value}
        {delta && <span className="text-[10px] font-bold text-success-text">{delta}</span>}
      </p>
    </div>
  );
}

function Row({ name, meta, time, chip }: { name: string; meta: string; time: string; chip: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-info-bg text-info-text"><UserCircle size={20} weight="duotone" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{name}</p>
        <p className="truncate text-[11px] text-ink-soft">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {chip}
        <span className="text-[10px] text-ink-soft">{time}</span>
      </div>
    </div>
  );
}

/** Ligne 1 — le registre au quotidien. */
export function VisitorsPanel() {
  return (
    <div className="w-full space-y-3" data-skew>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Aujourd'hui" value="42" delta="+8%" />
        <Stat label="Sur place" value="7" />
        <Stat label="À synchro" value="3" />
      </div>
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ink"><Users size={16} weight="bold" className="text-cta" /> Registre du jour</p>
          <DotsThree size={20} weight="bold" className="text-ink-soft" />
        </div>
        <Row name="Aya Koné" meta="Rendez-vous · Ressources humaines" time="09:12" chip={<Chip tone="ok">Sur site</Chip>} />
        <Row name="Yves Traoré" meta="Livraison · Réception" time="09:40" chip={<Chip tone="off">Sorti</Chip>} />
        <div className="space-y-2 border-t border-border px-4 py-3 opacity-40 [mask-image:linear-gradient(#000,transparent)]">
          <div className="h-3 w-1/2 rounded-full bg-ink/15" />
          <div className="h-3 w-1/3 rounded-full bg-ink/10" />
        </div>
      </div>
    </div>
  );
}

const BARS = [46, 64, 38, 72, 52, 30, 58];
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

/** Ligne 2 — hors-ligne et synchronisation (graphique + infobulle). */
export function ChartPanel() {
  return (
    <div className={`${card} w-full p-4`} data-skew>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-ink"><ArrowsClockwise size={16} weight="bold" className="text-cta" /> Visites de la semaine</p>
        <Chip tone="ok"><CheckCircle size={12} weight="fill" /> Synchro auto</Chip>
      </div>
      <div className="relative mt-5 flex h-44 items-end gap-2.5 rounded-xl bg-ink/[0.04] px-3 pb-3 pt-6">
        {BARS.map((h, i) => (
          <div key={`bar-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div
              className={`w-full rounded-lg ${i === 3 ? "bg-gradient-to-t from-cta to-cta/50" : "bg-ink/10"}`}
              style={{ height: `${h}%` }}
            />
            <span className="text-[10px] font-bold text-ink-soft">{DAYS[i]}</span>
          </div>
        ))}
        <div className="absolute left-[44%] top-1 -translate-x-1/2 rounded-xl bg-[#12231a] px-3 py-2 text-white shadow-xl">
          <p className="text-[9px] text-white/60">Jeudi</p>
          <p className="text-lg font-bold leading-tight">38 visites</p>
          <p className="text-[9px] text-white/60">dont 3 hors-ligne</p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`relative inline-block h-5 w-9 shrink-0 rounded-full ${on ? "bg-cta" : "bg-ink/20"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-cta-ink shadow ${on ? "left-[18px]" : "left-0.5"}`} />
    </span>
  );
}

/** Ligne 3 — rôles et accès. */
export function RolesPanel() {
  const roles = [
    { icon: <Crown size={18} weight="duotone" />, name: "Patron", desc: "Registre, équipe, paramètres, export", on: true },
    { icon: <Buildings size={18} weight="duotone" />, name: "Gérant", desc: "Registre et équipe du site", on: true },
    { icon: <Signature size={18} weight="duotone" />, name: "Staff d'accueil", desc: "Enregistre les visites, rien de plus", on: false },
  ];
  return (
    <div className={`${card} w-full p-4`} data-skew>
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><Users size={16} weight="bold" className="text-cta" /> Rôles & accès</p>
      <div className="space-y-2.5">
        {roles.map((r) => (
          <div key={r.name} className="flex items-center gap-3 rounded-xl border border-border bg-canvas/60 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-bg text-success-text">{r.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{r.name}</p>
              <p className="truncate text-[11px] text-ink-soft">{r.desc}</p>
            </div>
            <Toggle on={r.on} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ligne 4 — REKOLLECTE+ : réservations, paiements, rappels. */
export function ReservationsPanel() {
  return (
    <div className={`${card} w-full overflow-hidden`} data-skew>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-ink"><CalendarCheck size={16} weight="bold" className="text-cta" /> Réservations</p>
        <Chip tone="info"><Funnel size={11} weight="bold" /> Aujourd&apos;hui</Chip>
      </div>
      <Row name="N° 0142 · Chambre 12" meta="Réglée d'avance" time="Jusqu'à 12:00" chip={<Chip tone="ok"><CheckCircle size={11} weight="fill" /> Payée</Chip>} />
      <Row name="N° 0143 · Table 4" meta="Fin du créneau dans 10 min" time="13:30" chip={<Chip tone="warn"><Bell size={11} weight="fill" /> Rappel</Chip>} />
      <Row name="N° 0144 · Salle B" meta="Un geste : valider ou annuler" time="15:00" chip={<Chip tone="info">À venir</Chip>} />
    </div>
  );
}

/* ——— Mini-visuels des 4 cartes « Pourquoi REKOLLECTE » ——— */

const QR_MATRIX = ["1110101", "1010011", "1110110", "0001010", "1101111", "0110001", "1011101"];

export function MiniScan() {
  return (
    <div className="relative mx-auto w-full max-w-[16rem]">
      <div className={`${card} grid place-items-center p-5`}>
        <svg viewBox="0 0 7 7" className="h-28 w-28 text-ink" aria-hidden="true" shapeRendering="crispEdges">
          {QR_MATRIX.flatMap((row, y) => row.split("").map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" rx=".12" /> : null)))}
        </svg>
      </div>
      <div className={`${card} absolute -bottom-4 -right-2 flex items-center gap-2 px-3 py-2`}>
        <CheckCircle size={18} weight="fill" className="text-success-text" />
        <div><p className="text-[11px] font-bold leading-none text-ink">Visiteur enregistré</p><p className="mt-1 text-[10px] leading-none text-ink-soft">Signé · 14:22</p></div>
      </div>
    </div>
  );
}

export function MiniOffline() {
  return (
    <div className="mx-auto w-full max-w-[16rem] space-y-3">
      <div className={`${card} flex items-center gap-3 p-3`}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgb(var(--c-warn-text)/0.14)] text-[rgb(var(--c-warn-text))]"><WifiSlash size={18} weight="bold" /></span>
        <div><p className="text-xs font-bold text-ink">Hors-ligne</p><p className="text-[10px] text-ink-soft">3 visites gardées sur l&apos;appareil</p></div>
      </div>
      <div className={`${card} ml-6 flex items-center gap-3 p-3`}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-success-bg text-success-text"><ArrowsClockwise size={18} weight="bold" /></span>
        <div><p className="text-xs font-bold text-ink">Réseau de retour</p><p className="text-[10px] text-ink-soft">3 envoyées au dashboard</p></div>
      </div>
    </div>
  );
}

export function MiniSectors() {
  const items = [
    { icon: <Buildings size={16} weight="duotone" />, label: "Bureau", on: true },
    { icon: <ForkKnife size={16} weight="duotone" />, label: "Restaurant" },
    { icon: <Bed size={16} weight="duotone" />, label: "Hôtel" },
    { icon: <HardHat size={16} weight="duotone" />, label: "Chantier" },
  ];
  return (
    <div className="mx-auto grid w-full max-w-[16rem] grid-cols-2 gap-2.5">
      {items.map((i) => (
        <div key={i.label} className={`${card} flex items-center gap-2 px-3 py-3 text-xs font-bold ${i.on ? "text-cta ring-2 ring-cta/40" : "text-ink"}`}>
          {i.icon} {i.label}
        </div>
      ))}
    </div>
  );
}

export function MiniDash() {
  return (
    <div className="mx-auto w-full max-w-[16rem] space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Aujourd'hui" value="42" />
        <Stat label="Ce mois" value="618" />
      </div>
      <div className={`${card} flex items-center justify-between px-4 py-3`}>
        <span className="flex items-center gap-2 text-xs font-bold text-ink"><QrCode size={16} weight="bold" className="text-cta" /> QR actif</span>
        <Chip tone="ok">Export CSV</Chip>
      </div>
    </div>
  );
}
