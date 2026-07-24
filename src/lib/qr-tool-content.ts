import type { FaqItem } from "@/types";

/** Content for the QR Code Generator tool page (not the platform homepage). */

export const QR_TOOL_HOW_TO = [
  {
    title: "Choose a content type",
    description: "Pick URL, Text, or Wi‑Fi depending on what you want to share.",
  },
  {
    title: "Enter your details",
    description:
      "Add a website link, a short message, or your network name and password.",
  },
  {
    title: "Preview and download",
    description:
      "Check the live preview, choose a style and size, then download PNG or SVG.",
  },
] as const;

export const QR_TOOL_USE_CASES = [
  {
    title: "Share a website or menu",
    description:
      "Put a link behind a scan for flyers, packaging, slides, or table tents.",
  },
  {
    title: "Pass along a short note",
    description:
      "Encode plain text when you need a quick message without a full webpage.",
  },
  {
    title: "Help guests join Wi‑Fi",
    description:
      "Create a Wi‑Fi code so visitors can connect without typing the password.",
  },
] as const;

export const QR_TOOL_FAQ: FaqItem[] = [
  {
    question: "Is this QR code generator free?",
    answer:
      "Yes. You can create QR codes for URLs, text, and Wi‑Fi, preview them live, copy the image, and download PNG or SVG files without paying or creating an account.",
    showFreeBadge: true,
  },
  {
    question: "How do I create a QR code?",
    answer:
      "Choose URL, Text, or Wi‑Fi, enter your details, and wait for the live preview. Then copy the image or download a PNG or SVG in the size you need.",
  },
  {
    question: "Can I make a Wi‑Fi QR code?",
    answer:
      "Yes. Open the Wi‑Fi tab, enter the network name and password, pick the security type, and download the code. Guests can scan it on most phones to join your network.",
  },
  {
    question: "Will my QR code have a watermark?",
    answer:
      "No. Downloads do not add a watermark or third-party branding to your file.",
    showFreeBadge: true,
  },
  {
    question: "Is my content private when I generate a QR code?",
    answer:
      "QR codes are generated in your browser. We do not upload your URL, text, or Wi‑Fi details to our servers to create the code. See our Privacy Policy for full details.",
  },
  {
    question: "What file formats can I download?",
    answer:
      "You can download PNG files at Standard (512px), Large (1024px), or Print HD (2048px), plus SVG for scalable printing and design tools. You can also copy the PNG to your clipboard.",
  },
];
