import { QR_TOOL } from "@/config/tools";
import { FAQ_ITEMS } from "@/lib/faq-data";
import {
  SITE_DESCRIPTION,
  SITE_EMAIL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/constants";

/**
 * JSON-LD helpers for rich results in Google Search.
 * These describe the site and tool in a machine-readable way.
 */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    email: SITE_EMAIL,
    logo: `${SITE_URL}/favicon.svg`,
    description: SITE_DESCRIPTION,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: "en-US",
  };
}

type WebApplicationSchemaOptions = {
  name: string;
  path: string;
  description: string;
  featureList: readonly string[];
};

const QR_WEB_APPLICATION: WebApplicationSchemaOptions = {
  name: "Free QR Code Generator",
  path: QR_TOOL.href,
  description:
    "Create downloadable QR codes for websites, text, and Wi‑Fi details directly in your browser.",
  featureList: [
    "URL QR codes",
    "Text QR codes",
    "Wi-Fi QR codes",
    "Live preview",
    "Colour style presets",
    "PNG download",
    "SVG download",
    "Copy image to clipboard",
    "No account required",
    "No watermark",
    "Client-side generation",
  ],
};

/** Describes a free Googie Tools web app (defaults to the QR generator). */
export function webApplicationSchema(
  options: WebApplicationSchemaOptions = QR_WEB_APPLICATION,
) {
  const toolUrl = `${SITE_URL}${options.path}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: options.name,
    url: toolUrl,
    description: options.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. HTML5.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [...options.featureList],
    screenshot: `${SITE_URL}/opengraph-image`,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    isAccessibleForFree: true,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/** FAQ rich-result schema */
export function faqPageSchema(items = FAQ_ITEMS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.showFreeBadge
          ? `${item.answer} 100% Free.`
          : item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(
  crumbs: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.path.startsWith("http")
        ? crumb.path
        : `${SITE_URL}${crumb.path}`,
    })),
  };
}
