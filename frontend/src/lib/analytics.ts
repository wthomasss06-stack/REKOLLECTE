import { API_BASE } from "@/lib/apiBase";

/**
 * Mesure d’audience de la vitrine publique, liée au consentement.
 *
 *  - Rien n’est envoyé, et aucun cookie n’est posé, tant que la personne n’a pas accepté dans le bandeau.
 *  - Le choix est mémorisé dans le navigateur (6 mois, puis le bandeau revient) et le refus n’envoie qu’un compteur anonyme.
 *  - Les cookies `rk_vid` (visiteur, 13 mois) et `rk_sid` (visite, 30 min) sont posés par l’API (httpOnly, même domaine) à la première mesure.
 *  - Jamais de suivi dans l’application connectée, l’administration, ni les formulaires remplis par les visiteurs des établissements.
 */
export const CONSENT_KEY = "rk_cookie_consent";
export const CONSENT_EVENT = "rk:consent";
export const OPEN_COOKIES_EVENT = "rk:open-cookies";
const CONSENT_VERSION = 1;
const CONSENT_TTL_MS = 1000 * 60 * 60 * 24 * 182; // 6 mois, comme les recommandations de la CNIL

export type ActionType = "cta_click" | "login_start" | "contact_click";
export interface ConsentChoice { v: number; analytics: boolean; at: string }

// Doit rester aligné sur BLOCKED_PREFIXES de apps/analytics/services.py (le serveur re-vérifie de toute façon).
const BLOCKED = ["/dashboard", "/admin", "/v/", "/onboarding", "/api", "/connexion/callback", "/_next"];

export function isTrackablePath(pathname: string | null | undefined): boolean {
  if (!pathname || !pathname.startsWith("/")) return false;
  return !BLOCKED.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
}

export function readConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    const at = Date.parse(parsed.at ?? "");
    if (parsed.v !== CONSENT_VERSION || typeof parsed.analytics !== "boolean" || !Number.isFinite(at)) return null;
    if (Date.now() - at > CONSENT_TTL_MS) return null;
    return { v: parsed.v, analytics: parsed.analytics, at: parsed.at as string };
  } catch {
    return null;
  }
}

function post(path: string, body?: unknown) {
  // `keepalive` : la requête part même si la page se ferme juste après un clic. Les échecs sont silencieux : la mesure ne gêne jamais le site.
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => undefined);
}

/** Enregistre le choix (accepter ou refuser). Un refus ou un retrait efface aussi côté serveur ce qui avait été mesuré. */
export function saveConsent(analytics: boolean): ConsentChoice {
  const choice: ConsentChoice = { v: CONSENT_VERSION, analytics, at: new Date().toISOString() };
  try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(choice)); } catch { /* navigation privée : le choix vaut pour cette page seulement */ }
  void post("/analytics/consent/", { accepted: analytics }); // d’abord la décision, ensuite la première page vue qui en découle
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }));
  return choice;
}

/** « Effacer mes données de mesure » : supprime le visiteur côté serveur et vide les cookies. */
export function forgetMeasuredData() {
  return post("/analytics/forget/");
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_COOKIES_EVENT));
}

function utmSource(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("utm_source");
    if (fromUrl) { window.sessionStorage.setItem("rk_utm", fromUrl); return fromUrl; }
    return window.sessionStorage.getItem("rk_utm") ?? "";
  } catch {
    return "";
  }
}

function allowed(): boolean {
  return typeof window !== "undefined" && isTrackablePath(window.location.pathname) && readConsent()?.analytics === true;
}

export function trackPage(pathname: string) {
  if (!allowed() || !isTrackablePath(pathname)) return;
  void post("/analytics/collect/", { kind: "page", path: pathname, referrer: document.referrer || "", source: utmSource() });
}

export function trackAction(action: ActionType) {
  if (!allowed()) return;
  void post("/analytics/collect/", { kind: "action", action, path: window.location.pathname, referrer: "", source: utmSource() });
}

/** Action associée à un clic : bouton/lien de connexion, ou contact direct (téléphone, e-mail, WhatsApp). `data-track` force une valeur. */
export function actionForTarget(target: EventTarget | null): ActionType | null {
  if (!(target instanceof Element)) return null;
  const tagged = target.closest<HTMLElement>("[data-track]")?.dataset.track;
  if (tagged === "cta_click" || tagged === "login_start" || tagged === "contact_click") return tagged;
  const link = target.closest<HTMLAnchorElement>("a[href]");
  if (!link) return null;
  const href = link.getAttribute("href") ?? "";
  if (/^(tel:|mailto:)/i.test(href) || /(^|\/\/)(wa\.me|api\.whatsapp\.com|wa\.link)/i.test(href)) return "contact_click";
  if (href === "/connexion" || href.startsWith("/connexion?") || href.startsWith("/connexion#")) return "cta_click";
  return null;
}
