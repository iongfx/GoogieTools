import type { MetadataRoute } from "next";
import { SITE_URL, SITEMAP_ROUTES } from "@/lib/constants";
import { LEGAL_LAST_UPDATED_ISO } from "@/lib/legal";

/**
 * Generates /sitemap.xml for search engines.
 * Lists every important public page with priority hints.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(LEGAL_LAST_UPDATED_ISO);

  return SITEMAP_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
