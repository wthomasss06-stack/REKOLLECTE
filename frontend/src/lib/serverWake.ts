// Réveil du serveur (Render free : l'instance s'endort après ~15 min sans trafic et met 30 à 60 s à repartir).
//
// Principe : un serveur endormi n'est PAS une session expirée. On le détecte avec une sonde légère
// (GET /api/v1/health/, sans effet de bord, donc interrompable et rejouable à volonté), on attend
// qu'il réponde, et seulement ensuite on envoie les vraies requêtes. Tout le monde (client API,
// refresh JWT, connexion Google, bandeau d'état) partage UNE seule boucle de sonde.

// Même origine (rewrite Vercel) : les cookies de session restent first-party.
const HEALTH_URL = "/api/v1/health/";
const PROBE_TIMEOUT_MS = 10_000;
// Au-delà, on considère le serveur réellement indisponible (et plus seulement en train de se réveiller).
const DEFAULT_MAX_WAIT_MS = 180_000;
// Render coupe l'instance après 15 min d'inactivité : on revérifie avant d'envoyer une requête si le
// dernier signe de vie date de plus de 8 min.
const FRESH_MS = 8 * 60_000;
// Le bandeau « le serveur se réveille » n'apparaît que si la sonde traîne : pas de clignotement
// quand le serveur répond vite.
const SLOW_PROBE_MS = 1_500;
const BACKOFF_MS = [1_000, 2_000, 3_000, 4_000, 5_000];
const KEEP_ALIVE_MS = 9 * 60_000;

export type WakeStatus = "ok" | "waking";
export interface WakeSnapshot {
  status: WakeStatus;
  /** Horodatage du début du réveil en cours (null si le serveur répond). */
  since: number | null;
}

const OK_SNAPSHOT: WakeSnapshot = { status: "ok", since: null };

let snapshot: WakeSnapshot = OK_SNAPSHOT;
let lastOkAt = 0;
let loop: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getWakeSnapshot(): WakeSnapshot {
  return snapshot;
}

export function subscribeWake(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** À appeler dès qu'une réponse du serveur arrive : le serveur est réveillé. */
export function markServerOk(): void {
  lastOkAt = Date.now();
  if (snapshot.status !== "ok") {
    snapshot = OK_SNAPSHOT;
    emit();
  }
}

/** À appeler quand une requête échoue sans réponse applicative (timeout, réseau, 502/503/504 de passerelle). */
export function markServerDown(): void {
  if (snapshot.status === "waking") return;
  snapshot = { status: "waking", since: Date.now() };
  emit();
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Une réponse n'est celle de l'API que si elle est du JSON : la page d'attente d'Render est du HTML. */
async function probeOnce(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(HEALTH_URL, { method: "GET", cache: "no-store", credentials: "omit", signal: controller.signal });
    return response.ok && (response.headers.get("content-type") || "").includes("json");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function runLoop(maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;
  for (;;) {
    // Hors ligne : inutile de sonder, on attend le retour du réseau (événement « online » ou prochain tour).
    const slowTimer = setTimeout(markServerDown, SLOW_PROBE_MS);
    const alive = typeof navigator !== "undefined" && navigator.onLine === false ? false : await probeOnce();
    clearTimeout(slowTimer);
    if (alive) {
      markServerOk();
      return true;
    }
    markServerDown();
    if (Date.now() >= deadline) return false;
    await sleep(BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 5_000);
    attempt += 1;
  }
}

/**
 * Résout `true` dès que le serveur répond, `false` s'il reste muet après `maxMs`.
 * Immédiat (sans réseau) quand le serveur a répondu récemment. Les appels simultanés partagent la même boucle.
 */
export function waitForServer(options: { maxMs?: number } = {}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  if (snapshot.status === "ok" && Date.now() - lastOkAt < FRESH_MS) return Promise.resolve(true);
  if (!loop) {
    loop = runLoop(options.maxMs ?? DEFAULT_MAX_WAIT_MS).finally(() => {
      loop = null;
    });
  }
  return loop;
}

/** Pré-chauffe sans rien attendre : à lancer sur la landing et la page de connexion. */
export function warmServer(): void {
  void waitForServer();
}

/**
 * Garde le serveur éveillé tant que l'espace connecté est ouvert (un ping toutes les 9 min, onglet visible),
 * et le réveille à l'avance quand on revient sur un onglet resté longtemps en arrière-plan.
 * Retourne la fonction d'arrêt.
 */
export function startKeepAlive(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const ping = () => {
    if (document.visibilityState !== "visible" || navigator.onLine === false) return;
    if (Date.now() - lastOkAt < KEEP_ALIVE_MS / 2) return;
    void probeOnce().then((alive) => {
      if (alive) markServerOk();
    });
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") warmServer();
  };
  const timer = window.setInterval(ping, KEEP_ALIVE_MS);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", warmServer);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", warmServer);
  };
}
