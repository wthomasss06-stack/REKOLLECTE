// Même logique que lib/api.ts : en navigateur, passer par le proxy Next.js
// same-origin (/api/v1) plutôt que par NEXT_PUBLIC_API_URL. Cette variable n'est
// pas définie en production (voir next.config.js) — l'ancien fallback
// `http://localhost:8000/api/v1` était donc appelé tel quel depuis le
// navigateur en production, échouait à chaque fois (hôte injoignable), et
// affichait "Hors ligne" en permanence même quand l'API répondait normalement
// via le proxy. C'est ce qui explique un badge "Hors ligne" alors que le
// registre, lui, se charge (ou échoue pour une tout autre raison, ex. session
// expirée) en passant correctement par /api/v1.
const API_URL = typeof window !== "undefined"
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");

export type NetworkStatus = { browserOnline: boolean; apiReachable: boolean; lastChecked: number };

class NetworkMonitor {
  private status: NetworkStatus = { browserOnline: true, apiReachable: true, lastChecked: Date.now() };
  private listeners = new Set<(status: NetworkStatus) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      this.status.browserOnline = navigator.onLine;
      window.addEventListener("online", () => { this.status = { ...this.status, browserOnline: true }; this.notify(); void this.check(); });
      window.addEventListener("offline", () => { this.status = { ...this.status, browserOnline: false, apiReachable: false }; this.notify(); });
    }
  }

  async check(): Promise<boolean> {
    if (typeof window !== "undefined" && !navigator.onLine) return false;
    try {
      const response = await fetch(`${API_URL}/health/`, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(5000) });
      this.status = { browserOnline: true, apiReachable: response.ok, lastChecked: Date.now() };
    } catch {
      this.status = { browserOnline: typeof navigator === "undefined" ? true : navigator.onLine, apiReachable: false, lastChecked: Date.now() };
    }
    this.notify();
    return this.status.apiReachable;
  }

  subscribe(listener: (status: NetworkStatus) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  getStatus(): NetworkStatus { return { ...this.status }; }
  private notify(): void { this.listeners.forEach((listener) => listener(this.getStatus())); }
}

export const networkMonitor = new NetworkMonitor();
