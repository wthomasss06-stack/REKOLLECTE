"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import { API_BASE } from "@/lib/apiBase";
import { SYNCING_STALE_MS, db, markCheckInSynced, purgeSyncedCheckIns, toSyncPayload, type OfflineCheckIn } from "@/lib/db";
import { networkMonitor, type NetworkStatus } from "@/lib/networkMonitor";

const BATCH_SIZE = 20;
// Une fiche peut embarquer des photos de pièces d’identité (plusieurs Mo) : on découpe aussi par poids pour rester
// sous le plafond du serveur (24 Mo par requête) et d’un délai raisonnable sur un réseau mobile.
const BATCH_MAX_CHARS = 8_000_000;
const MAX_RETRIES = 5;
const RETRY_BASE_MS = 5_000;
// Tant qu’il reste des visites en attente, on revérifie le serveur régulièrement : sans ça, une visite
// enregistrée pendant que le serveur dormait n’était renvoyée qu’au prochain changement d’onglet.
const PENDING_TICK_MS = 20_000;

/** Réponses serveur définitives : renvoyer la même fiche ne changera rien, on ne boucle pas dessus. */
const PERMANENT_STATUSES = new Set(["invalid", "missing_required_fields", "unknown_organization"]);

export type SyncState = {
  pendingCount: number;
  failedCount: number;
  syncing: boolean;
  network: NetworkStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
};
export type SyncController = SyncState & { retryNow: () => void; refreshState: () => Promise<void> };

type ProcessedItem = { idempotency_key: string; status: string; message?: string };

function emitSyncUpdate() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("qr:sync-updated"));
}

function backoffMs(retryCount: number): number {
  return RETRY_BASE_MS * 2 ** Math.min(retryCount, 5);
}

function permanentMessage(result: ProcessedItem): string {
  if (result.status === "missing_required_fields") return "Des champs obligatoires manquent : la fiche n’a pas pu être enregistrée.";
  if (result.status === "unknown_organization") return "Ce QR Code n’est plus actif : la fiche n’a pas pu être enregistrée.";
  return result.message || "Fiche refusée par le serveur.";
}

async function readQueueState(): Promise<Pick<SyncState, "pendingCount" | "failedCount" | "lastSyncedAt" | "lastError">> {
  const items = await db.checkins.toArray();
  const pending = items.filter((item) => item.sync_status === "pending" || item.sync_status === "syncing");
  const failed = items.filter((item) => item.sync_status === "failed");
  const synced = items.filter((item) => item.sync_status === "synced" && item.synced_at).sort((a, b) => String(b.synced_at).localeCompare(String(a.synced_at)));
  const latestError = failed.sort((a, b) => String(b.last_attempt_at).localeCompare(String(a.last_attempt_at)))[0]?.last_error || null;
  return {
    pendingCount: pending.length,
    failedCount: failed.length,
    lastSyncedAt: synced[0]?.synced_at || null,
    lastError: latestError,
  };
}

/** Visites à envoyer maintenant : en attente (échéance passée), orphelines « syncing », et — sur demande — en échec. */
async function selectEligible(includeFailed: boolean): Promise<OfflineCheckIn[]> {
  const now = Date.now();
  const rows = await db.checkins
    .where("sync_status")
    .anyOf(includeFailed ? ["pending", "syncing", "failed"] : ["pending", "syncing"])
    .toArray();
  return rows
    .filter((item) => {
      if (item.sync_status === "failed") return true; // uniquement quand l’utilisateur demande « Réessayer »
      if (item.sync_status === "syncing") return !item.last_attempt_at || now - Date.parse(item.last_attempt_at) > SYNCING_STALE_MS;
      if ((item.retry_count || 0) >= MAX_RETRIES) return false;
      return !item.next_retry_at || Date.parse(item.next_retry_at) <= now;
    })
    // « Réessayer » repart de zéro : sans ça, une fiche en échec (retry_count >= MAX) n’était jamais renvoyée.
    .map((item) => (item.sync_status === "failed" ? { ...item, retry_count: 0, next_retry_at: null } : item))
    .sort((a, b) => a.created_at_client.localeCompare(b.created_at_client));
}

export function useBackgroundSync(): SyncController {
  const [network, setNetwork] = useState<NetworkStatus>(() => networkMonitor.getStatus());
  const [state, setState] = useState<SyncState>({ pendingCount: 0, failedCount: 0, syncing: false, network: networkMonitor.getStatus(), lastSyncedAt: null, lastError: null });
  const networkRef = useRef(network);
  const syncingRef = useRef(false);
  const pendingRef = useRef(0);

  const refreshState = useCallback(async () => {
    const queue = await readQueueState();
    pendingRef.current = queue.pendingCount;
    setState((current) => ({ ...current, ...queue, network: networkRef.current }));
  }, []);

  const syncPending = useCallback(async (includeFailed = false) => {
    if (syncingRef.current || !networkRef.current.browserOnline || !networkRef.current.apiReachable) return;
    syncingRef.current = true;
    setState((current) => ({ ...current, syncing: true, lastError: null }));
    try {
      const eligible = await selectEligible(includeFailed);
      const batches: OfflineCheckIn[][] = [];
      let current: OfflineCheckIn[] = [];
      let currentChars = 0;
      for (const item of eligible) {
        const weight = JSON.stringify(toSyncPayload(item)).length;
        if (current.length > 0 && (current.length >= BATCH_SIZE || currentChars + weight > BATCH_MAX_CHARS)) {
          batches.push(current);
          current = [];
          currentChars = 0;
        }
        current.push(item);
        currentChars += weight;
      }
      if (current.length > 0) batches.push(current);

      for (const batch of batches) {
        const attemptedAt = new Date().toISOString();
        await db.checkins.bulkPut(batch.map((item) => ({ ...item, sync_status: "syncing" as const, last_attempt_at: attemptedAt })));
        try {
          const { data } = await axios.post<{ processed?: ProcessedItem[] }>(
            `${API_BASE}/checkins/sync/`,
            { checkins: batch.map(toSyncPayload) },
            { timeout: 15000 },
          );
          // Une réponse sans `processed` (page HTML d’attente, proxy) n’est pas une réponse de l’API : même chemin qu’un échec réseau.
          if (!data || !Array.isArray(data.processed)) throw new Error("not-api-response");
          const processed = new Map(data.processed.map((result) => [result.idempotency_key, result]));
          await Promise.all(batch.map(async (item) => {
            const result = processed.get(item.idempotency_key);
            if (result?.status === "created" || result?.status === "already_exists") {
              await markCheckInSynced(item.idempotency_key);
              return;
            }
            if (result && PERMANENT_STATUSES.has(result.status)) {
              await db.checkins.update(item.idempotency_key, { sync_status: "failed", retry_count: MAX_RETRIES, next_retry_at: null, last_error: permanentMessage(result) });
              return;
            }
            const retryCount = (item.retry_count || 0) + 1;
            await db.checkins.update(item.idempotency_key, {
              sync_status: retryCount >= MAX_RETRIES ? "failed" : "pending",
              retry_count: retryCount,
              next_retry_at: new Date(Date.now() + backoffMs(retryCount)).toISOString(),
              last_error: result?.message || `Réponse serveur : ${result?.status || "inconnue"}`,
            });
          }));
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? (error.code === "ECONNABORTED" ? "Le serveur met trop de temps à répondre." : "Réseau indisponible.")
            : "Le serveur ne répond pas encore.";
          await Promise.all(batch.map((item) => {
            const retryCount = (item.retry_count || 0) + 1;
            return db.checkins.update(item.idempotency_key, {
              sync_status: retryCount >= MAX_RETRIES ? "failed" : "pending",
              retry_count: retryCount,
              next_retry_at: new Date(Date.now() + backoffMs(retryCount)).toISOString(),
              last_error: message,
            });
          }));
          break;
        }
      }
      await purgeSyncedCheckIns();
    } finally {
      const queue = await readQueueState();
      pendingRef.current = queue.pendingCount;
      syncingRef.current = false;
      setState((current) => ({ ...current, ...queue, syncing: false, network: networkRef.current }));
      emitSyncUpdate();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe((next) => {
      networkRef.current = next;
      setNetwork(next);
      setState((current) => ({ ...current, network: next }));
      if (next.apiReachable) void syncPending(false);
    });
    const onOnline = () => { void networkMonitor.check(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void networkMonitor.check(); };
    const onExternalUpdate = () => { void refreshState(); };
    // Reprise automatique : tant que des visites attendent, on sonde l’API et on renvoie dès qu’elle répond.
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible" || syncingRef.current || pendingRef.current === 0) return;
      void networkMonitor.check().then((reachable) => { if (reachable) void syncPending(false); });
    }, PENDING_TICK_MS);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("qr:sync-updated", onExternalUpdate);
    void refreshState();
    void networkMonitor.check().then((reachable) => { if (reachable) void syncPending(false); });
    return () => {
      unsubscribe();
      window.clearInterval(tick);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("qr:sync-updated", onExternalUpdate);
    };
  }, [refreshState, syncPending]);

  // « Réessayer » sonde d’abord l’API : l’état réseau en mémoire peut être périmé (serveur réveillé entre-temps).
  const retryNow = useCallback(async () => {
    const reachable = await networkMonitor.check();
    if (reachable) await syncPending(true);
  }, [syncPending]);

  return { ...state, retryNow, refreshState };
}
