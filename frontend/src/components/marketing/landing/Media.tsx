"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

import { cloudImage, cloudinaryLoader } from "@/lib/cloudinary";

/**
 * next/image servi par Cloudinary (loader), avec repli automatique sur le fichier local de
 * /public si Cloudinary ne répond pas (image pas encore uploadée, panne…) : la landing n'a
 * jamais d'image cassée, même juste après un déploiement.
 */
export function CloudImage(props: Omit<ImageProps, "loader">) {
  const { onError, unoptimized, ...rest } = props;
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Une erreur survenue avant l'hydratation n'émet plus d'événement : on la détecte au montage.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <Image
      {...rest}
      ref={ref}
      loader={failed ? undefined : cloudinaryLoader}
      unoptimized={failed || unoptimized}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

export type Art = { src: string; w: number; h: number };

const DESKTOP_WIDTHS = [960, 1280, 1672];
const MOBILE_WIDTHS = [480, 720, 940];

/**
 * Image de fond « direction artistique » : une photo pour le PC, une autre pour le mobile.
 * <picture> ne télécharge QUE celle du breakpoint courant (pas les deux). À placer dans un
 * parent `relative` : elle le remplit (object-cover). Même repli local que CloudImage.
 */
export function ArtImage({
  desktop,
  mobile,
  priority = false,
  desktopSizes = "1280px",
  className = "",
}: {
  desktop: Art;
  mobile: Art;
  priority?: boolean;
  desktopSizes?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  const set = (art: Art, widths: number[]) => widths.map((w) => `${cloudImage(art.src, { width: w })} ${w}w`).join(", ");

  return (
    <picture>
      <source
        media="(min-width: 768px)"
        srcSet={failed ? desktop.src : set(desktop, DESKTOP_WIDTHS)}
        sizes={failed ? undefined : desktopSizes}
        width={desktop.w}
        height={desktop.h}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={failed ? mobile.src : cloudImage(mobile.src, { width: 720 })}
        srcSet={failed ? undefined : set(mobile, MOBILE_WIDTHS)}
        sizes={failed ? undefined : "100vw"}
        alt=""
        aria-hidden="true"
        width={mobile.w}
        height={mobile.h}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        onError={() => setFailed(true)}
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
      />
    </picture>
  );
}
