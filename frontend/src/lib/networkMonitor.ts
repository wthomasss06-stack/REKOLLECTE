import { API_BASE, isApiJsonResponse } from "@/lib/apiBase";

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
      const response = await fetch(`${API_BASE}/health/`, { method: "GET", cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(5000) });
      // « Joignable » = l’API a répondu en JSON. La page d’attente de Render (HTML, 200) ou une erreur 5xx du proxy
      // ne comptent pas : sinon la synchronisation partirait vers un serveur encore endormi et brûlerait ses essais.
      const apiAnswered = (response.ok || response.status === 429) && isApiJsonResponse(response);
      this.status = { browserOnline: true, apiReachable: apiAnswered, lastChecked: Date.now() };
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
