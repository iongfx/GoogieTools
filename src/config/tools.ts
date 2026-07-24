/**
 * Central tool directory for Googie Tools.
 * Homepage cards and navigation should read from this list.
 */

export type ToolStatus = "available" | "coming-soon";

export type ToolCategory =
  | "Generators"
  | "Converters"
  | "Images"
  | "Documents"
  | "Calculators";

/**
 * Shared Googie tool-icon map.
 * Add a new id here, then implement the SVG in `ToolIcon`.
 */
export type ToolIconName =
  | "qr-code"
  | "password"
  | "unit-converter"
  | "image-compressor"
  | "colour-screen"
  | "invoice"
  | "mortgage";

export type ToolDefinition = {
  name: string;
  slug: string;
  shortDescription: string;
  category: ToolCategory;
  icon: ToolIconName;
  status: ToolStatus;
  href: string;
  featured: boolean;
  browserBased: boolean;
  keywords: readonly string[];
};

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: "QR Code Generator",
    slug: "qr-code-generator",
    shortDescription:
      "Create downloadable QR codes for websites, text, and Wi‑Fi details.",
    category: "Generators",
    icon: "qr-code",
    status: "available",
    href: "/tools/qr-code-generator",
    featured: true,
    browserBased: true,
    keywords: [
      "free QR code generator",
      "QR code generator",
      "WiFi QR code generator",
      "create QR code online",
      "download QR code PNG SVG",
    ],
  },
  {
    name: "Password Generator",
    slug: "password-generator",
    shortDescription: "Create strong, random passwords in your browser.",
    category: "Generators",
    icon: "password",
    status: "available",
    href: "/tools/password-generator",
    featured: true,
    browserBased: true,
    keywords: [
      "free password generator",
      "password generator",
      "strong password generator",
      "random password generator",
      "secure password generator",
    ],
  },
  {
    name: "Unit Converter",
    slug: "unit-converter",
    shortDescription: "Convert everyday units quickly and clearly.",
    category: "Converters",
    icon: "unit-converter",
    status: "available",
    href: "/tools/unit-converter",
    featured: true,
    browserBased: true,
    keywords: [
      "free unit converter",
      "unit converter",
      "measurement converter",
      "length converter",
      "temperature converter",
      "weight converter",
    ],
  },
  {
    name: "Batch Image Compressor",
    slug: "batch-image-compressor",
    shortDescription:
      "Resize, crop, and compress multiple images for websites, galleries, social media, or email.",
    category: "Images",
    icon: "image-compressor",
    status: "available",
    href: "/tools/batch-image-compressor",
    featured: true,
    browserBased: true,
    keywords: [
      "free batch image compressor",
      "batch image compressor",
      "image resizer",
      "crop images to exact size",
      "compress photos for email",
      "gallery image resizer",
      "compress images online",
    ],
  },
  {
    name: "Colour Screen & Pixel Tester",
    slug: "colour-screen-pixel-tester",
    shortDescription:
      "Fill your screen with custom colours, inspect pixels, create chroma-key backgrounds, and sample colours from images or your display.",
    category: "Images",
    icon: "colour-screen",
    status: "available",
    href: "/tools/colour-screen-pixel-tester",
    featured: true,
    browserBased: true,
    keywords: [
      "free colour screen tester",
      "dead pixel tester",
      "stuck pixel test",
      "fullscreen colour test",
      "chroma key background",
      "colour picker from image",
      "RGB screen test",
    ],
  },
  {
    name: "Invoice Generator",
    slug: "invoice-generator",
    shortDescription: "Build clean invoices for freelancers and small teams.",
    category: "Documents",
    icon: "invoice",
    status: "coming-soon",
    href: "/tools/invoice-generator",
    featured: false,
    browserBased: true,
    keywords: ["invoice generator", "create invoice"],
  },
  {
    name: "Mortgage Calculator",
    slug: "mortgage-calculator",
    shortDescription: "Estimate monthly payments with a simple calculator.",
    category: "Calculators",
    icon: "mortgage",
    status: "coming-soon",
    href: "/tools/mortgage-calculator",
    featured: false,
    browserBased: true,
    keywords: ["mortgage calculator", "loan payment calculator"],
  },
] as const;

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

export function getAvailableTools(): ToolDefinition[] {
  return TOOLS.filter((tool) => tool.status === "available");
}

export function getFeaturedTools(limit = 7): ToolDefinition[] {
  const featured = TOOLS.filter((tool) => tool.featured);
  const rest = TOOLS.filter((tool) => !tool.featured);
  return [...featured, ...rest].slice(0, limit);
}

export const QR_TOOL = getToolBySlug("qr-code-generator")!;
export const PASSWORD_TOOL = getToolBySlug("password-generator")!;
export const UNIT_TOOL = getToolBySlug("unit-converter")!;
export const IMAGE_TOOL = getToolBySlug("batch-image-compressor")!;
export const COLOUR_TOOL = getToolBySlug("colour-screen-pixel-tester")!;
