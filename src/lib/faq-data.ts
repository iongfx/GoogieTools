import type { FaqItem } from "@/types";

/**
 * Shared FAQ content used on the FAQ page and in FAQPage JSON-LD schema.
 * Keep answers factual and aligned with the live product.
 */
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Googie Tools?",
    answer:
      "Googie Tools is a collection of simple, friendly online utilities. Available tools include a free QR code generator for website URLs, plain text, and Wi‑Fi networks, a free password generator, a free unit converter, a free batch image compressor, and a free colour screen & pixel tester.",
  },
  {
    question: "Do I need an account to generate a QR code?",
    answer:
      "No. The QR Code Generator works without sign-up. Open the tool, enter your content, and download your QR code immediately.",
  },
  {
    question: "Is the QR code generator free?",
    answer:
      "Yes. Core QR generation, live preview, colour styles, clipboard copy, and PNG/SVG downloads are free to use.",
    showFreeBadge: true,
  },
  {
    question: "Is the password generator free?",
    answer:
      "Yes. You can create strong, random passwords with custom length and character options without paying or creating an account. Generation happens in your browser.",
    showFreeBadge: true,
  },
  {
    question: "Is the unit converter free?",
    answer:
      "Yes. You can convert length, weight, temperature, volume, area, and speed units without paying or creating an account. Conversions happen in your browser.",
    showFreeBadge: true,
  },
  {
    question: "Is the batch image compressor free?",
    answer:
      "Yes. You can resize, crop, convert, and compress batches of images without paying or creating an account. Processing happens in your browser on your device.",
    showFreeBadge: true,
  },
  {
    question: "Is the colour screen & pixel tester free?",
    answer:
      "Yes. You can run fullscreen colour tests, inspect pixels, cycle display colours, and sample HEX, RGB, HSL, HSV, and CMYK values without paying or creating an account. Everything runs in your browser.",
    showFreeBadge: true,
  },
  {
    question: "Will my QR code have a watermark?",
    answer:
      "No. Downloads do not add a watermark or third-party branding to your file.",
    showFreeBadge: true,
  },
  {
    question: "What can I put in a QR code?",
    answer:
      "You can encode a website URL, plain text, or Wi‑Fi network details (SSID, password, and security type). Choose the content type at the top of the generator.",
  },
  {
    question: "Do you store the content I enter?",
    answer:
      "QR codes are created in your browser on your device. We do not upload your URL, text, or Wi‑Fi details to our servers to generate the code. See our Privacy Policy for full details.",
  },
  {
    question: "Can I download a high-resolution QR code?",
    answer:
      "Yes. Download a PNG at Standard (512px), Large (1024px), or Print HD (2048px), or export an SVG for scalable printing and design work.",
  },
  {
    question: "Will this work on my phone?",
    answer:
      "Yes. Googie Tools is built to work on phones, tablets, and desktops in modern browsers.",
  },
];
