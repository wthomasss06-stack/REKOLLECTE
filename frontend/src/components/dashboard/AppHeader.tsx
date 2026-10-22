"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown, GearSix, SignOut } from "@phosphor-icons/react";

import Logo from "@/components/Logo";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import ThemeToggle from "@/components/ThemeToggle";
import VisitAlerts from "./VisitAlerts";
import { useAuthContext } from "@/context/AuthContext";
import { GooeyPanel } from "@/lib/gooey";
import { roleLabel } from "@/lib/roles";
import { useLogout } from "./useLogout";

/** Avatar rond : la photo si elle charge, sinon la première lettre du nom. */
function Avatar({ name, url, size }: { name: string; url?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-canvas font-bold text-ink" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {url && !failed
        // eslint-disable-next-line @next/next/no-img-element -- avatar externe (Cloudinary / Google)
        ? <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        : (name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** En-tête de l’espace connecté : la marque du palier actif à gauche (REKOLLECTE, ou REKOLLECTE+ au Niveau 2), le profil à droite.
 * Sur téléphone seulement, le menu du profil porte aussi le mode clair/sombre et la déconnexion (sur ordinateur, ils restent dans la barre latérale). */
export default function AppHeader() {
  const { user, organization } = useAuthContext();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const name = user?.full_name || user?.email || "";
  const askLogout = useLogout(name);
  const product = organization?.capabilities?.karnet ? "REKOLLECTE+" : "REKOLLECTE";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!user) return null;
  const itemClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-canvas";

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-5">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label={`${product} — accueil`}>
        <Logo size={30} className="shrink-0" />
        <span className="truncate font-heading text-[15px] font-bold tracking-tight text-ink">{product}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <SyncStatusBadge />
        <VisitAlerts />
        <div ref={menuRef} className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Menu du profil"
            className="flex items-center gap-2 rounded-full border border-border bg-canvas py-1 pl-1 pr-2.5 hover:border-cta md:pr-3"
          >
            <Avatar name={name} url={user.avatar_url} size={30} />
            <span className="hidden min-w-0 text-left md:block"><span className="block max-w-[150px] truncate text-xs font-semibold leading-tight text-ink">{name}</span><span className="block text-[11px] leading-tight text-ink-soft">{roleLabel(user.role)}</span></span>
            <CaretDown size={13} weight="bold" className={`text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {open && (
            <GooeyPanel role="menu" aria-label="Profil" className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-2 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border px-3 pb-3 pt-2">
                <Avatar name={name} url={user.avatar_url} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{name}</p>
                  <p className="truncate text-xs text-ink-soft">{user.email}</p>
                  <p className="truncate text-xs text-ink-soft">{roleLabel(user.role)}{organization?.name || user.organization_name ? ` · ${organization?.name || user.organization_name}` : ""}</p>
                </div>
              </div>
              <div className="pt-1">
                <Link role="menuitem" href="/dashboard/parametres?open=moi" onClick={() => setOpen(false)} className={itemClass}><GearSix size={18} weight="bold" className="text-ink-soft" /> Mon profil</Link>
                {/* Téléphone seulement : sur ordinateur, ces deux commandes restent en bas de la barre latérale. */}
                <div className="md:hidden">
                  <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-ink"><span>Apparence</span><ThemeToggle /></div>
                  <button type="button" role="menuitem" onClick={() => { setOpen(false); void askLogout(); }} className={`${itemClass} text-error-text`}><SignOut size={18} weight="bold" /> Se déconnecter</button>
                </div>
              </div>
            </GooeyPanel>
          )}
        </div>
      </div>
    </header>
  );
}
