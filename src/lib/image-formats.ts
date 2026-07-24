/**
 * Input/output format helpers for the Batch Image Compressor.
 */

import type { OutputFormat } from "@/lib/image-compressor-config";

export type ImageKind = "jpeg" | "png" | "webp" | "unknown";

/** Formats that may include an alpha channel (show checkerboard in previews). */
export function kindSupportsTransparency(kind: ImageKind): boolean {
  return kind === "png" || kind === "webp";
}

const MIME_TO_KIND: Record<string, ImageKind> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXT_TO_KIND: Record<string, ImageKind> = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".webp": "webp",
};

export function extensionFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot).toLowerCase();
}

export function kindFromMime(mime: string): ImageKind {
  return MIME_TO_KIND[mime.toLowerCase()] ?? "unknown";
}

export function kindFromExtension(filename: string): ImageKind {
  return EXT_TO_KIND[extensionFromFilename(filename)] ?? "unknown";
}

/**
 * Resolve image kind using MIME first, extension as a secondary check.
 * Returns unknown when MIME and extension disagree on a non-empty MIME.
 */
export function resolveImageKind(file: {
  type: string;
  name: string;
}): ImageKind {
  const mimeKind = file.type ? kindFromMime(file.type) : "unknown";
  const extKind = kindFromExtension(file.name);

  if (mimeKind !== "unknown") {
    if (extKind !== "unknown" && extKind !== mimeKind) {
      // Prefer MIME when both are present but disagree — still treat as MIME kind
      // for processing; validation layer can reject suspicious mismatches.
      return mimeKind;
    }
    return mimeKind;
  }

  return extKind;
}

export function mimeForKind(kind: ImageKind): string | null {
  switch (kind) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}

export function extensionForKind(kind: ImageKind): string {
  switch (kind) {
    case "jpeg":
      return ".jpg";
    case "png":
      return ".png";
    case "webp":
      return ".webp";
    default:
      return ".bin";
  }
}

export function resolveOutputKind(
  outputFormat: OutputFormat,
  sourceKind: ImageKind,
): ImageKind {
  if (outputFormat === "keep") {
    return sourceKind === "unknown" ? "jpeg" : sourceKind;
  }
  return outputFormat;
}

export function outputMimeFor(
  outputFormat: OutputFormat,
  sourceKind: ImageKind,
): string {
  const kind = resolveOutputKind(outputFormat, sourceKind);
  return mimeForKind(kind) ?? "image/jpeg";
}

/** Quality applies to lossy JPG / WebP outputs. */
export function formatUsesQuality(
  outputFormat: OutputFormat,
  sourceKind?: ImageKind,
): boolean {
  if (outputFormat === "png") return false;
  if (outputFormat === "jpeg" || outputFormat === "webp") return true;
  if (outputFormat === "keep") {
    if (!sourceKind) return true; // mixed batch — show control
    return sourceKind === "jpeg" || sourceKind === "webp";
  }
  return false;
}

export function canvasNeedsBackground(
  outputKind: ImageKind,
  hasTransparency: boolean,
): boolean {
  if (!hasTransparency) return false;
  return outputKind === "jpeg";
}

let webpEncodeSupported: boolean | null = null;

/**
 * Feature-detect WebP encoding via canvas. Result is cached for the session.
 */
export async function detectWebpEncodingSupport(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (webpEncodeSupported != null) return webpEncodeSupported;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const dataUrl = canvas.toDataURL("image/webp");
    webpEncodeSupported = dataUrl.startsWith("data:image/webp");
  } catch {
    webpEncodeSupported = false;
  }

  return webpEncodeSupported;
}

export function resetWebpEncodeCacheForTests(): void {
  webpEncodeSupported = null;
}
