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

/** Intervalle de sondage. Un onglet en arrière-plan est ralenti par le navigateur lui-même : on sonde quand même, car une
 * alerte sert justement quand on regarde autre chose. */
const POLL_MS = 8000;
const TOAST_MS = 9000;
const MAX_TOASTS = 3;
const MAX_LIST = 30;

type Entry = VisitAlert & { read: boolean };

const clock = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};
const details = (alert: VisitAlert) => [alert.reason, alert.access_point].filter(Boolean).join(" · ");
const headline = (alert: VisitAlert) => (alert.for_you === "host" ? `${alert.visitor_name} vous demande` : `Nouvelle visite : ${alert.visitor_name}`);

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
        <p className="mt-0.5 text-[11px] text-ink-soft">{alert.for_you === "host" ? "Pour vous" : "Aucune personne désignée — l'équipe est prévenue"}</p>
      </div>
      <button type="button" onClick={() => onClose(alert.id)} aria-label="Fermer la notification" className="shrink-0 rounded-full p-1 text-ink-soft hover:bg-canvas hover:text-ink"><X size={14} weight="bold" /></button>
    </div>
  );
}

/** Cloche d'alerte de l'en-tête : prévient quand un visiteur arrive (pastille, notification, carillon) sans service externe.
 * Le patron et les gérants reçoivent les visites sans personne désignée ; un membre « visitable » reçoit celles où on le demande. */
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

  const openRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const syncSound = useCallback(() => setSound(currentVisitSoundState()), []);
  const dismiss = useCallback((id: string) => setToasts((current) => current.filter((item) => item.id !== id)), []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { openRef.current = open; }, [open]);

  // --- Sondage ---------------------------------------------------------------------------------------------------------
  const poll = useCallback(async () => {
    if (busyRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    busyRef.current = true;
    try {
      const { data } = await apiClient.get<VisitAlertsPayload>("/checkins/alerts/", cursorRef.current ? { params: { since: cursorRef.current } } : undefined);
      const firstCall = cursorRef.current === null;
      cursorRef.current = data.cursor;
      if (firstCall) return; // le premier appel ne sert qu'à obtenir l'horloge du serveur : on ne rejoue pas l'historique
      const fresh = data.items.filter((item) => !seenRef.current.has(item.id));
      fresh.forEach((item) => seenRef.current.add(item.id));
      const skipped = Math.max(0, data.total - data.items.length); // plus de 20 arrivées d'un coup : les plus anciennes ne sont pas détaillées
      if (skipped > 0) { setMissed((value) => value + skipped); setMissedUnread((value) => value + skipped); }
      if (fresh.length === 0) return;
      setEntries((current) => [...fresh.map((item) => ({ ...item, read: openRef.current })).reverse(), ...current].slice(0, MAX_LIST));
      const live = fresh.filter((item) => !item.late); // une fiche synchronisée tardivement n'est pas une arrivée « en direct » : pastille seulement
      if (live.length > 0) {
        setToasts((current) => [...current, ...live].slice(-MAX_TOASTS));
        if (currentVisitSoundState() === "ready") {
          if (!(await playChime())) syncSound(); // le navigateur a repris la main sur le son : on le dit dans le panneau
        } else if (readVisitSoundPreference()) syncSound();
        setToasts((current) => (openRef.current ? [] : current));
        if (typeof navigator !== "undefined") navigator.vibrate?.(200);
      }
    } catch {
      /* silencieux : une coupure réseau ou un serveur qui dort ne doit jamais s'afficher comme une erreur ; on réessaie au prochain tour */
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
    if (ok) await playChime(); // un carillon de confirmation : on sait tout de suite si l'appareil sonne
  };
  const disableSound = () => { writeVisitSoundPreference(false); syncSound(); };

  // --- Panneau ---------------------------------------------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return undefined;
    setEntries((current) => (current.some((item) => !item.read) ? current.map((item) => (item.read ? item : { ...item, read: true })) : current));
    setMissedUnread(0);
    setToasts([]); // le panneau montre déjà les arrivées : les notifications ne doivent pas le recouvrir
    syncSound();
    const onPointer = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open, syncSound]);

  const unread = entries.filter((item) => !item.read).length + missedUnread;

  // Pastille dans le titre de l'onglet : on la voit même quand on est sur un autre onglet.
  useEffect(() => {
    const strip = (title: string) => title.replace(/^\(\d+\)\s/, "");
    if (unread > 0) document.title = `(${unread > 99 ? "99+" : unread}) ${strip(document.title)}`;
    return () => { document.title = strip(document.title); };
  }, [unread]);

  if (!eligible) return null;
  const clear = () => { setEntries([]); setMissed(0); setMissedUnread(0); };

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Arrivées de visiteurs${unread > 0 ? `, ${unread} nouvelle${unread > 1 ? "s" : ""}` : ""}`}
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-canvas text-ink hover:border-cta"
        >
          {unread > 0 ? <BellRinging size={18} weight="fill" aria-hidden="true" /> : <Bell size={18} weight="bold" aria-hidden="true" />}
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
        </button>

        {open && (
          <div role="dialog" aria-label="Arrivées de visiteurs" className="fixed inset-x-4 top-16 z-50 rounded-2xl border border-border bg-surface p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <p className="text-sm font-semibold text-ink">Arrivées de visiteurs</p>
              {(entries.length > 0 || missed > 0) && <button type="button" onClick={clear} className="text-xs font-medium text-ink-soft underline hover:text-ink">Effacer</button>}
            </div>

            {entries.length === 0 && missed === 0 ? (
              <p className="rounded-xl bg-canvas px-3 py-4 text-center text-sm text-ink-soft">Aucune arrivée pour l'instant. Les nouvelles visites s'afficheront ici dès qu'elles sont enregistrées.</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {missed > 0 && <li className="rounded-xl bg-canvas px-3 py-2 text-xs text-ink-soft">+ {missed} autre{missed > 1 ? "s" : ""} arrivée{missed > 1 ? "s" : ""} plus ancienne{missed > 1 ? "s" : ""} — voir la liste des visiteurs.</li>}
                {entries.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5 rounded-xl bg-canvas px-3 py-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-red-600"}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{headline(item)}</p>
                      {details(item) && <p className="truncate text-xs text-ink-soft">{details(item)}</p>}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-ink-soft">{clock(item.arrived_at)}</span>
                  </li>
                ))}
              </ul>
            )}

            <Link href="/dashboard" onClick={() => setOpen(false)} className="mt-2 block rounded-xl px-3 py-2 text-center text-sm font-medium text-ink hover:bg-canvas">Voir tous les visiteurs</Link>

            <div className="mt-1 border-t border-border pt-3">
              {sound === "unsupported" && <p className="px-1 text-xs text-ink-soft">Le son d'alerte n'est pas disponible sur cet appareil : la pastille et les notifications restent actives.</p>}
              {sound === "off" && <button type="button" onClick={() => void enableSound()} className="flex w-full items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-left text-sm font-medium text-ink hover:border-cta"><SpeakerHigh size={18} weight="bold" aria-hidden="true" /> Activer le son d'alerte</button>}
              {sound === "ready" && <div className="flex items-center justify-between gap-3 px-1"><p className="flex items-center gap-2 text-sm text-ink"><SpeakerHigh size={18} weight="bold" className="text-cta" aria-hidden="true" /> Son d'alerte activé</p><button type="button" onClick={disableSound} className="flex items-center gap-1 text-xs font-medium text-ink-soft underline hover:text-ink"><SpeakerSlash size={14} aria-hidden="true" /> Couper</button></div>}
              {sound === "blocked" && <button type="button" onClick={() => void enableSound()} className="flex w-full items-start gap-2 rounded-xl border border-error-text/30 bg-error-bg px-3 py-2.5 text-left text-sm text-error-text"><WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" /><span><span className="font-semibold">Son bloqué par le navigateur.</span> Touchez ici pour le réactiver.</span></button>}
            </div>
          </div>
        )}
      </div>

      {/* Notifications : dans <body>, car l'en-tête crée son propre empilement et passerait sous les fenêtres ouvertes. */}
      {mounted && createPortal(
        <div aria-live="polite" className="pointer-events-none fixed right-4 top-[4.25rem] z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
          {toasts.map((alert) => <div key={alert.id} className="pointer-events-auto"><Toast alert={alert} onClose={dismiss} /></div>)}
        </div>,
        document.body,
      )}
    </>
  );
}
