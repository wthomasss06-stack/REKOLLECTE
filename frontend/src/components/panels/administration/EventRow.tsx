import { CATEGORY_ICON, actorOf, eventDetail, targetOf, timeLabel } from "./auditMeta";
import type { AuditEvent } from "@/types";

/** Une ligne du journal : pictogramme de catégorie, libellé (décidé côté serveur), auteur, cible, précision et heure. */
export default function EventRow({ event, showDate = false }: { event: AuditEvent; showDate?: boolean }) {
  const Icon = CATEGORY_ICON[event.category];
  const target = targetOf(event);
  const detail = eventDetail(event);
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${event.sensitive ? "bg-cta/10 text-cta" : "bg-canvas text-ink-soft"}`} aria-hidden="true"><Icon size={17} weight="bold" /></span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
          {event.label}
          {event.sensitive && <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[11px] font-semibold text-cta">Sensible</span>}
        </p>
        <p className="text-ink-soft">
          Par <span className="font-medium text-ink">{actorOf(event)}</span>
          {target && <> · cible : <span className="font-medium text-ink">{target}</span></>}
          {detail && <> · {detail}</>}
        </p>
      </div>
      <time className="shrink-0 pt-0.5 text-xs text-ink-soft" dateTime={event.created_at}>
        {showDate ? `${new Date(event.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ` : ""}{timeLabel(event.created_at)}
      </time>
    </li>
  );
}
