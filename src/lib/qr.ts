import QRCode, { type QRCodeErrorCorrectionLevel } from "qrcode";

export type QrRenderOptions = {
  width?: number;
  margin?: number;
  dark?: string;
  light?: string;
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
};

const DEFAULTS = {
  dark: "#0f172a",
  light: "#ffffff",
  margin: 2,
  errorCorrectionLevel: "M" as QRCodeErrorCorrectionLevel,
};

function resolveOptions(options: QrRenderOptions = {}) {
  return {
    width: options.width,
    margin: options.margin ?? DEFAULTS.margin,
    errorCorrectionLevel:
      options.errorCorrectionLevel ?? DEFAULTS.errorCorrectionLevel,
    color: {
      dark: options.dark ?? DEFAULTS.dark,
      light: options.light ?? DEFAULTS.light,
    },
  };
}

/**
 * Creates a PNG data URL for preview or download.
 * Runs entirely in the browser — nothing is sent to a server.
 */
export async function createQrPngDataUrl(
  text: string,
  options: QrRenderOptions = {},
): Promise<string> {
  const resolved = resolveOptions(options);
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: resolved.errorCorrectionLevel,
    margin: resolved.margin,
    width: resolved.width ?? 320,
    color: resolved.color,
  });
}

/**
 * Creates a clean SVG string (no library branding).
 */
export async function createQrSvg(
  text: string,
  options: QrRenderOptions = {},
): Promise<string> {
  const resolved = resolveOptions(options);
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: resolved.errorCorrectionLevel,
    margin: resolved.margin,
    width: resolved.width ?? 512,
    color: resolved.color,
  });
}

/**
 * Triggers a file download in the browser.
 */
export function downloadBlob(filename: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Delay revoke so slower browsers can start the download
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadSvg(filename: string, svg: string) {
  downloadBlob(
    filename,
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
}

/** Copy a PNG data URL to the system clipboard (when the browser allows it). */
export async function copyPngDataUrlToClipboard(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  if (!("clipboard" in navigator) || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard images are not supported in this browser.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}

/** Safe filename stem from a short label */
export function qrFilenameStem(label: string): string {
  const cleaned = label
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `googie-tools-qr-code-${cleaned || "code"}`;
}

export const DOWNLOAD_SIZES = [
  { id: "standard", label: "Standard", width: 512 },
  { id: "large", label: "Large", width: 1024 },
  { id: "print", label: "Print HD", width: 2048 },
] as const;

export type DownloadSizeId = (typeof DOWNLOAD_SIZES)[number]["id"];

export function isDownloadSizeId(value: string): value is DownloadSizeId {
  return DOWNLOAD_SIZES.some((size) => size.id === value);
}

export function getDownloadWidth(id: DownloadSizeId): number {
  return DOWNLOAD_SIZES.find((size) => size.id === id)?.width ?? 1024;
}
