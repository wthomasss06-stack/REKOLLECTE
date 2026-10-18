"use client";
import { ArrowRight, Buildings, ChartLineUp, ChatCircleDots, Pulse, UsersThree } from "@phosphor-icons/react";
import { Panel, StatCard } from "@/components/admin/ui";
import type { PlatformOverview } from "@/types";

export default function OverviewPanel({ data, onOpenTraffic, onOpenFeedback }: { data: PlatformOverview | null; onOpenTraffic: () => void; onOpenFeedback: () => void }) {
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-ink/5" aria-hidden="true" />;
  const inactive = data.users - data.active_users;
  const live = data.site_live_now ?? 0;
  const sessions = data.site_sessions_7_days ?? 0;
  const link = "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold text-ink transition-colors hover:border-cta";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Buildings} label="Entreprises" value={data.organizations} />
        <StatCard icon={UsersThree} label="Comptes" value={data.users} hint={inactive > 0 ? `${data.active_users} actifs · ${inactive} désactivé${inactive > 1 ? "s" : ""}` : "Tous actifs"} />
        <StatCard icon={ChartLineUp} label="Visites enregistrées" value={data.checkins_total} hint={`${data.checkins_30_days} sur les 30 derniers jours`} />
        <StatCard icon={ChatCircleDots} label="Feedbacks nouveaux" value={data.feedback_new} hint={`${data.feedback_total} au total`} tone={data.feedback_new > 0 ? "warn" : "default"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Vitrine du site" subtitle="Visiteurs ayant accepté la mesure d’audience" action={<button type="button" onClick={onOpenTraffic} className={link}>Voir le trafic<ArrowRight size={14} weight="bold" aria-hidden="true" /></button>}>
          <div className="flex items-end gap-6">
            <div><p className="font-heading text-3xl font-bold leading-none text-ink">{sessions}</p><p className="mt-1.5 text-sm text-ink-soft">visite{sessions > 1 ? "s" : ""} sur 7 jours</p></div>
            <div className="flex items-center gap-2 rounded-full bg-cta/10 px-3 py-1.5 text-sm font-semibold text-cta"><Pulse size={16} weight="bold" aria-hidden="true" />{live} en ligne</div>
          </div>
        </Panel>
        <Panel title="À traiter" subtitle="Ce qui attend une action de ta part" action={<button type="button" onClick={onOpenFeedback} className={link}>Ouvrir les feedbacks<ArrowRight size={14} weight="bold" aria-hidden="true" /></button>}>
          <p className="text-sm text-ink">{data.feedback_new > 0 ? <><strong className="font-heading text-2xl">{data.feedback_new}</strong> feedback{data.feedback_new > 1 ? "s" : ""} en attente de lecture.</> : "Rien en attente : tous les feedbacks sont traités."}</p>
        </Panel>
      </div>
    </div>
  );
}
