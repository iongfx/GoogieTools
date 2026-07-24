import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/constants";

type BuildMetadataOptions = {
  title: string;
  description?: string;
  path?: string;
  keywords?: readonly string[] | string[];
  noIndex?: boolean;
  /** Use absolute path under the site, e.g. /opengraph-image */
  ogImagePath?: string;
};

function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds consistent page metadata for SEO and social sharing.
 * Includes canonical URLs, Open Graph, and Twitter card tags.
 */
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "",
  keywords = SITE_KEYWORDS,
  noIndex = false,
  ogImagePath = "/opengraph-image",
}: BuildMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const isHome = path === "" || path === "/";
  const fullTitle = isHome
    ? title
    : title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`;
  const imageUrl = absoluteUrl(ogImagePath);

  return {
    title: isHome ? { absolute: fullTitle } : fullTitle,
    description,
    keywords: [...keywords],
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: BRAND.socialSharingName,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${BRAND.primaryTagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    category: "technology",
  };
}
