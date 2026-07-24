/**
 * Central Googie Tools brand configuration.
 * Keep marketing copy, site identity, and default SEO values here.
 */

export const BRAND = {
  name: "Googie Tools",
  primaryTagline: "Simple tools that make life easier.",
  secondaryTagline: "The internet’s happiest toolbox.",
  siteDescription:
    "Fast, friendly online tools designed to help you get things done without unnecessary complexity. Free QR code, password, unit conversion, batch image compression, and colour screen testing tools — more utilities coming soon.",
  socialSharingName: "Googie Tools",
  contactEmail: "hello@googietools.com",
  defaultKeywords: [
    "Googie Tools",
    "online tools",
    "free utility tools",
    "QR code generator",
    "password generator",
    "unit converter",
    "batch image compressor",
    "colour screen tester",
    "dead pixel tester",
    "browser-based tools",
  ] as const,
} as const;

/** Canonical production origin. Override locally with NEXT_PUBLIC_SITE_URL. */
export const PRODUCTION_SITE_URL = "https://googietools.com";

/**
 * Public site URL for SEO (sitemap, Open Graph, canonical links).
 * - Production host: set NEXT_PUBLIC_SITE_URL=https://googietools.com (or rely on the default).
 * - Local development: set NEXT_PUBLIC_SITE_URL=http://localhost:3000 in .env.local.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || PRODUCTION_SITE_URL
).replace(/\/$/, "");

declare global {
  var __googieSiteUrlWarned: boolean | undefined;
}

if (
  process.env.NODE_ENV === "production" &&
  /localhost|127\.0\.0\.1/i.test(SITE_URL) &&
  !globalThis.__googieSiteUrlWarned
) {
  globalThis.__googieSiteUrlWarned = true;
  console.warn(
    `[Googie Tools] NEXT_PUBLIC_SITE_URL is still a local address (${SITE_URL}). Set https://googietools.com on your host before deploying for correct SEO, sitemap, and canonical URLs.`,
  );
}

export const HOME_TITLE = "Googie Tools — Simple Tools That Make Life Easier";
export const HOME_DESCRIPTION =
  "Simple tools that make life easier. Explore free, browser-based utilities from Googie Tools — including a QR code generator, password generator, unit converter, batch image compressor, and colour screen & pixel tester.";
