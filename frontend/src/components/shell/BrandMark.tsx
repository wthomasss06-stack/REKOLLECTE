import Logo from "@/components/Logo";

/** Le seul logo de REKOLLECTE : le R, identique quel que soit le niveau (REKOLLECTE ou REKOLLECTE+). Décoratif : le nom est écrit à côté. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return <span className="brand-mark" aria-hidden="true"><Logo size={size} /></span>;
}
