export const LEGAL_LAST_UPDATED = "17 octobre 2026";

export default function LegalLayout({
  title,
  lastUpdated = LEGAL_LAST_UPDATED,
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <p className="font-mk-mono text-[10px] uppercase tracking-[0.1em] text-mk-moss">
        Dernière mise à jour : {lastUpdated}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
      <div className="prose-legal mt-8 max-w-none text-[15px] leading-relaxed text-mk-ink/85">{children}</div>
    </article>
  );
}
