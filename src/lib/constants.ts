/**
 * Site-wide settings used across pages, SEO, and navigation.
 * Brand identity lives in src/config/brand.ts; tool directory in src/config/tools.ts.
 */

import {
  BRAND,
  HOME_DESCRIPTION,
  HOME_TITLE,
  SITE_URL,
} from "@/config/brand";

export { HOME_DESCRIPTION, HOME_TITLE, SITE_URL };

export const SITE_NAME = BRAND.name;
export const SITE_TAGLINE = BRAND.primaryTagline;
export const SITE_SECONDARY_TAGLINE = BRAND.secondaryTagline;
export const SITE_DESCRIPTION = BRAND.siteDescription;
export const SITE_EMAIL = BRAND.contactEmail;
export const SITE_KEYWORDS = BRAND.defaultKeywords;

export const NAV_LINKS = [
  { href: "/#tools", label: "Tools" },
  { href: "/privacy", label: "Privacy" },
] as const;

export const FOOTER_LINKS = [
  { href: "/#tools", label: "Tools" },
  { href: "/tools/qr-code-generator", label: "QR Code Generator" },
  { href: "/tools/password-generator", label: "Password Generator" },
  { href: "/tools/unit-converter", label: "Unit Converter" },
  { href: "/tools/batch-image-compressor", label: "Batch Image Compressor" },
  {
    href: "/tools/colour-screen-pixel-tester",
    label: "Colour Screen & Pixel Tester",
  },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

/** Routes included in the XML sitemap */
export const SITEMAP_ROUTES = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  {
    path: "/tools/qr-code-generator",
    changeFrequency: "weekly" as const,
    priority: 0.95,
  },
  {
    path: "/tools/password-generator",
    changeFrequency: "weekly" as const,
    priority: 0.95,
  },
  {
    path: "/tools/unit-converter",
    changeFrequency: "weekly" as const,
    priority: 0.95,
  },
  {
    path: "/tools/batch-image-compressor",
    changeFrequency: "weekly" as const,
    priority: 0.95,
  },
  {
    path: "/tools/colour-screen-pixel-tester",
    changeFrequency: "weekly" as const,
    priority: 0.95,
  },
  { path: "/faq", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
] as const;
