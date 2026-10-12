"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { ArrowLeft, CheckCircle, Info, LockKey, QrCode, ShieldCheck, WarningCircle, WifiSlash, X } from "@phosphor-icons/react";

import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import SocialButtons, { enabledProviders, useAuthNotice } from "@/components/auth/SocialButtons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGoogleAuthLogin } from "@/hooks/useAuth";
import { useServerWake } from "@/hooks/useServerWake";

const POINTS = [
  { icon: QrCode, title: "Zéro compte pour le visiteur", body: "Il scanne, remplit et signe depuis son téléphone." },
  { icon: WifiSlash, title: "Continue sans réseau", body: "Les visites se synchronisent au retour de la connexion." },
  { icon: ShieldCheck, title: "Chacun voit ce qu’il doit voir", body: "Accès par rôle : Patron, Gérant ou Staff." },
];

const GOOGLE_MIN_WIDTH = 200;
const GOOGLE_MAX_WIDTH = 320;
// Au-delà, on considère que le script Google n'a pas pu se charger (bloqueur, réseau coupé).
const GOOGLE_LOAD_TIMEOUT_MS = 8_000;

/** Emplacement du bouton Google : squelette tant que Google charge son bouton (aucun trou blanc, aucun saut de mise en page),
 * largeur calée sur la colonne (le bouton Google n'accepte que 200 à 400 px), message clair s'il ne s'affiche pas. */
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
      <div className="relative mx-auto h-11 w-full max-w-[320px]">
        {!ready && !unavailable && <Skeleton className="absolute inset-0 !rounded-full" />}
        <div
          ref={slotRef}
          aria-hidden={!ready}
          className={`flex h-11 w-full justify-center transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"} ${disabled ? "pointer-events-none opacity-60" : ""}`}
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
          Le bouton Google n’a pas pu se charger. Vérifie ta connexion, désactive ton bloqueur de publicités ou recharge la page.
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { login, error, loading } = useGoogleAuthLogin();
  const { notice, dismiss } = useAuthNotice();
  const { status: serverStatus } = useServerWake();
  const [googleFailed, setGoogleFailed] = useState(false);
  const providers = enabledProviders();
  const hasSocial = providers.includes("facebook") || providers.includes("apple");
  const waking = serverStatus === "waking";

  // Message affiché : erreur de connexion en cours > échec du bouton Google > code renvoyé par le serveur dans l'URL.
  const message = error
    ? { tone: "error" as const, text: error }
    : googleFailed
      ? { tone: "error" as const, text: "Google n’a pas pu valider ta connexion. Réessaie." }
      : notice
        ? { tone: notice.tone, text: notice.message }
        : null;

  return (
    <>
      {(loading || waking) && (
        <div className="qr-login-loader" role="status" aria-live="polite" aria-label="Connexion en cours">
          <div className="qr-login-loader__content">
            <div className="qr-login-loader__brand"><Logo size={52} /><span className="font-heading text-lg font-bold">REKOLLECTE</span></div>
            <div className="qr-login-loader__head"><span>Connexion sécurisée</span></div>
            <div className="qr-login-loader__track"><span /></div>
            <p className="qr-login-loader__label">Préparation de ton espace…</p>
          </div>
        </div>
      )}

      <div className="grid min-h-[100dvh] w-full bg-canvas lg:grid-cols-[1.05fr_1fr]">
        {/* Colonne marque (ordinateur) */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-mk-deep p-12 text-deep-ink lg:flex">
          <Image
            src="/landing-images/securite-carre.webp"
            alt=""
            fill
            className="object-cover opacity-35 mix-blend-overlay"
            sizes="(min-width: 1024px) 52vw, 100vw"
            priority
          />
          <div className="relative z-10"><Logo size={64} back /></div>
          <div className="relative z-10 max-w-md space-y-8">
            <div className="space-y-3">
              <p className="text-balance font-heading text-3xl font-bold leading-tight xl:text-4xl">Le registre digital des établissements.</p>
              <p className="text-sm leading-relaxed text-deep-ink/80">Une alternative moderne et sans contact au cahier de visites papier.</p>
            </div>
            <ul className="space-y-5">
              {POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20"><Icon size={20} weight="bold" aria-hidden="true" /></span>
                  <span className="text-sm leading-snug"><strong className="block font-semibold">{title}</strong><span className="text-deep-ink/75">{body}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Colonne connexion */}
        <main className="flex flex-col px-5 pb-8 pt-5 sm:px-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex min-h-[44px] items-center gap-2 rounded-full pr-3 text-sm font-medium text-ink-soft transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta">
              <ArrowLeft size={16} aria-hidden="true" /> Retour au site
            </Link>
            <ThemeToggle />
          </div>

          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-8">
            <div className="flex flex-col items-center text-center">
              <div className="lg:hidden"><Logo size={64} /></div>
              <h1 className="mt-5 text-balance text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:mt-0">Connecte-toi à ton espace</h1>
              <p className="mt-3 text-balance text-sm leading-relaxed text-ink-soft">
                Réservé au patron et à son équipe : un compte Google{hasSocial ? ", Facebook ou Apple" : ""} suffit, sans mot de passe.
              </p>
            </div>

            {message && (
              <div
                role={message.tone === "error" ? "alert" : "status"}
                className={`mt-6 flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm leading-snug ${
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

            <div className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-subtle sm:p-6">
              <GoogleSlot onCredential={(credential) => { setGoogleFailed(false); void login(credential); }} onFailure={() => setGoogleFailed(true)} disabled={loading} />

              {hasSocial && (
                <>
                  <div className="flex items-center gap-3 text-xs text-ink-soft" aria-hidden="true">
                    <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
                  </div>
                  <SocialButtons disabled={loading} />
                </>
              )}

              <p className="flex items-center justify-center gap-2 text-xs text-ink-soft">
                <LockKey size={14} weight="bold" aria-hidden="true" /> Connexion sécurisée, aucun mot de passe à retenir.
              </p>
            </div>

            <p className="mt-5 text-balance text-center text-xs leading-relaxed text-ink-soft">
              <CheckCircle size={14} weight="fill" className="mr-1.5 inline align-[-2px] text-success-text" aria-hidden="true" />
              Première visite ? Ton espace est créé automatiquement à ta première connexion.
            </p>
          </div>

          <footer className="mx-auto w-full max-w-[400px] space-y-2 text-center text-xs leading-relaxed text-ink-soft">
            <p>
              En continuant, tu acceptes nos{" "}
              <Link href="/cgu" className="underline underline-offset-2 hover:text-ink">CGU</Link> et notre{" "}
              <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">politique de confidentialité</Link>.
            </p>
            <p>Un souci pour te connecter ? <Link href="/aide" className="underline underline-offset-2 hover:text-ink">Consulte l’aide</Link>.</p>
          </footer>
        </main>
      </div>
    </>
  );
}
