import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://rekollecte.vercel.app";
  const routes = ["", "/aide", "/cgu", "/confidentialite", "/mentions-legales"];
  return routes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === "" ? "weekly" : "monthly", priority: route === "" ? 1 : 0.5 }));
}
