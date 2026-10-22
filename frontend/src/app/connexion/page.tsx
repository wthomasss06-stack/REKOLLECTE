"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { CheckCircle, Info, LockKey, QrCode, ShieldCheck, WarningCircle, WifiSlash, X } from "@phosphor-icons/react";

import Logo from "@/components/Logo";
import { WelcomeScene, type SceneStatus } from "@/components/auth/WelcomeScene";
import SocialButtons, { SOCIAL_BUTTON_BASE, enabledProviders, useAuthNotice } from "@/components/auth/SocialButtons";
import { useGoogleAuthLogin } from "@/hooks/useAuth";
import { trackAction } from "@/lib/analytics";
import "./auth-stage.css";

const CHIPS = [
  { icon: QrCode, label: "Visiteur sans compte" },
  { icon: WifiSlash, label: "Marche hors ligne" },
  { icon: ShieldCheck, label: "Accès par rôle" },
];

/** Délai d’apparition (animation d’entrée) : l’élément n°i arrive après i × 80 ms. */
const reveal = (index: number) => ({ "--i": index }) as CSSProperties;

/** Texte de la bulle de la scène : trois phrases qui tournent, remplacées par un message d’état pendant la connexion ou après une erreur.
 * Sans animation (prefers-reduced-motion), la première phrase reste affichée. */
function useBubble(status: SceneStatus): string {
  const [index, setIndex] = useState(0);
  const [greeting, setGreeting] = useState("Bonjour !");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 18 || hour < 5 ? "Bonsoir !" : "Bonjour !");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % 3), 4200);
    return () => window.clearInterval(timer);
  }, []);
  if (status === "busy") return "Un instant…";
  if (status === "error") return "Oups, vérifions ça.";
  return ["Bienvenue sur REKOLLECTE", greeting, "Vos visiteurs, bien accueillis"][index] ?? "Bienvenue sur REKOLLECTE";
}

/** Parallaxe douce de la scène avec le pointeur (souris uniquement, jamais en « mouvement réduit »). Écrit deux variables CSS, sans rendu React. */
function useStageParallax(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        stage.style.setProperty("--px", ((event.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        stage.style.setProperty("--py", ((event.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, [ref]);
}

const GOOGLE_MIN_WIDTH = 200;
const GOOGLE_MAX_WIDTH = 400; // bornes imposées par Google (200 à 400 px)
const GOOGLE_NATIVE_HEIGHT = 40; // hauteur du bouton Google en size="large"
const BUTTON_HEIGHT = 48; // h-12 : hauteur de tous les boutons de connexion
// Au-delà, on considère que le script Google n’a pas pu se charger (bloqueur, réseau coupé).
const GOOGLE_LOAD_TIMEOUT_MS = 8_000;

/** Logo « G » officiel en quatre couleurs. */
function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Emplacement du bouton Google. Ce qu’on VOIT est un bouton au même gabarit que Facebook et Apple (SOCIAL_BUTTON_BASE) ;
 * ce sur quoi on CLIQUE est le vrai bouton Google (iframe officielle, quasi transparente, étirée par-dessus à 48 px de haut).
 * Le jeton Google est donc toujours émis par Google : le flux et le serveur ne changent pas.
 * Squelette tant que Google charge son script (aucun trou, aucun saut de mise en page), message clair s’il ne s’affiche pas. */
function GoogleSlot({ onCredential, onFailure, disabled }: { onCredential: (credential: string) => void; onFailure: () => void; disabled: boolean }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(GOOGLE_MAX_WIDTH);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const measure = () => setWidth(Math.max(GOOGLE_MIN_WIDTH, Math.min(GOOGLE_MAX_WIDTH, Math.floor(slot.clientWidth))));
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(slot);
    const watch = new MutationObserver(() => {
      if (slot.querySelector("iframe, [role='button']")) {
        setReady(true);
        setUnavailable(false);
      }
    });
    watch.observe(slot, { childList: true, subtree: true });
    const timer = window.setTimeout(() => { if (!slot.querySelector("iframe, [role='button']")) setUnavailable(true); }, GOOGLE_LOAD_TIMEOUT_MS);
    return () => {
      resize.disconnect();
      watch.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="w-full">
      <div className="group relative h-12 w-full">
        {!ready && !unavailable && <div aria-hidden="true" className="absolute inset-0 animate-pulse rounded-full bg-ink/10" />}
        {/* Apparence : identique à Facebook / Apple. Survol et focus clavier viennent du conteneur (l’iframe est dedans). */}
        <div
          aria-hidden="true"
          className={`${SOCIAL_BUTTON_BASE} pointer-events-none border border-border bg-white text-neutral-800 shadow-sm duration-300 group-hover:bg-neutral-100 group-focus-within:ring-2 group-focus-within:ring-cta group-focus-within:ring-offset-2 ${
            ready ? (disabled ? "opacity-50" : "opacity-100") : unavailable ? "opacity-50" : "opacity-0"
          }`}
        >
          <GoogleGlyph /> Continuer avec Google
        </div>
        {/* Vrai bouton Google : invisible, 40 px natifs étirés à 48 px pour couvrir exactement le bouton visible. */}
        <div
          ref={slotRef}
          className={`absolute left-0 top-0 z-10 w-full origin-top overflow-hidden opacity-[0.01] ${disabled ? "pointer-events-none" : ""}`}
          style={{ height: GOOGLE_NATIVE_HEIGHT, transform: `scaleY(${BUTTON_HEIGHT / GOOGLE_NATIVE_HEIGHT})` }}
        >
          <GoogleLogin
            onSuccess={(res) => (res.credential ? onCredential(res.credential) : onFailure())}
            onError={onFailure}
            theme="outline"
            shape="pill"
            size="large"
            text="continue_with"
            locale="fr"
            width={String(width)}
          />
        </div>
      </div>
      {unavailable && !ready && (
        <p role="status" className="mt-3 text-center text-xs leading-relaxed text-ink-soft">
          Le bouton Google n’a pas pu se charger. Vérifiez votre connexion, désactivez votre bloqueur de publicités ou rechargez la page.
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { login, error, loading } = useGoogleAuthLogin();
  const { notice, dismiss } = useAuthNotice();
  const [googleFailed, setGoogleFailed] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const providers = enabledProviders();
  const hasSocial = providers.includes("facebook") || providers.includes("apple");

  // Message affiché : erreur de connexion en cours > échec du bouton Google > code renvoyé par le serveur dans l’URL.
  const message = error
    ? { tone: "error" as const, text: error }
    : googleFailed
      ? { tone: "error" as const, text: "Google n’a pas pu valider votre connexion. Réessayez." }
      : notice
        ? { tone: notice.tone, text: notice.message }
        : null;

  // La scène réagit : scan accéléré pendant la connexion, téléphone secoué sur une erreur.
  const status: SceneStatus = loading ? "busy" : message?.tone === "error" ? "error" : "idle";
  const bubble = useBubble(status);
  useStageParallax(stageRef);

  return (
    <>
      {loading && (
        <div className="qr-login-loader" role="status" aria-live="polite" aria-label="Connexion en cours">
          <div className="qr-login-loader__content">
            <div className="qr-login-loader__brand"><Logo size={52} /><span className="font-heading text-lg font-bold">REKOLLECTE</span></div>
            <div className="qr-login-loader__head"><span>Connexion sécurisée</span></div>
            <div className="qr-login-loader__track"><span /></div>
            <p className="qr-login-loader__label">Connexion en cours… Préparation de votre espace.</p>
          </div>
        </div>
      )}

      <div className="lg-root">
        <div className="lg-frame">
          {/* Volet scène : décoratif (la scène et la bulle sont masquées aux lecteurs d’écran). */}
          <aside ref={stageRef} className="lg-stage" aria-label="Présentation de REKOLLECTE">
            <i className="lg-blob lg-blob--b" aria-hidden="true" />
            <Link href="/" className="lg-brand" aria-label="REKOLLECTE, retour à l’accueil"><span aria-hidden="true"><Logo size={34} /></span><span aria-hidden="true">REKOLLECTE</span></Link>
            <div className="lg-visual" aria-hidden="true">
              <div className="lg-bubble-slot"><p key={bubble} className="lg-bubble" data-status={status}>{bubble}</p></div>
              <WelcomeScene status={status} className="lg-scene" />
            </div>
            <div className="lg-hero">
              <p className="lg-hero__title">Le registre digital des établissements.</p>
              <p className="lg-hero__lead">Une alternative moderne et sans contact au cahier de visites papier.</p>
              <ul className="lg-chips">
                {CHIPS.map(({ icon: Icon, label }, index) => (
                  <li key={label} className="lg-chip" style={reveal(index)}><Icon size={15} weight="bold" aria-hidden="true" />{label}</li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Volet connexion */}
          <main className="lg-panel">
            <div className="lg-col">
              <div className="lg-main">
                <div className="lg-reveal" style={reveal(0)}>
                  <h1 className="text-balance text-[1.7rem] font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">Connectez-vous à votre espace</h1>
                </div>

                {message && (
                  <div
                    role={message.tone === "error" ? "alert" : "status"}
                    className={`mt-5 flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm leading-snug ${
                      message.tone === "error" ? "border-error-text/30 bg-error-bg text-error-text" : "border-info-text/30 bg-info-bg text-info-text"
                    }`}
                  >
                    {message.tone === "error" ? <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" /> : <Info size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />}
                    <p className="min-w-0 flex-1 font-medium">{message.text}</p>
                    {!error && (
                      <button type="button" onClick={() => { dismiss(); setGoogleFailed(false); }} aria-label="Fermer ce message" className="-m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full opacity-70 transition hover:opacity-100">
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

                <div className="lg-reveal mt-7 space-y-4" style={reveal(1)}>
                  <GoogleSlot onCredential={(credential) => { trackAction("login_start"); setGoogleFailed(false); void login(credential); }} onFailure={() => setGoogleFailed(true)} disabled={loading} />

                  {hasSocial && (
                    <>
                      <div className="flex items-center gap-3 text-xs text-ink-soft" aria-hidden="true">
                        <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
                      </div>
                      <SocialButtons disabled={loading} />
                    </>
                  )}

                  <p className="flex items-center justify-center gap-2 pt-1 text-xs text-ink-soft">
                    <LockKey size={14} weight="bold" aria-hidden="true" /> Connexion sécurisée
                  </p>
                </div>

                <p className="lg-reveal mt-6 text-balance text-center text-xs leading-relaxed text-ink-soft" style={reveal(2)}>
                  <CheckCircle size={14} weight="fill" className="mr-1.5 inline align-[-2px] text-success-text" aria-hidden="true" />
                  Première visite ? Votre espace est créé à la première connexion.
                </p>
              </div>

              <footer className="lg-legal space-y-1.5">
                <p>
                  En continuant, vous acceptez nos{" "}
                  <Link href="/cgu" className="underline underline-offset-2 hover:text-ink">CGU</Link> et notre{" "}
                  <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">politique de confidentialité</Link>.
                </p>
                <p>Un souci pour vous connecter ? <Link href="/aide" className="underline underline-offset-2 hover:text-ink">Consultez l’aide</Link>.</p>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
