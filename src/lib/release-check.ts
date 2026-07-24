/**
 * Release-readiness helpers for Googie Tools 1.0.
 * Used by automated checks — keep in sync with real App Router pages.
 */

import { PRODUCTION_SITE_URL } from "@/config/brand";
import { getAvailableTools, TOOLS } from "@/config/tools";
import {
  FOOTER_LINKS,
  NAV_LINKS,
  SITEMAP_ROUTES,
} from "@/lib/constants";

/** Every public HTML page that must exist at launch (sitemap order). */
export const EXPECTED_PUBLIC_ROUTES = [
  "/",
  "/tools/qr-code-generator",
  "/tools/password-generator",
  "/tools/unit-converter",
  "/tools/batch-image-compressor",
  "/tools/colour-screen-pixel-tester",
  "/faq",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
] as const;

/** Approved homepage / directory order for Googie Tools 1.0. */
export const APPROVED_LAUNCH_TOOL_SLUGS = [
  "qr-code-generator",
  "password-generator",
  "unit-converter",
  "batch-image-compressor",
  "colour-screen-pixel-tester",
  "invoice-generator",
  "mortgage-calculator",
] as const;

const LOCAL_HOST_PATTERN = /localhost|127\.0\.0\.1/i;

function normalizePath(href: string): string | null {
  if (!href || href === "#") return null;
  if (href.startsWith("mailto:") || href.startsWith("http")) return href;
  const path = href.split("#")[0] || "/";
  return path === "" ? "/" : path;
}

/** Collect internal paths from known navigation sources. */
export function collectInternalNavPaths(): string[] {
  const paths = new Set<string>();

  for (const link of [...NAV_LINKS, ...FOOTER_LINKS]) {
    const path = normalizePath(link.href);
    if (path && path.startsWith("/")) paths.add(path);
  }

  for (const tool of getAvailableTools()) {
    paths.add(tool.href);
  }

  for (const route of SITEMAP_ROUTES) {
    paths.add(route.path === "" ? "/" : route.path);
  }

  return [...paths].sort();
}

export type ReleaseLinkIssue = {
  code: string;
  message: string;
};

/**
 * Static release checks for routes, tool order, and production URL hygiene.
 * Does not crawl the live network.
 */
export function runReleaseLinkChecks(options?: {
  siteUrl?: string;
}): ReleaseLinkIssue[] {
  const issues: ReleaseLinkIssue[] = [];
  const siteUrl = options?.siteUrl ?? PRODUCTION_SITE_URL;
  const expected = new Set<string>(EXPECTED_PUBLIC_ROUTES);

  if (LOCAL_HOST_PATTERN.test(siteUrl)) {
    issues.push({
      code: "site-url-local",
      message: `Production site URL must not be local (${siteUrl}).`,
    });
  }

  if (!siteUrl.startsWith("https://")) {
    issues.push({
      code: "site-url-https",
      message: `Production site URL should use https (${siteUrl}).`,
    });
  }

  if (siteUrl.replace(/\/$/, "") !== PRODUCTION_SITE_URL) {
    issues.push({
      code: "site-url-mismatch",
      message: `Expected canonical origin ${PRODUCTION_SITE_URL}, got ${siteUrl}.`,
    });
  }

  const actualSlugs = TOOLS.map((tool) => tool.slug);
  if (actualSlugs.join() !== APPROVED_LAUNCH_TOOL_SLUGS.join()) {
    issues.push({
      code: "tool-order",
      message: `Tool directory order differs from approved launch order. Got: ${actualSlugs.join(", ")}`,
    });
  }

  const comingSoon = TOOLS.filter((tool) => tool.status === "coming-soon");
  for (const tool of comingSoon) {
    if (tool.featured) {
      issues.push({
        code: "coming-soon-featured",
        message: `${tool.name} is coming soon but marked featured.`,
      });
    }
  }

  const availableHrefs = new Set(getAvailableTools().map((tool) => tool.href));
  for (const route of SITEMAP_ROUTES) {
    const path = route.path === "" ? "/" : route.path;
    if (path.startsWith("/tools/") && !availableHrefs.has(path)) {
      issues.push({
        code: "sitemap-coming-soon",
        message: `Sitemap includes tool route that is not available: ${path}`,
      });
    }
    if (!expected.has(path)) {
      issues.push({
        code: "sitemap-unknown",
        message: `Sitemap includes unexpected route: ${path}`,
      });
    }
  }

  for (const path of EXPECTED_PUBLIC_ROUTES) {
    const inSitemap = SITEMAP_ROUTES.some(
      (route) => (route.path === "" ? "/" : route.path) === path,
    );
    if (!inSitemap) {
      issues.push({
        code: "sitemap-missing",
        message: `Expected public route missing from sitemap: ${path}`,
      });
    }
  }

  for (const path of collectInternalNavPaths()) {
    if (!path.startsWith("/")) continue;
    if (LOCAL_HOST_PATTERN.test(path)) {
      issues.push({
        code: "nav-localhost",
        message: `Navigation contains a local path: ${path}`,
      });
      continue;
    }
    if (!expected.has(path)) {
      issues.push({
        code: "nav-unknown",
        message: `Navigation links to an unknown internal path: ${path}`,
      });
    }
  }

  for (const tool of getAvailableTools()) {
    if (!expected.has(tool.href)) {
      issues.push({
        code: "tool-route-missing",
        message: `Available tool has no expected public route: ${tool.href}`,
      });
    }
  }

  return issues;
}
