import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: number;
  className?: string;
  back?: boolean;
}

/** Marque officielle (fournie par l'utilisateur) — PNG transparent, jamais recréée en texte. */
export default function Logo({ size = 32, className = "", back }: LogoProps) {
  const content = (
    <Image
      src="/brand/logo-mark.png"
      alt="REKOLLECTE"
      width={size}
      height={size}
      className={className}
      priority
    />
  );

  if (back) {
    return (
      <Link href="/" aria-label="Retour à l'accueil" className="inline-block transition-transform hover:scale-105">
        {content}
      </Link>
    );
  }

  return content;
}
