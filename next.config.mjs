import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

// Ne pas utiliser NEXT_PUBLIC_API_URL pour le proxy : cette variable a pu être
// définie avec l’URL Vercel, ce qui faisait proxy-er /api/v1 vers lui-même.
// BACKEND_API_URL doit contenir l’URL Render complète en production.
const backendApiUrl = process.env.BACKEND_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:8000/api/v1" : "https://r3s3ign3m3nt.onrender.com/api/v1");
const backendApiBase = backendApiUrl.replace(/\/$/, "").replace(/\/api\/v1$/, "");
const apiOrigin = (() => {
  try { return new URL(backendApiUrl).origin; }
  catch { return "https://r3s3ign3m3nt.onrender.com"; }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src-elem 'self' 'unsafe-inline' https://accounts.google.com",
  `img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com ${apiOrigin}`,
  `connect-src 'self' ${apiOrigin} https://api.cloudinary.com https://res.cloudinary.com https://accounts.google.com https://www.googleapis.com https://*.googleusercontent.com https://cdn.jsdelivr.net`,
  "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
  "frame-src https://accounts.google.com",
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backendApiBase}/api/v1/:path*` }];
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default withSerwist(nextConfig);
