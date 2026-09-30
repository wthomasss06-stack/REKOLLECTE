"use client";

import Image from "next/image";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";

import Logo from "@/components/Logo";
import { useGoogleAuthLogin } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, error, loading } = useGoogleAuthLogin();

  return (
    <>
      {loading && (
        <div className="qr-login-loader" role="status" aria-live="polite" aria-label="Connexion en cours">
          <div className="qr-login-loader__content">
            <div className="qr-login-loader__brand"><Logo size={52} /><span className="font-heading text-lg font-bold">REKOLLECTE</span></div>
            <div className="qr-login-loader__head"><span>Connexion sécurisée</span><strong>—</strong></div>
            <div className="qr-login-loader__track"><span /></div>
            <p className="qr-login-loader__label">Connexion en cours… Préparation de ton espace.</p>
          </div>
        </div>
      )}
      <div className="flex min-h-[100dvh] w-full bg-canvas">
      <div className="grid min-h-[100dvh] w-full lg:grid-cols-2">
        {/* Visual Cover Column (Desktop) */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-mk-deep p-12 text-deep-ink lg:flex">
          <Image
            src="/landing-images/securite-carre.webp"
            alt="REKOLLECTE — données protégées, accès par rôle"
            fill
            className="object-cover opacity-40 mix-blend-overlay"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
          <div className="relative z-10">
            <Logo size={68} back />
          </div>
          <div className="relative z-10 space-y-3">
            <h2 className="font-heading text-3xl font-bold leading-tight">
              Le registre digital des établissements.
            </h2>
            <p className="max-w-md text-sm text-deep-ink/80 leading-relaxed">
              Données protégées, accès sécurisé par rôle. Une alternative moderne, conforme et sans contact au registre papier.
            </p>
          </div>
        </div>

        {/* Auth Card Column */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="flex flex-col items-center">
              <Logo size={88} back />
              <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-ink font-heading">
                Se connecter
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Réservé au patron et à son équipe — un compte Google suffit.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-8 shadow-subtle flex flex-col items-center gap-4">
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={(res) => res.credential && login(res.credential)}
                  onError={() => {}}
                  theme="outline"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="280"
                />
              </div>

              {loading && <p className="text-sm text-ink-soft animate-pulse">Connexion en cours…</p>}
              {error && <p className="text-sm text-error-text font-medium">{error}</p>}
            </div>

            <p className="text-xs text-ink-soft/90 leading-relaxed max-w-xs mx-auto">
              En continuant avec Google, tu acceptes nos{" "}
              <Link href="/cgu" className="underline underline-offset-2 hover:text-ink">
                CGU
              </Link>{" "}
              et notre{" "}
              <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">
                politique de confidentialité
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
