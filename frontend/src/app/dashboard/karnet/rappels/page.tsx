"use client";

import { useEffect, useRef, useState } from "react";
import { BellRinging, SpeakerHigh } from "@phosphor-icons/react";

import Loader from "@/components/Loader";
import { apiClient } from "@/lib/api";
import { formatDateTime } from "@/lib/karnet";
import type { KarnetReservation } from "@/types";

const POLL_MS = 20000;

function playAlarmBeep(ctx: AudioContext) {
  const beepAt = (start: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + 0.32);
  };
  beepAt(0);
  beepAt(0.4);
  beepAt(0.8);
}

export default function KarnetRappelsPage() {
  const [due, setDue] = useState<KarnetReservation[]>([]);
  const [active, setActive] = useState<KarnetReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const knownDueIds = useRef<Set<string>>(new Set());

  const load = async (isFirst: boolean) => {
    try {
      const [dueRes, activeRes] = await Promise.all([
        apiClient.get<KarnetReservation[]>("/karnet/reservations/", { params: { reminder_due: "true" } }),
        apiClient.get<KarnetReservation[]>("/karnet/reservations/", { params: { status: "en_cours" } }),
      ]);
      const newlyDue = dueRes.data.filter((r) => !knownDueIds.current.has(r.id));
      if (!isFirst && newlyDue.length > 0 && soundOn && audioCtxRef.current) {
        playAlarmBeep(audioCtxRef.current);
      }
      knownDueIds.current = new Set(dueRes.data.map((r) => r.id));
      setDue(dueRes.data);
      setActive(activeRes.data.filter((r) => r.resource_unit === "heure"));
    } catch {
      // Un cold start ou une coupure passagère saute simplement ce cycle de
      // sondage (toutes les 20s) : pas d'état d'erreur bruyant pour un rappel
      // qui se resynchronisera de lui-même au prochain passage.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
    const id = setInterval(() => void load(false), POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  const enableSound = () => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtxRef.current = new AudioCtx();
    playAlarmBeep(audioCtxRef.current);
    setSoundOn(true);
  };

  const acknowledge = async (id: string) => {
    await apiClient.patch(`/karnet/reservations/${id}/`, { reminder_acknowledged: true, status: "terminee" });
    load(true);
  };

  if (loading) return <Loader fullScreen={false} label="Chargement des rappels…" />;

  return (
    <div className="space-y-6">
      {!soundOn && (
        <button onClick={enableSound} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink hover:bg-canvas">
          <SpeakerHigh size={18} weight="bold" className="text-cta" /> Activer la sonnerie de rappel sur cet appareil
        </button>
      )}

      {due.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-error-text">Créneaux terminés — à traiter</h2>
          {due.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-text/30 bg-error-bg p-4">
              <div className="flex items-center gap-3">
                <BellRinging size={20} weight="fill" className="text-error-text" />
                <div>
                  <p className="font-semibold text-ink">{r.resource_name} · {r.client_name}</p>
                  <p className="text-xs text-ink-soft">Créneau terminé à {r.ends_at ? formatDateTime(r.ends_at) : "—"}</p>
                </div>
              </div>
              <button onClick={() => acknowledge(r.id)} className="rounded-lg bg-cta px-4 py-2 text-sm font-semibold text-white">Acquitter</button>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">Créneaux horaires en cours</h2>
        <div className="rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {active.filter((r) => !r.reminder_due).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="font-medium text-ink">{r.resource_name} · {r.client_name}</p>
                <p className="text-xs text-ink-soft">Se termine à {r.ends_at ? formatDateTime(r.ends_at) : "—"}</p>
              </div>
            ))}
            {active.filter((r) => !r.reminder_due).length === 0 && due.length === 0 && (
              <p className="p-4 text-sm text-ink-soft">Aucun créneau horaire en cours pour l’instant.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
