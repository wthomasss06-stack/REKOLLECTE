"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRinging, SpeakerSlash } from "@phosphor-icons/react";

import { apiClient } from "@/lib/api";
import {
  audioSupported, currentSoundState, playAlarm, readSoundPreference, unlockAudio, writeSoundPreference, type SoundState,
} from "@/lib/audioAlarm";
import { onKarnetChanged } from "@/lib/karnet";
import type { KarnetReservation } from "@/types";

const POLL_MS = 20_000;
const REPEAT_MS = 120_000; // tant qu'un créneau terminé reste sans réponse, on re-sonne toutes les 2 minutes
const WAKE_PREF_KEY = "qr_alarm_wake_v1";

interface ReminderApi {
  due: KarnetReservation[];
  loaded: boolean;
  sound: SoundState;
  wakeLockSupported: boolean;
  keepAwake: boolean;
  refresh: () => Promise<void>;
  enableSound: () => Promise<void>;
  disableSound: () => void;
  testSound: () => Promise<boolean>;
  setKeepAwake: (value: boolean) => void;
}

const ReminderContext = createContext<ReminderApi | null>(null);

export function useReminders(): ReminderApi {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error("useReminders doit être utilisé dans ReminderProvider");
  return ctx;
}

type WakeSentinel = { release: () => Promise<void> };
type WakeNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeSentinel> } };

/**
 * Rappels de fin de créneau pour TOUT l'espace REKOLLECTE+ (avant : uniquement la page Rappels
 * ouverte). Alerte sonore si le navigateur l'autorise, et toujours une alerte visuelle (bannière,
 * titre de l'onglet, vibration) — le son seul n'est jamais la seule issue.
 */
export function ReminderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [due, setDue] = useState<KarnetReservation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sound, setSound] = useState<SoundState>("off");
  const [keepAwake, setKeepAwakeState] = useState(false);
  const knownDue = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const lastRing = useRef(0);
  const dueRef = useRef<KarnetReservation[]>([]);
  const wakeSentinel = useRef<WakeSentinel | null>(null);
  const baseTitle = useRef("");
  const wakeLockSupported = typeof navigator !== "undefined" && Boolean((navigator as WakeNavigator).wakeLock);

  const syncSound = useCallback(() => setSound(currentSoundState()), []);

  const ring = useCallback(async () => {
    lastRing.current = Date.now();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([300, 150, 300, 150, 300]);
    const played = await playAlarm();
    if (!played) syncSound(); // le navigateur a repris la main sur le son : on le dit à l'écran
  }, [syncSound]);

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.get<KarnetReservation[]>("/karnet/reservations/", { params: { reminder_due: "true" } });
      const newlyDue = res.data.filter((r) => !knownDue.current.has(r.id));
      knownDue.current = new Set(res.data.map((r) => r.id));
      dueRef.current = res.data;
      setDue(res.data);
      // Pas de sonnerie au tout premier chargement (réservations déjà échues avant l'ouverture) : la bannière suffit.
      if (!firstLoad.current && newlyDue.length > 0) void ring();
      firstLoad.current = false;
    } catch {
      /* cold start ou coupure : on réessaie au prochain cycle, sans bruit */
    } finally {
      setLoaded(true);
    }
  }, [ring]);

  // Sondage + rattrapage immédiat au retour de l'onglet / du réseau (une tablette en veille rate des cycles).
  useEffect(() => {
    baseTitle.current = document.title;
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") { void refresh(); syncSound(); } };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    const off = onKarnetChanged(() => void refresh());
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      off();
    };
  }, [refresh, syncSound]);

  // Re-sonnerie tant qu'un créneau terminé n'est pas traité.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (dueRef.current.length > 0 && Date.now() - lastRing.current >= REPEAT_MS) void ring();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [ring]);

  // Titre de l'onglet : visible même quand l'onglet est en arrière-plan.
  useEffect(() => {
    if (due.length > 0) document.title = `(${due.length}) Rappel à traiter — REKOLLECTE+`;
    else if (baseTitle.current) document.title = baseTitle.current;
  }, [due.length]);
  useEffect(() => () => { if (baseTitle.current) document.title = baseTitle.current; }, []);

  // Son : état réel au montage, puis déblocage au PREMIER geste n'importe où (un tap sur l'écran suffit
  // après un rechargement) quand l'utilisateur a déjà activé la sonnerie sur cet appareil.
  useEffect(() => {
    syncSound();
    if (!audioSupported() || !readSoundPreference()) return undefined;
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
  }, [syncSound]);

  const enableSound = useCallback(async () => {
    writeSoundPreference(true);
    const ok = await unlockAudio(syncSound);
    if (ok) await playAlarm(); // un bip de confirmation : l'utilisateur sait tout de suite si l'appareil sonne
    syncSound();
  }, [syncSound]);

  const disableSound = useCallback(() => {
    writeSoundPreference(false);
    syncSound();
  }, [syncSound]);

  const testSound = useCallback(async () => {
    const ok = (await unlockAudio(syncSound)) && (await playAlarm());
    syncSound();
    return ok;
  }, [syncSound]);

  // Écran gardé allumé (opt-in) : une tablette qui se met en veille n'entend plus rien.
  const releaseWake = useCallback(async () => {
    try { await wakeSentinel.current?.release(); } catch { /* déjà libéré */ }
    wakeSentinel.current = null;
  }, []);
  const acquireWake = useCallback(async () => {
    if (!wakeLockSupported || wakeSentinel.current || document.visibilityState !== "visible") return;
    try { wakeSentinel.current = await (navigator as WakeNavigator).wakeLock!.request("screen"); } catch { /* refusé (batterie faible…) */ }
  }, [wakeLockSupported]);
  const setKeepAwake = useCallback((value: boolean) => {
    setKeepAwakeState(value);
    try { value ? window.localStorage.setItem(WAKE_PREF_KEY, "1") : window.localStorage.removeItem(WAKE_PREF_KEY); } catch { /* ignoré */ }
    if (value) void acquireWake(); else void releaseWake();
  }, [acquireWake, releaseWake]);
  useEffect(() => {
    let stored = false;
    try { stored = window.localStorage.getItem(WAKE_PREF_KEY) === "1"; } catch { /* ignoré */ }
    setKeepAwakeState(stored);
    if (stored) void acquireWake();
    // Le système libère le verrou quand l'onglet est masqué : on le reprend au retour.
    const onVisible = () => { if (document.visibilityState === "visible" && stored) void acquireWake(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); void releaseWake(); };
  }, [acquireWake, releaseWake]);

  const value = useMemo<ReminderApi>(
    () => ({ due, loaded, sound, wakeLockSupported, keepAwake, refresh, enableSound, disableSound, testSound, setKeepAwake }),
    [due, loaded, sound, wakeLockSupported, keepAwake, refresh, enableSound, disableSound, testSound, setKeepAwake],
  );

  const onRemindersPage = pathname.startsWith("/dashboard/karnet/rappels");
  return (
    <ReminderContext.Provider value={value}>
      {due.length > 0 && !onRemindersPage && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-text/30 bg-error-bg p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-error-text">
            <BellRinging size={22} weight="fill" className="shrink-0" />
            {due.length === 1 ? "1 créneau terminé à traiter" : `${due.length} créneaux terminés à traiter`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {sound === "blocked" && (
              <button type="button" onClick={() => void enableSound()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-error-text/40 bg-surface px-4 text-sm font-semibold text-error-text">
                <SpeakerSlash size={18} weight="bold" /> Réactiver le son
              </button>
            )}
            <Link href="/dashboard/karnet/rappels" className="inline-flex min-h-[44px] items-center rounded-full bg-cta px-5 text-sm font-semibold text-cta-ink">Traiter maintenant</Link>
          </div>
        </div>
      )}
      {children}
    </ReminderContext.Provider>
  );
}
