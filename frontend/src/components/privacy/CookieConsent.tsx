"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "@phosphor-icons/react";

import { CookieScene } from "@/components/privacy/CookieScene";
import { CONSENT_EVENT, OPEN_COOKIES_EVENT, forgetMeasuredData, isTrackablePath, readConsent, saveConsent, type ConsentChoice } from "@/lib/analytics";
import { useGooey } from "@/lib/gooey";
import "./cookie-consent.css";

const SNOOZE_KEY = "rk_cookie_later";
const SHOW_DELAY_MS = 1300;
const CRAWLER = /bot|crawl|spider|slurp|lighthouse|prerender|pagespeed/i;

interface View { open: boolean; mode: "intro" | "custom"; fromUser: boolean }

/** Modal cookies : apparaît une fois (après une courte pause) sur les pages publiques tant que la personne n'a pas choisi, et à la demande
 * depuis « Gérer les cookies » en pied de page. Accepter et refuser pèsent autant ; « Plus tard » (croix ou Échap) ne choisit rien. */
export default function CookieConsent() {
  const pathname = usePathname();
  const [view, setView] = useState<View>({ open: false, mode: "intro", fromUser: false });
  const [choice, setChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => { setChoice(readConsent()); }, []);

  // Ouverture automatique : pages publiques seulement, jamais pour les robots d'indexation, et pas de harcèlement après un « Plus tard ».
  useEffect(() => {
    if (!isTrackablePath(pathname) || readConsent() || CRAWLER.test(navigator.userAgent)) return undefined;
    try { if (window.sessionStorage.getItem(SNOOZE_KEY)) return undefined; } catch { /* stockage indisponible : on affiche */ }
    const timer = window.setTimeout(() => setView((current) => (current.open ? current : { open: true, mode: "intro", fromUser: false })), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Ouverture à la demande (pied de page, politique de confidentialité).
  useEffect(() => {
    const onOpen = () => { setChoice(readConsent()); setView({ open: true, mode: "custom", fromUser: true }); };
    window.addEventListener(OPEN_COOKIES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIES_EVENT, onOpen);
  }, []);

  const close = useCallback(() => setView((current) => ({ ...current, open: false })), []);
  const decide = useCallback((analytics: boolean) => { setChoice(saveConsent(analytics)); close(); }, [close]);
  const later = useCallback(() => {
    if (!readConsent()) { try { window.sessionStorage.setItem(SNOOZE_KEY, "1"); } catch { /* sans effet */ } }
    close();
  }, [close]);

  if (!view.open || typeof document === "undefined") return null;
  return createPortal(<CookieModal key="cookie-modal" initialMode={view.mode} fromUser={view.fromUser} choice={choice} onDecide={decide} onLater={later} />, document.body);
}

function CookieModal({ initialMode, fromUser, choice, onDecide, onLater }: { initialMode: "intro" | "custom"; fromUser: boolean; choice: ConsentChoice | null; onDecide: (analytics: boolean) => void; onLater: () => void }) {
  const [mode, setMode] = useState(initialMode);
  const [analytics, setAnalytics] = useState(choice?.analytics ?? false);
  const [erased, setErased] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const laterRef = useRef(onLater);
  const uid = useId();
  const titleId = `${uid}-title`;
  const textId = `${uid}-text`;
  useEffect(() => { laterRef.current = onLater; }, [onLater]);

  // Sort du bouton « Gérer les cookies » s'il a ouvert la fenêtre, sinon du bas de l'écran.
  useGooey(cardRef, { fallback: "bottom", ignoreClick: !fromUser });

  // Fond figé, focus piégé dans la carte, Échap = « Plus tard » ; le focus revient où il était.
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus({ preventScroll: true }); // ni « Accepter » ni « Refuser » n'est pré-sélectionné : un Entrée distrait ne choisit rien
    const onKeyDown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== cardRef.current) return;
      if (event.key === "Escape") { event.preventDefault(); laterRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(cardRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? []).filter((el) => el.getClientRects().length > 0);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first || !last) { event.preventDefault(); return; }
      const inside = cardRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside || document.activeElement === cardRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const custom = mode === "custom";
  const erase = async () => { await forgetMeasuredData(); setErased(true); };

  return (
    <div data-goo-host className="rk-cookie-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onLater(); }}>
      <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} className="rk-cookie">
        <div className="rk-cookie__stage">
          <button type="button" className="rk-cookie__later" onClick={onLater} aria-label={choice ? "Fermer" : "Plus tard"}><X size={20} weight="bold" /></button>
          <CookieScene calm={custom} />
        </div>
        <div className="rk-cookie__body">
          {!custom ? (
            <>
              <h2 id={titleId} className="rk-cookie__title">Un petit cookie ?</h2>
              <p id={textId} className="rk-cookie__text">Avec ton accord, REKOLLECTE mesure les pages visitées sur ce site pour l’améliorer. Pas de publicité, pas de revente, aucune adresse IP conservée. Tu peux changer d’avis à tout moment depuis le pied de page.</p>
              <div className="rk-cookie__actions">
                <button type="button" className="rk-cookie__btn rk-cookie__btn--primary" onClick={() => onDecide(true)}>Accepter</button>
                <button type="button" className="rk-cookie__btn rk-cookie__btn--outline" onClick={() => onDecide(false)}>Refuser</button>
              </div>
              <div className="rk-cookie__links">
                <button type="button" className="rk-cookie__link" onClick={() => setMode("custom")}>Personnaliser</button>
                <a className="rk-cookie__link" href="/confidentialite" target="_blank" rel="noopener noreferrer">Confidentialité</a>
              </div>
            </>
          ) : (
            <>
              <h2 id={titleId} className="rk-cookie__title">Tes préférences</h2>
              <p id={textId} className="rk-cookie__text">Choisis ce que REKOLLECTE peut mesurer. Refuser ne change rien à ton usage du site.</p>
              <div className="rk-cookie__rows">
                <div className="rk-cookie__row">
                  <div><strong>Indispensables</strong><span className="rk-cookie__hint">Connexion, sécurité, thème clair ou sombre, mode hors-ligne. Toujours actifs, ils ne mesurent rien.</span></div>
                  <button type="button" className="rk-switch" role="switch" aria-checked="true" aria-label="Cookies indispensables, toujours actifs" disabled />
                </div>
                <div className="rk-cookie__row">
                  <div><strong id={`${uid}-audience`}>Mesure d’audience</strong><span className="rk-cookie__hint">Pages vues, appareil, provenance — sans nom ni adresse IP. Deux cookies : <code>rk_vid</code> (13 mois) et <code>rk_sid</code> (30 min).</span></div>
                  <button type="button" className="rk-switch" role="switch" aria-checked={analytics} aria-labelledby={`${uid}-audience`} onClick={() => setAnalytics((value) => !value)} />
                </div>
              </div>
              <div className="rk-cookie__panel-actions">
                <button type="button" className="rk-cookie__btn rk-cookie__btn--primary rk-cookie__btn--wide" onClick={() => onDecide(analytics)}>Enregistrer mon choix</button>
                <div className="rk-cookie__links">
                  {initialMode === "intro" && <button type="button" className="rk-cookie__link" onClick={() => setMode("intro")}>Retour</button>}
                  {choice?.analytics && <button type="button" className="rk-cookie__link" onClick={erase} disabled={erased}>{erased ? "Données effacées" : "Effacer mes données de mesure"}</button>}
                  <a className="rk-cookie__link" href="/confidentialite" target="_blank" rel="noopener noreferrer">Confidentialité</a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
