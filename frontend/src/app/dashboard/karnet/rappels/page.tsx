"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRinging, CheckCircle, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

import { useReminders } from "@/components/karnet/ReminderAlarm";
import Loader from "@/components/Loader";
import { useDialog } from "@/components/ui/DialogProvider";
import { apiClient } from "@/lib/api";
import { formatDateTime, formatXOF, notifyKarnetChanged } from "@/lib/karnet";
import type { KarnetReservation } from "@/types";

const POLL_MS = 20000;

export default function KarnetRappelsPage() {
  // Le sondage des créneaux terminés et la sonnerie vivent dans ReminderProvider (layout) : ils tournent
  // sur TOUS les onglets REKOLLECTE+, pas seulement ici. Cette page affiche et traite.
  const { due, loaded, sound, wakeLockSupported, keepAwake, refresh, enableSound, disableSound, testSound, setKeepAwake } = useReminders();
  const { confirm } = useDialog();
  const [active, setActive] = useState<KarnetReservation[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<"ok" | "blocked" | null>(null);
  const [error, setError] = useState("");

  const loadActive = useCallback(async () => {
    try {
      // has_slot=true couvre les ressources à l'heure ET au jour ; une ressource à l'unité n'a pas de créneau, donc jamais de rappel.
      const res = await apiClient.get<KarnetReservation[]>("/karnet/reservations/", { params: { status: "en_cours", has_slot: "true" } });
      setActive(res.data);
    } catch {
      /* cycle sauté (cold start, coupure) : le prochain passage resynchronise */
    }
  }, []);

  useEffect(() => {
    void loadActive();
    const id = setInterval(() => void loadActive(), POLL_MS);
    return () => clearInterval(id);
  }, [loadActive]);
  useEffect(() => { void loadActive(); }, [due.length, loadActive]);

  // « Payé » ferme le créneau et solde aussi l'encaissement pour les rares réservations héritées qui ne l'étaient pas.
  const resolve = async (r: KarnetReservation, outcome: "terminee" | "annulee") => {
    if (outcome === "annulee") {
      const ok = await confirm({
        tone: "danger",
        title: `Annuler la réservation #${r.number} ?`,
        message: `${r.resource_name} · ${r.client_name} (${formatXOF(r.total_amount)}). Elle sort des paiements ; si le client a déjà payé, pense à le rembourser hors de l’application.`,
        confirmLabel: "Oui, annuler",
        cancelLabel: "Non, la garder",
        runningLabel: "Annulation…",
        run: () => apiClient.patch(`/karnet/reservations/${r.id}/`, { reminder_acknowledged: true, status: outcome }),
        errorTitle: "Impossible d’annuler cette réservation",
      });
      if (!ok) return;
    } else {
      setResolvingId(r.id);
      setError("");
      try {
        await apiClient.patch(`/karnet/reservations/${r.id}/`, { reminder_acknowledged: true, status: outcome, is_paid: true });
      } catch {
        setError("Impossible d’enregistrer. Vérifie la connexion puis réessaie.");
        setResolvingId(null);
        return;
      }
    }
    notifyKarnetChanged();
    await Promise.all([refresh(), loadActive()]);
    setResolvingId(null);
  };

  const runTest = async () => {
    setTestResult((await testSound()) ? "ok" : "blocked");
  };

  if (!loaded) return <Loader fullScreen={false} label="Chargement des rappels…" />;

  return (
    <div className="space-y-6">
      {/* ── Sonnerie : l'état affiché est l'état RÉEL du navigateur, pas seulement notre préférence ── */}
      <section aria-label="Sonnerie" className="space-y-3 rounded-xl border border-border bg-surface p-4">
        {sound === "unsupported" && (
          <p className="text-sm text-ink-soft">Cet appareil ne permet pas la sonnerie. Les rappels restent signalés ici, dans la bannière et dans le titre de l’onglet.</p>
        )}
        {sound === "off" && (
          <>
            <button type="button" onClick={() => void enableSound()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-cta px-5 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover">
              <SpeakerHigh size={18} weight="bold" /> Activer la sonnerie sur cet appareil
            </button>
            <p className="text-xs text-ink-soft">Les navigateurs n’autorisent le son qu’après un appui : un bip de confirmation sonne tout de suite pour vérifier que l’appareil est bien réglé.</p>
          </>
        )}
        {sound === "ready" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-success-text"><CheckCircle size={20} weight="fill" /> Sonnerie active sur cet appareil</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void runTest()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"><SpeakerHigh size={16} weight="bold" /> Tester le son</button>
              <button type="button" onClick={disableSound} className="inline-flex min-h-[44px] items-center rounded-full border border-border px-4 text-sm font-medium text-ink-soft hover:text-ink">Désactiver</button>
            </div>
          </div>
        )}
        {sound === "blocked" && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-error-text"><SpeakerSlash size={20} weight="fill" /> Le navigateur a coupé le son (rechargement, écran verrouillé ou onglet en arrière-plan).</p>
            <button type="button" onClick={() => void enableSound()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-cta px-5 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover"><SpeakerHigh size={18} weight="bold" /> Réactiver le son</button>
          </div>
        )}
        {testResult === "blocked" && <p role="status" className="text-xs font-medium text-error-text">Le son est resté bloqué : vérifie le volume et le mode silencieux de l’appareil, puis réessaie.</p>}
        {testResult === "ok" && sound === "ready" && <p role="status" className="text-xs text-ink-soft">Si tu as entendu trois bips, l’appareil est prêt.</p>}
        {wakeLockSupported && sound !== "unsupported" && (
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={keepAwake} onChange={(e) => setKeepAwake(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--c-cta))]" />
            Garder l’écran allumé tant que cette page est ouverte
          </label>
        )}
        <p className="text-xs text-ink-soft">Une tablette en veille ne sonne pas : laisse cet écran allumé (ou active l’option ci-dessus) pendant les heures de service.</p>
      </section>

      {error && <p role="alert" className="text-sm font-medium text-error-text">{error}</p>}

      {due.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-error-text">Créneaux terminés — à traiter</h2>
          {due.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-text/30 bg-error-bg p-4">
              <div className="flex items-center gap-3">
                <BellRinging size={22} weight="fill" className="shrink-0 text-error-text" />
                <div>
                  <p className="font-semibold text-ink">#{r.number} · {r.resource_name} · {r.client_name}</p>
                  <p className="text-xs text-ink-soft">Créneau terminé à {r.ends_at ? formatDateTime(r.ends_at) : "—"}{!r.is_paid && " · pas encore encaissé"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void resolve(r, "annulee")}
                  disabled={resolvingId === r.id}
                  className="min-h-[44px] rounded-full border border-border bg-surface px-5 text-sm font-medium text-ink-soft transition hover:border-error-text hover:text-error-text disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void resolve(r, "terminee")}
                  disabled={resolvingId === r.id}
                  className="min-h-[44px] rounded-full bg-cta px-6 text-sm font-semibold text-cta-ink transition hover:bg-cta-hover disabled:opacity-60"
                >
                  {resolvingId === r.id ? "…" : "Payé"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink">Créneaux en cours</h2>
        <div className="rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {active.filter((r) => !r.reminder_due).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="font-medium text-ink">#{r.number} · {r.resource_name} · {r.client_name}</p>
                <p className="text-xs text-ink-soft">Se termine à {r.ends_at ? formatDateTime(r.ends_at) : "—"}</p>
              </div>
            ))}
            {active.filter((r) => !r.reminder_due).length === 0 && due.length === 0 && (
              <p className="p-4 text-sm text-ink-soft">Aucun créneau en cours pour l’instant.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
