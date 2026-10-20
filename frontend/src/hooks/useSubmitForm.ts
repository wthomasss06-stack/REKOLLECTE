"use client";
import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import { API_BASE } from "@/lib/apiBase";
import { db, markCheckInSynced, toSyncPayload, type OfflineCheckIn } from "@/lib/db";
import { networkMonitor } from "@/lib/networkMonitor";
import { waitForServer } from "@/lib/serverWake";

type SubmitStatus = "idle" | "saving" | "saved_offline" | "synced";
type ProcessedItem = { idempotency_key: string; status: string; message?: string };

const RETRY_IN_MS = 10_000;
// Appareil en ligne mais serveur muet (Render dort) : on le réveille et on renvoie dès qu'il répond, tant que la page reste ouverte.
const WAKE_WAIT_MS = 90_000;

/**
 * Endpoint public (pas d'auth) : on utilise axios brut, pas apiClient
 * (reserve au dashboard authentifie) — separation volontaire des deux mondes.
 */
export function useSubmitForm(qrToken: string) {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  // Numéro de la saisie en cours. Sur une tablette on remet le formulaire à zéro pour le visiteur suivant : l'envoi
  // de la fiche précédente peut encore être en vol, et sa réponse ne doit PAS rouvrir un « Merci » sur la saisie d'après.
  const run = useRef(0);

  const reset = useCallback(() => {
    run.current += 1;
    setStatus("idle");
  }, []);

  const submitForm = async (responses: Record<string, unknown>, signatureBlob: string) => {
    const myRun = ++run.current;
    setStatus("saving");

    const checkin: OfflineCheckIn = {
      idempotency_key: uuidv4(),
      qr_token: qrToken,
      responses,
      signature_blob: signatureBlob,
      created_at_client: new Date().toISOString(),
      sync_status: "pending",
      retry_count: 0,
      next_retry_at: null,
      last_error: null,
    };

    // Ecriture locale immediate : le visiteur ne doit jamais attendre le reseau.
    await db.checkins.add(checkin);
    window.dispatchEvent(new CustomEvent("qr:sync-updated"));
    setStatus("saved_offline");

    const retryLater = (message: string) => db.checkins.update(checkin.idempotency_key, {
      retry_count: 1,
      next_retry_at: new Date(Date.now() + RETRY_IN_MS).toISOString(),
      last_attempt_at: new Date().toISOString(),
      last_error: message,
    });

    const attemptSync = async () => {
      try {
        const { data } = await axios.post<{ processed?: ProcessedItem[] }>(`${API_BASE}/checkins/sync/`, { checkins: [toSyncPayload(checkin)] }, { timeout: 15_000 });
        const result = Array.isArray(data?.processed) ? data.processed.find((item) => item.idempotency_key === checkin.idempotency_key) : undefined;
        if (result?.status === "created" || result?.status === "already_exists") {
          await markCheckInSynced(checkin.idempotency_key);
          if (run.current === myRun) setStatus("synced");
        } else {
          // Refus ou réponse inexploitable : la fiche reste en file, la synchronisation en arrière-plan prend le relais.
          await retryLater(result?.message || "La réponse serveur n’a pas confirmé l’enregistrement.");
        }
      } catch {
        await retryLater("Réseau indisponible, nouvelle tentative automatique.");
      }
      window.dispatchEvent(new CustomEvent("qr:sync-updated"));
    };

    if (await networkMonitor.check()) {
      await attemptSync();
    } else if (typeof navigator !== "undefined" && navigator.onLine !== false) {
      void waitForServer({ maxMs: WAKE_WAIT_MS }).then((alive) => { if (alive) void attemptSync(); });
    }
  };

  return { submitForm, status, reset };
}
