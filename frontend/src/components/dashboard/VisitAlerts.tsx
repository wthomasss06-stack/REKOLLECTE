"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, BellRinging, SpeakerHigh, SpeakerSlash, WarningCircle, X } from "@phosphor-icons/react";

import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import {
  audioSupported, currentVisitSoundState, playChime, readVisitSoundPreference, unlockAudio, writeVisitSoundPreference, type SoundState,
} from "@/lib/audioAlarm";
import type { VisitAlert, VisitAlertsPayload } from "@/types";

type Gsap = typeof import("gsap").gsap;

/** Intervalle de sondage. Un onglet en arrière-plan est ralenti par le navigateur lui-même : on sonde quand même, car une
 * alerte sert justement quand on regarde autre chose. */
const POLL_MS = 8000;
const TOAST_MS = 9000;
const MAX_TOASTS = 3;
const MAX_LIST = 30;

// Géométrie de la cloche « gooey » (px). La goutte part du bouton et s’étire vers le bas ; le filtre SVG fait le pont entre les deux.
const BELL = 36;
const GAP = 12;
/** La goutte dépasse un peu la cloche à droite : le centre du bouton tombe sur le bord plat du haut (pas dans le coin arrondi), là où le filtre fait le pont. */
const OVERHANG = 24;
const PANEL_MAX_WIDTH = 380;
const RADIUS = 24;
const GOO_ID = "rk-gooey-filter";

type Entry = VisitAlert & { read: boolean };

const clock = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};
const details = (alert: VisitAlert) => [alert.reason, alert.access_point].filter(Boolean).join(" · ");
const headline = (alert: VisitAlert) => (alert.for_you === "host" ? `${alert.visitor_name} vous demande` : `Nouvelle visite : ${alert.visitor_name}`);
const plural = (count: number, one: string, many: string) => (count > 1 ? many : one);

function Toast({ alert, onClose }: { alert: VisitAlert; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(alert.id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [alert.id, onClose]);
  return (
    <div className="rk-toast flex items-start gap-3 rounded-xl border border-border border-l-4 border-l-cta bg-surface p-3 shadow-2xl">
      <BellRinging size={22} weight="fill" className="mt-0.5 shrink-0 text-cta" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{headline(alert)}</p>
        {details(alert) && <p className="truncate text-xs text-ink-soft">{details(alert)}</p>}
        <p className="mt-0.5 text-[11px] text-ink-soft">{alert.for_you === "host" ? "Pour vous" : "Aucune personne désignée — l’équipe est prévenue"}</p>
      </div>
      <button type="button" onClick={() => onClose(alert.id)} aria-label="Fermer la notification" className="shrink-0 rounded-full p-1 text-ink-soft hover:bg-canvas hover:text-ink"><X size={14} weight="bold" /></button>
    </div>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="rounded-full bg-cta-ink/15 px-3 py-1.5 text-[11px] font-semibold leading-none text-cta-ink transition-colors hover:bg-cta-ink/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta-ink">{children}</button>;
}

/** Cloche d’alerte de l’en-tête : prévient quand un visiteur arrive (pastille, notification, carillon) sans service externe.
 * Le patron et les gérants reçoivent les visites sans personne désignée ; un membre « visitable » reçoit celles où on le demande.
 * Le panneau est une goutte « gooey » : elle se détache du bouton et s’étire en liste (filtre SVG + GSAP). */
export default function VisitAlerts() {
  const { user } = useAuthContext();
  const eligible = Boolean(user && (user.role !== "STAFF" || user.is_visit_host));
  const userId = user?.id;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [toasts, setToasts] = useState<VisitAlert[]>([]);
  const [missed, setMissed] = useState(0);
  const [missedUnread, setMissedUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState<SoundState>("off");
  const [mounted, setMounted] = useState(false);
  const [gsapReady, setGsapReady] = useState(false);

  const openRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const gsapRef = useRef<Gsap | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gooeyRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const syncSound = useCallback(() => setSound(currentVisitSoundState()), []);
  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((item) => item.id !== id)), []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { openRef.current = open; }, [open]);
  // `inert` retire le panneau fermé de l’ordre de tabulation (attribut posé à la main : React 18 ne le type pas).
  useEffect(() => { contentRef.current?.toggleAttribute("inert", !open); }, [open, eligible]);

  // GSAP ne se charge que pour les comptes concernés, hors du chemin critique (le panneau s’ouvre sans animation si le chargement échoue).
  useEffect(() => {
    if (!eligible || gsapRef.current) return undefined;
    let cancelled = false;
    const load = () => { void import("gsap").then((module) => { if (cancelled) return; gsapRef.current = module.gsap; setGsapReady(true); }).catch(() => { /* panneau sans animation */ }); };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const handle = idle ? idle(load) : window.setTimeout(load, 400);
    return () => { cancelled = true; if (!idle) window.clearTimeout(handle); };
  }, [eligible]);

  // --- Sondage ---------------------------------------------------------------------------------------------------------
  const poll = useCallback(async () => {
    if (busyRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    busyRef.current = true;
    try {
      const { data } = await apiClient.get<VisitAlertsPayload>("/checkins/alerts/", cursorRef.current ? { params: { since: cursorRef.current } } : undefined);
      const firstCall = cursorRef.current === null;
      cursorRef.current = data.cursor;
      if (firstCall) return; // le premier appel ne sert qu’à obtenir l’horloge du serveur : on ne rejoue pas l’historique
      const fresh = data.items.filter((item) => !seenRef.current.has(item.id));
      fresh.forEach((item) => seenRef.current.add(item.id));
      const skipped = Math.max(0, data.total - data.items.length); // plus de 20 arrivées d’un coup : les plus anciennes ne sont pas détaillées
      if (skipped > 0) { setMissed((value) => value + skipped); setMissedUnread((value) => value + skipped); }
      if (fresh.length === 0) return;
      setEntries((current) => [...fresh.map((item) => ({ ...item, read: false })).reverse(), ...current].slice(0, MAX_LIST));
      const live = fresh.filter((item) => !item.late); // une fiche synchronisée tardivement n’est pas une arrivée « en direct » : pastille seulement
      if (live.length > 0) {
        if (!openRef.current) setToasts((current) => [...current, ...live].slice(-MAX_TOASTS)); // le panneau ouvert montre déjà l’arrivée
        if (currentVisitSoundState() === "ready") {
          if (!(await playChime())) syncSound(); // le navigateur a repris la main sur le son : on le dit dans le panneau
        } else if (readVisitSoundPreference()) syncSound();
        if (typeof navigator !== "undefined") navigator.vibrate?.(200);
      }
    } catch {
      /* silencieux : une coupure réseau ou un serveur qui dort ne doit jamais s’afficher comme une erreur ; on réessaie au prochain tour */
    } finally {
      busyRef.current = false;
    }
  }, [syncSound]);

  useEffect(() => {
    if (!eligible) return undefined;
    cursorRef.current = null;
    seenRef.current = new Set();
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    const onOnline = () => void poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [eligible, userId, poll]);

  // --- Son : état réel au montage, puis déblocage au premier geste (un tap suffit après un rechargement) ---------------------
  useEffect(() => {
    syncSound();
    if (!eligible || !audioSupported() || !readVisitSoundPreference()) return undefined;
    const unlock = () => {
      void unlockAudio(syncSound).then(syncSound);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, [eligible, syncSound]);

  const enableSound = async () => {
    writeVisitSoundPreference(true);
    const ok = await unlockAudio(syncSound);
    syncSound();
    if (ok) await playChime(); // un carillon de confirmation : on sait tout de suite si l’appareil sonne
  };
  const disableSound = () => { writeVisitSoundPreference(false); syncSound(); };

  // --- Ouverture / fermeture : « lu » = vu dans le panneau (tout ce qui s’y trouvait est marqué lu à la fermeture) -------------
  const markAllRead = useCallback(() => {
    setEntries((current) => (current.some((item) => !item.read) ? current.map((item) => (item.read ? item : { ...item, read: true })) : current));
    setMissedUnread(0);
  }, []);
  const toggle = () => setOpen((value) => !value);
  const close = useCallback(() => setOpen(false), []);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) { setToasts([]); syncSound(); }
    else if (wasOpen.current) markAllRead();
    wasOpen.current = open;
  }, [open, markAllRead, syncSound]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) close(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { close(); buttonRef.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); window.removeEventListener("resize", close); };
  }, [open, close]);

  // --- Animation gooey ------------------------------------------------------------------------------------------------------
  useEffect(() => {
    const blob = blobRef.current, content = contentRef.current, gooey = gooeyRef.current, inner = innerRef.current, button = buttonRef.current;
    if (!blob || !content || !gooey || !inner || !button) return undefined;
    const g = gsapRef.current;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hide = () => {
      gooey.style.visibility = "hidden";
      gooey.classList.remove("rk-goo-on");
      content.style.visibility = "hidden";
    };

    if (open) {
      const rect = button.getBoundingClientRect();
      const width = Math.min(PANEL_MAX_WIDTH, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right + OVERHANG - width, window.innerWidth - 12 - width));
      const x = left - rect.left;
      const y = rect.height + GAP;
      inner.style.width = `${width}px`;
      const fit = () => Math.min(inner.offsetHeight, window.innerHeight - rect.bottom - GAP - 12);
      const height = fit();

      gooey.style.visibility = "visible";
      content.style.visibility = "visible";
      if (!g) {
        // Repli sans animation (GSAP indisponible).
        [blob, content].forEach((node) => { node.style.cssText += `;width:${width}px;height:${height}px;transform:translate(${x}px,${y}px)`; });
        content.style.opacity = "1";
        return () => { hide(); };
      }

      gooey.classList.add("rk-goo-on");
      const items = Array.from(inner.querySelectorAll(".rk-vl-item"));
      g.killTweensOf([blob, content, ...items]);
      g.set([blob, content], { width: BELL, height: BELL, x: 0, y: 0, scale: 0.8 });
      g.set(content, { opacity: 0 });
      g.set(items, { opacity: 0, y: reduce ? 0 : 20, filter: reduce ? "none" : "blur(8px)" });
      const timeline = g.timeline({
        onComplete: () => {
          // Une fois ouverte, la goutte suit la hauteur de la liste (arrivées, effacements) sans refaire toute l’animation.
          resizeRef.current?.disconnect();
          resizeRef.current = new ResizeObserver(() => g.to([blob, content], { height: fit(), duration: reduce ? 0 : 0.35, ease: "power2.out", overwrite: "auto" }));
          resizeRef.current.observe(inner);
        },
      });
      timeline
        .to([blob, content], { x, y, width, height, scale: 1, duration: reduce ? 0.01 : 0.7, ease: reduce ? "none" : "elastic.out(1, 0.6)" }, 0)
        .to(content, { opacity: 1, duration: 0.1 }, 0)
        .to(items, { opacity: 1, y: 0, filter: "blur(0px)", duration: reduce ? 0.01 : 0.4, stagger: reduce ? 0 : 0.05, ease: "power2.out", clearProps: "filter,transform" }, reduce ? 0 : 0.15);
      return () => { timeline.kill(); };
    }

    resizeRef.current?.disconnect();
    resizeRef.current = null;
    if (!g) { hide(); return undefined; }
    if (gooey.style.visibility !== "visible") return undefined; // jamais ouverte : rien à refermer
    g.killTweensOf([blob, content]);
    g.to(content, { opacity: 0, duration: 0.15, ease: "power1.in" });
    g.to([blob, content], { x: 0, y: 0, width: BELL, height: BELL, scale: 0.8, duration: reduce ? 0.01 : 0.45, ease: "power3.inOut", onComplete: hide });
    return undefined;
  }, [open, gsapReady]);

  useEffect(() => () => { resizeRef.current?.disconnect(); }, []);

  // --- Effacer ----------------------------------------------------------------------------------------------------------------
  const removeOne = (id: string) => setEntries((current) => current.filter((item) => item.id !== id));
  const clearRead = () => setEntries((current) => current.filter((item) => !item.read));
  const clearUnread = () => { setEntries((current) => current.filter((item) => item.read)); setMissed((value) => Math.max(0, value - missedUnread)); setMissedUnread(0); };
  const clearAll = () => { setEntries([]); setMissed(0); setMissedUnread(0); };

  const unreadEntries = entries.filter((item) => !item.read).length;
  const unread = unreadEntries + missedUnread;
  const readCount = entries.length - unreadEntries;

  // Pastille dans le titre de l’onglet : on la voit même quand on est sur un autre onglet.
  useEffect(() => {
    const strip = (title: string) => title.replace(/^\(\d+\)\s/, "");
    if (unread > 0) document.title = `(${unread > 99 ? "99+" : unread}) ${strip(document.title)}`;
    return () => { document.title = strip(document.title); };
  }, [unread]);

  if (!eligible) return null;

  return (
    <>
      <div ref={wrapperRef} className="relative" style={{ width: BELL, height: BELL }}>
        {/* Filtre « gooey » : il fond la goutte et le bouton ensemble. Défini une seule fois, jamais affiché. */}
        <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute h-0 w-0">
          <defs>
            <filter id={GOO_ID} colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        {/* Couche filtrée : une pastille ancrée sous le bouton + la goutte qui s’étire. Hors écran tant que le panneau est fermé. */}
        <div ref={gooeyRef} aria-hidden="true" className="rk-goo pointer-events-none absolute z-0" style={{ visibility: "hidden", left: -(PANEL_MAX_WIDTH + 30), top: -20, width: PANEL_MAX_WIDTH + BELL + 90, height: 640, ["--rk-goo" as string]: `url(#${GOO_ID})` }}>
          <div className="absolute rounded-full bg-cta" style={{ left: PANEL_MAX_WIDTH + 30, top: 20, width: BELL, height: BELL }} />
          <div ref={blobRef} className="absolute bg-cta" style={{ left: PANEL_MAX_WIDTH + 30, top: 20, width: BELL, height: BELL, borderRadius: RADIUS }} />
        </div>

        {/* Contenu net (hors filtre) : même géométrie que la goutte, au-dessus d’elle. */}
        <div
          ref={contentRef}
          id="rk-visit-panel"
          role="dialog"
          aria-label="Arrivées de visiteurs"
          aria-hidden={!open}
          className="absolute left-0 top-0 z-10 overflow-hidden text-cta-ink"
          style={{ visibility: "hidden", width: BELL, height: BELL, borderRadius: RADIUS, opacity: 0 }}
        >
          <div ref={innerRef} className="flex flex-col gap-3 p-4">
            <div className="rk-vl-item flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold leading-tight">Arrivées</h2>
              <span className="text-xs text-cta-ink/70" aria-live="polite">{unread > 0 ? `${unread} ${plural(unread, "nouvelle", "nouvelles")}` : "Tout est lu"}</span>
            </div>

            {(unread > 0 || readCount > 0 || entries.length > 0 || missed > 0) && (
              <div className="rk-vl-item flex flex-wrap gap-1.5" role="group" aria-label="Gérer les notifications">
                {unread > 0 && <Chip onClick={markAllRead}>Tout marquer comme lu</Chip>}
                {readCount > 0 && <Chip onClick={clearRead}>Effacer les lues</Chip>}
                {unread > 0 && <Chip onClick={clearUnread}>Effacer les non lues</Chip>}
                {(entries.length > 0 || missed > 0) && <Chip onClick={clearAll}>Tout effacer</Chip>}
              </div>
            )}

            {entries.length === 0 && missed === 0 ? (
              <p className="rk-vl-item py-3 text-center text-sm text-cta-ink/75">Aucune arrivée pour l’instant. Les nouvelles visites s’afficheront ici dès qu’elles sont enregistrées.</p>
            ) : (
              <ul className="flex max-h-[min(280px,38vh)] flex-col gap-3 overflow-y-auto pr-1">
                {missed > 0 && <li className="rk-vl-item text-xs text-cta-ink/75">+ {missed} {plural(missed, "autre arrivée plus ancienne", "autres arrivées plus anciennes")} — voir la liste des visiteurs.</li>}
                {entries.map((item) => (
                  <li key={item.id} className="rk-vl-item group flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-cta-ink"}`} aria-hidden="true" />
                    <div className={`min-w-0 flex-1 ${item.read ? "opacity-65" : ""}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{headline(item)}</span>
                        <span className="shrink-0 text-[10px] tabular-nums text-cta-ink/70">{clock(item.arrived_at)}</span>
                      </div>
                      {details(item) && <p className="truncate text-xs text-cta-ink/75">{details(item)}</p>}
                      {item.for_you === "host" && <span className="mt-1 inline-block rounded-full bg-cta-ink/15 px-2 py-0.5 text-[10px] font-semibold">Pour vous</span>}
                      <span className="sr-only">{item.read ? " (lue)" : " (non lue)"}</span>
                    </div>
                    <button type="button" onClick={() => removeOne(item.id)} aria-label={`Effacer la notification de ${item.visitor_name}`} className="shrink-0 rounded-full p-1 text-cta-ink/70 transition-colors hover:bg-cta-ink/15 hover:text-cta-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-cta-ink"><X size={13} weight="bold" /></button>
                  </li>
                ))}
              </ul>
            )}

            <div className="rk-vl-item border-t border-cta-ink/15 pt-3">
              <Link href="/dashboard" onClick={close} className="block rounded-lg py-1.5 text-center text-xs font-semibold text-cta-ink/85 transition-colors hover:text-cta-ink">Voir tous les visiteurs</Link>
            </div>

            <div className="rk-vl-item">
              {sound === "unsupported" && <p className="text-xs text-cta-ink/75">Le son d’alerte n’est pas disponible sur cet appareil : la pastille et les notifications restent actives.</p>}
              {sound === "off" && <button type="button" onClick={() => void enableSound()} className="flex w-full items-center justify-center gap-2 rounded-full bg-cta-ink/15 px-3 py-2 text-xs font-semibold transition-colors hover:bg-cta-ink/25"><SpeakerHigh size={16} weight="bold" aria-hidden="true" /> Activer le son d’alerte</button>}
              {sound === "ready" && <div className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 font-semibold"><SpeakerHigh size={16} weight="bold" aria-hidden="true" /> Son d’alerte activé</span><button type="button" onClick={disableSound} className="flex items-center gap-1 font-medium underline text-cta-ink/80 hover:text-cta-ink"><SpeakerSlash size={14} aria-hidden="true" /> Couper</button></div>}
              {sound === "blocked" && <button type="button" onClick={() => void enableSound()} className="flex w-full items-start gap-2 rounded-xl bg-cta-ink/15 px-3 py-2 text-left text-xs"><WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" /><span><span className="font-semibold">Son bloqué par le navigateur.</span> Touchez ici pour le réactiver.</span></button>}
            </div>
          </div>
        </div>

        {/* Bouton : par-dessus la goutte ; il prend la couleur de la goutte à l’ouverture pour que les deux fusionnent. */}
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="rk-visit-panel"
          aria-label={`Arrivées de visiteurs${unread > 0 ? `, ${unread} nouvelle${unread > 1 ? "s" : ""}` : ""}`}
          className={`relative z-20 grid place-items-center rounded-full border transition-[background-color,color,border-color,transform] duration-200 active:scale-95 ${open ? "border-cta bg-cta text-cta-ink" : "border-border bg-canvas text-ink hover:border-cta"}`}
          style={{ width: BELL, height: BELL }}
        >
          {unread > 0 ? <BellRinging size={18} weight="fill" aria-hidden="true" /> : <Bell size={18} weight="bold" aria-hidden="true" />}
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
        </button>
      </div>

      {/* Notifications : dans <body>, car l’en-tête crée son propre empilement et passerait sous les fenêtres ouvertes. */}
      {mounted && createPortal(
        <div aria-live="polite" className="pointer-events-none fixed right-4 top-[4.25rem] z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
          {toasts.map((alert) => <div key={alert.id} className="pointer-events-auto"><Toast alert={alert} onClose={dismiss} /></div>)}
        </div>,
        document.body,
      )}
    </>
  );
}
