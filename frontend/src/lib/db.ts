import Dexie, { Table } from "dexie";

export interface OfflineCheckIn {
  idempotency_key: string;
  qr_token: string;
  responses: Record<string, unknown>;
  signature_blob: string;
  created_at_client: string;
  sync_status: "pending" | "syncing" | "synced" | "failed";
  retry_count?: number;
  last_attempt_at?: string;
  next_retry_at?: string | null;
  last_error?: string | null;
  synced_at?: string | null;
}

// Cache du FORMULAIRE lui-meme (pas seulement des soumissions) : c'est ce qui
// permet a une tablette d'accueil restee offline plusieurs jours d'afficher quand
// meme le bon formulaire pour continuer a enregistrer des visiteurs.
export interface CachedForm {
  qr_token: string;
  organization_name: string;
  organization_logo_url?: string;
  fields_schema: unknown;
  cached_at: string;
}

class QRFormDatabase extends Dexie {
  checkins!: Table<OfflineCheckIn, string>;
  formCache!: Table<CachedForm, string>;

  constructor() {
    super("QRFormDB");
    this.version(1).stores({
      checkins: "idempotency_key, sync_status",
      formCache: "qr_token",
    });
    this.version(2).stores({
      checkins: "idempotency_key, sync_status, next_retry_at, created_at_client",
      formCache: "qr_token",
    });
    this.version(3).stores({
      checkins: "idempotency_key, sync_status, next_retry_at, created_at_client",
      formCache: "qr_token",
    });
  }
}

export const db = new QRFormDatabase();

/** Une visite « en cours d'envoi » depuis plus de 2 min est orpheline (onglet fermé, plantage) : on la reprend. */
export const SYNCING_STALE_MS = 2 * 60_000;
/** Durée de conservation locale d'une visite déjà synchronisée (juste de quoi afficher « dernière synchro »). */
const SYNCED_RETENTION_MS = 7 * 24 * 3_600_000;

/** Champs réellement attendus par `POST /checkins/sync/` (pas les métadonnées locales de file d'attente). */
export function toSyncPayload(item: OfflineCheckIn) {
  return {
    idempotency_key: item.idempotency_key,
    qr_token: item.qr_token,
    responses: item.responses,
    signature_blob: item.signature_blob,
    created_at_client: item.created_at_client,
  };
}

/**
 * Visite confirmée par le serveur : on garde la trace (statut, date) mais on efface les données personnelles
 * (réponses, signature) de l'appareil — c'est souvent une tablette d'accueil partagée.
 */
export async function markCheckInSynced(key: string): Promise<void> {
  const now = new Date().toISOString();
  await db.checkins.update(key, {
    sync_status: "synced",
    synced_at: now,
    last_attempt_at: now,
    next_retry_at: null,
    last_error: null,
    responses: {},
    signature_blob: "",
  });
}

/** Supprime les visites synchronisées depuis plus de 7 jours. */
export async function purgeSyncedCheckIns(): Promise<void> {
  const cutoff = Date.now() - SYNCED_RETENTION_MS;
  await db.checkins
    .where("sync_status")
    .equals("synced")
    .filter((item) => !item.synced_at || Date.parse(item.synced_at) < cutoff)
    .delete();
}

