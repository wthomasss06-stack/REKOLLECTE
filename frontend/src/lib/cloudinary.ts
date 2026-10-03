const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "gks3f2st";

const DEFAULT_FOLDER = "akatech/landing-images";

export function cloudImage(publicPath: string, options: { width?: number } = {}) {
  const cleanPath = publicPath.replace(/^\/+/, "").replace(/\\/g, "/");
  const segments = cleanPath.split("/").filter(Boolean);
  const fileName = segments.pop() ?? cleanPath;

  // Chaque segment est encodé : « Hero+ » doit partir en « Hero%2B » dans l'URL.
  const folder =
    segments.length > 0
      ? ["akatech", ...segments].map(encodeURIComponent).join("/")
      : DEFAULT_FOLDER;

  const baseName = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName;
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase() : "jpg";

  // c_limit : ne jamais agrandir une image au-delà de sa taille d'origine.
  const transforms = ["f_auto", "q_auto"];
  if (options.width) transforms.push("c_limit", `w_${options.width}`);

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(",")}/${folder}/${encodeURIComponent(baseName)}.${ext}`;
}

/**
 * Loader pour next/image : <Image loader={cloudinaryLoader} src="/landing-images/hero.webp" />
 * Le src reste le chemin local (même arborescence que public/), mais le navigateur charge
 * l'image depuis le CDN Cloudinary à la largeur exacte demandée par le srcset — sans passer
 * par l'optimiseur Next (donc sans images.remotePatterns à déclarer).
 */
export function cloudinaryLoader({ src, width }: { src: string; width: number }) {
  return cloudImage(src, { width });
}
