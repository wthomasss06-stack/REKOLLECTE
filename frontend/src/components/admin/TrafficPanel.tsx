"use client";
import { useEffect, useState } from "react";
import { Cookie, CursorClick, Desktop, DeviceMobile, DeviceTablet, Eye, Info, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { EmptyState, Panel, Segmented, StatCard, ago } from "@/components/admin/ui";
import type { PlatformTraffic, TrafficRank, TrafficSession } from "@/types";

const PERIODS = [{ value: 7, label: "7 jours" }, { value: 30, label: "30 jours" }, { value: 90, label: "90 jours" }];
const ACTION_LABELS: Record<string, string> = { cta_click: "Clic « Se connecter »", login_start: "Connexion démarrée", contact_click: "Contact direct (tél., e-mail, WhatsApp)" };
const DEVICE_LABELS: Record<string, string> = { desktop: "Ordinateur", mobile: "Téléphone", tablet: "Tablette" };
const DEVICE_ICONS = { desktop: Desktop, mobile: DeviceMobile, tablet: DeviceTablet } as const;
const DEVICE_COLORS = ["bg-cta", "bg-mk-sage", "bg-mk-lime"];

const shortDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Visites par jour : une barre par jour, la hauteur suit le nombre de visites. Le détail est dans l’infobulle et le résumé lu aux lecteurs d’écran. */
function DailyChart({ daily }: { daily: PlatformTraffic["daily"] }) {
  const max = Math.max(1, ...daily.map((day) => day.sessions));
  const total = daily.reduce((sum, day) => sum + day.sessions, 0);
  const middle = daily[Math.floor(daily.length / 2)];
  return (
    <div>
      <div role="img" aria-label={`Visites par jour sur ${daily.length} jours : ${total} au total, maximum ${max} en une journée`} className="flex h-40 items-end gap-[3px]">
        {daily.map((day) => (
          <div key={day.date} title={`${shortDay(day.date)} : ${day.sessions} visite${day.sessions > 1 ? "s" : ""}, ${day.page_views} page${day.page_views > 1 ? "s" : ""} vue${day.page_views > 1 ? "s" : ""}`} className="flex h-full min-w-0 flex-1 items-end">
            <div className={`w-full rounded-t ${day.sessions ? "bg-cta" : "bg-ink/10"}`} style={{ height: day.sessions ? `${Math.max(4, (day.sessions / max) * 100)}%` : "2px" }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-soft" aria-hidden="true">
        <span>{shortDay(daily[0]!.date)}</span>{middle && daily.length > 6 && <span>{shortDay(middle.date)}</span>}<span>{shortDay(daily[daily.length - 1]!.date)}</span>
      </div>
    </div>
  );
}

function RankList({ rows, empty, format }: { rows: TrafficRank[]; empty: string; format?: (label: string) => string }) {
  if (!rows.length) return <p className="py-4 text-sm text-ink-soft">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.count));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-ink" title={row.label}>{format ? format(row.label) : row.label}</span><span className="shrink-0 tabular-nums text-ink-soft">{row.count} <span className="text-xs">· {Math.round((row.count / total) * 100)} %</span></span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-cta" style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Devices({ rows }: { rows: TrafficRank[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (!total) return <p className="py-4 text-sm text-ink-soft">Pas encore de visite.</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-ink/10" role="img" aria-label={rows.map((row) => `${DEVICE_LABELS[row.label] ?? row.label} ${Math.round((row.count / total) * 100)} %`).join(", ")}>
        {rows.map((row, index) => <div key={row.label} className={DEVICE_COLORS[index % DEVICE_COLORS.length]} style={{ width: `${(row.count / total) * 100}%` }} />)}
      </div>
      <ul className="mt-4 grid gap-2.5">
        {rows.map((row, index) => {
          const Icon = DEVICE_ICONS[row.label as keyof typeof DEVICE_ICONS] ?? Desktop;
          return <li key={row.label} className="flex items-center gap-3 text-sm"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DEVICE_COLORS[index % DEVICE_COLORS.length]}`} aria-hidden="true" /><Icon size={18} weight="bold" className="shrink-0 text-ink-soft" aria-hidden="true" /><span className="flex-1 font-medium text-ink">{DEVICE_LABELS[row.label] ?? row.label}</span><span className="tabular-nums text-ink-soft">{row.count} · {Math.round((row.count / total) * 100)} %</span></li>;
        })}
      </ul>
    </div>
  );
}

function SessionRow({ session, now }: { session: TrafficSession; now: number }) {
  const Icon = DEVICE_ICONS[session.device] ?? Desktop;
  const live = now - new Date(session.last_activity_at).getTime() < 5 * 60_000;
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cta/10 text-cta"><Icon size={18} weight="bold" aria-hidden="true" />{live && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cta ring-2 ring-surface" title="En ligne maintenant" />}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{session.browser || "Navigateur inconnu"}{session.os ? ` · ${session.os}` : ""}<span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">{session.returning ? `Revenu · visite n°${session.visit_number}` : "Nouveau"}</span></p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">Arrivé sur <span className="font-medium text-ink">{session.landing_path || "/"}</span> · via {session.source === "direct" ? "accès direct" : session.source} · {session.page_count} page{session.page_count > 1 ? "s" : ""}</p>
      </div>
      <time dateTime={session.last_activity_at} className="shrink-0 text-xs text-ink-soft">{live ? "en ligne" : ago(session.last_activity_at, now)}</time>
    </li>
  );
}

export default function TrafficPanel({ data, days, onDays, loading, error, onRetry, updatedAt }: {
  data: PlatformTraffic | null;
  days: number;
  onDays: (days: number) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  updatedAt: number | null;
}) {
  // Les « il y a … » avancent d’eux-mêmes sans nouvel appel au serveur.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 20_000); return () => window.clearInterval(timer); }, []);
  const refreshed = updatedAt ? ago(updatedAt, now) : null;

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Segmented label="Période" value={days} options={PERIODS} onChange={onDays} />
      <p className="text-xs text-ink-soft" aria-live="polite">{loading && !data ? "Chargement…" : refreshed ? `Mis à jour ${refreshed}` : ""}</p>
    </div>
  );

  if (error && !data) {
    return <div className="space-y-4">{controls}<div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-sm text-ink"><WarningCircle size={22} weight="bold" className="text-error-text" aria-hidden="true" /><span className="flex-1">{error}</span><button type="button" onClick={onRetry} className="rounded-full border border-border px-4 py-2 font-semibold hover:border-cta">Réessayer</button></div></div>;
  }
  if (!data) return <div className="space-y-4">{controls}<div className="h-40 animate-pulse rounded-2xl bg-ink/5" aria-hidden="true" /></div>;

  const { totals, consent } = data;
  const empty = totals.sessions === 0;
  return (
    <div className="space-y-5">
      {controls}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={UsersThree} label="Visiteurs" value={totals.visitors} hint={`${totals.new_visitors} nouveau${totals.new_visitors > 1 ? "x" : ""} · ${totals.returning_visitors} de retour`} tone="accent" />
        <StatCard icon={Eye} label="Pages vues" value={totals.page_views} hint={`${totals.sessions} visite${totals.sessions > 1 ? "s" : ""} · ${totals.pages_per_session} page${totals.pages_per_session >= 2 ? "s" : ""} par visite`} />
        <StatCard icon={CursorClick} label="Clics d’action" value={totals.actions} hint="Connexion, téléphone, e-mail, WhatsApp" />
        <StatCard icon={Cookie} label="Cookies acceptés" value={consent.rate === null ? "—" : `${consent.rate} %`} hint={consent.rate === null ? "Aucun choix sur la période" : `${consent.accepted} accepté${consent.accepted > 1 ? "s" : ""} · ${consent.rejected} refusé${consent.rejected > 1 ? "s" : ""}`} />
      </div>

      {empty ? (
        <EmptyState icon={Eye} title="Aucune visite mesurée sur cette période">
          Dès qu’un visiteur accepte le bandeau cookies sur la vitrine, sa visite apparaît ici. Les visiteurs qui refusent ne sont jamais mesurés : seul le compteur « refusés » avance.
        </EmptyState>
      ) : (
        <>
          <Panel title="Visites par jour" subtitle={`${totals.sessions} visite${totals.sessions > 1 ? "s" : ""} sur ${days} jours`}>
            <DailyChart daily={data.daily} />
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Pages les plus vues"><RankList rows={data.top_pages} empty="Aucune page vue." /></Panel>
            <Panel title="D’où viennent les visites" subtitle="Site référent ou paramètre utm_source"><RankList rows={data.sources} empty="Aucune source." format={(label) => (label === "direct" ? "Accès direct" : label)} /></Panel>
            <Panel title="Appareils"><Devices rows={data.devices} /></Panel>
            <Panel title="Actions des visiteurs"><RankList rows={data.actions} empty="Aucun clic d’action sur la période." format={(label) => ACTION_LABELS[label] ?? label} /></Panel>
            <Panel title="Navigateurs"><RankList rows={data.browsers} empty="—" /></Panel>
            <Panel title="Systèmes"><RankList rows={data.systems} empty="—" /></Panel>
          </div>
          <Panel title="Dernières visites" subtitle="Les plus récentes d’abord — aucune identité, aucune adresse IP">
            <ul className="divide-y divide-border">{data.recent.map((session) => <SessionRow key={session.id} session={session} now={now} />)}</ul>
          </Panel>
        </>
      )}

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface/60 p-4 text-xs leading-relaxed text-ink-soft"><Info size={16} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />Mesure faite uniquement sur la vitrine publique, avec l’accord du visiteur (bandeau cookies). Jamais l’application connectée, l’administration ni les formulaires des visiteurs ; pas d’adresse IP, conservation 13 mois. Les chiffres sous-estiment donc la fréquentation réelle : les visiteurs qui refusent ne sont pas comptés.</p>
    </div>
  );
}
