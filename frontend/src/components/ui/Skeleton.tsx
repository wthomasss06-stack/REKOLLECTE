/** Squelettes de chargement : l'interface se dessine tout de suite, les données se glissent ensuite dedans.
 * Aucun hook : utilisable côté serveur comme côté client. Le mouvement (shimmer) s'éteint avec prefers-reduced-motion. */

export type SkeletonVariant = "default" | "registre" | "list" | "cards" | "form" | "qr";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`qr-skeleton ${className}`} />;
}

function Header() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-7 w-44 sm:w-56" />
      <Skeleton className="h-4 w-64 max-w-full sm:w-96" />
    </div>
  );
}

function StatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((key) => (
        <div key={key} className="rounded-xl border border-border bg-surface p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-7 w-20" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

function Rows({ count, avatar = false }: { count: number; avatar?: boolean }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {Array.from({ length: count }, (_, key) => (
        <div key={key} className="flex items-center gap-3 p-4">
          {avatar && <Skeleton className="h-9 w-9 shrink-0 !rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5 min-w-[7rem]" />
            <Skeleton className="h-3 w-3/5 min-w-[10rem]" />
          </div>
          <Skeleton className="hidden h-4 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}

function Body({ variant }: { variant: SkeletonVariant }) {
  switch (variant) {
    case "registre":
      return (
        <>
          <StatCards />
          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-xl border border-border bg-surface p-5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-5 h-48 w-full" />
            </div>
            <div className="hidden rounded-xl border border-border bg-surface p-5 lg:block">
              <Skeleton className="h-4 w-32" />
              <div className="mt-5 space-y-3">{[70, 52, 38, 24].map((width) => <Skeleton key={width} className="h-4" />)}</div>
            </div>
          </div>
          <Rows count={5} avatar />
        </>
      );
    case "list":
      return <Rows count={6} avatar />;
    case "cards":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="rounded-xl border border-border bg-surface p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-2 h-3 w-1/3" />
              <div className="mt-4 flex gap-2">{[0, 1, 2].map((tag) => <Skeleton key={tag} className="h-6 w-14" />)}</div>
              <Skeleton className="mt-5 h-3 w-2/3" />
            </div>
          ))}
        </div>
      );
    case "form":
      return (
        <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-40 !rounded-full" />
        </div>
      );
    case "qr":
      return (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-4">
            <Skeleton className="aspect-square w-full max-w-[16rem]" />
            <Skeleton className="h-10 w-44 !rounded-full" />
          </div>
        </div>
      );
    default:
      return (
        <>
          <StatCards />
          <Rows count={4} />
        </>
      );
  }
}

/** Squelette d'une page du dashboard. `label` reste lisible par les lecteurs d'écran. */
export function PageSkeleton({ variant = "default", label = "Chargement…" }: { variant?: SkeletonVariant; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <Header />
      <Body variant={variant} />
    </div>
  );
}

/** Coque complète de l'espace connecté (barre latérale + page) : affichée à la place d'un écran de chargement
 * tant que la session se rétablit, pour que l'app « apparaisse » dès le premier rendu. */
export function DashboardShellSkeleton({ label = "Ouverture de ton espace…" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-canvas">
      <aside aria-hidden="true" className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col items-center gap-5 border-r border-border bg-surface py-6 md:flex">
        <Skeleton className="h-10 w-10 !rounded-xl" />
        <div className="mt-4 flex flex-col gap-4">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-10 w-10 !rounded-xl" />)}
        </div>
      </aside>
      <nav aria-hidden="true" className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-surface px-6 py-3 md:hidden">
        {[0, 1, 2].map((key) => <Skeleton key={key} className="h-9 w-9 !rounded-xl" />)}
      </nav>
      <main className="p-6 pb-28 md:ml-[72px] md:p-10 md:pb-10">
        <PageSkeleton variant="registre" label={label} />
      </main>
    </div>
  );
}
