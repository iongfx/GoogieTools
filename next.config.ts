import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  // Keep Turbopack rooted in this project (avoids picking a parent lockfile)
  turbopack: {
    root: process.cwd(),
  },

  async redirects() {
    return [
      {
        source: "/qr",
        destination: "/tools/qr-code-generator",
        permanent: true,
      },
      {
        source: "/qr-code-generator",
        destination: "/tools/qr-code-generator",
        permanent: true,
      },
      {
        source: "/generator",
        destination: "/tools/qr-code-generator",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            // camera=(self) lets this site use a webcam for Take photo.
            // microphone and geolocation stay blocked.
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      // HTML/RSC pages only — hashed /_next/static files keep long CDN caching.
      // A 1-year HTML cache on Hostinger was serving old pages that pointed at
      // deleted JS chunks and caused “Application error” after deploys.
      {
        source: "/:path((?!_next/static|_next/image|.*\\..*).*)",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
