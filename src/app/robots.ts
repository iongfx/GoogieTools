import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * Generates /robots.txt for crawlers.
 * Points Google (and others) at the XML sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
