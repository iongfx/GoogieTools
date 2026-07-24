/**
 * Safe image URL validation for the Colour Screen image picker.
 * Browser-only fetch — no server proxy.
 */

export type ImageUrlValidation =
  | { ok: true; url: string }
  | { ok: false; message: string };

const BLOCKED_SCHEMES = new Set([
  "javascript:",
  "data:",
  "file:",
  "blob:",
  "vbscript:",
  "about:",
]);

/**
 * Validate a user-supplied image URL for client-side loading.
 * Prefers https; allows http for local testing but warns via message only when invalid.
 */
export function validateImageUrl(raw: string): ImageUrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter an image URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      message: "That does not look like a valid URL. Include https:// at the start.",
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_SCHEMES.has(protocol)) {
    return {
      ok: false,
      message: "Only http and https image URLs are allowed.",
    };
  }

  if (protocol !== "https:" && protocol !== "http:") {
    return {
      ok: false,
      message: "Only http and https image URLs are allowed.",
    };
  }

  return { ok: true, url: parsed.href };
}

export type ImageFileCheck = {
  ok: true;
} | {
  ok: false;
  message: string;
};

const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx).toLowerCase();
}

/**
 * Validate an uploaded or pasted image file (same spirit as Batch Image Compressor).
 */
export function validateColourPickerImageFile(file: {
  name: string;
  type: string;
  size: number;
}): ImageFileCheck {
  const mime = (file.type || "").toLowerCase();
  const ext = extensionOf(file.name);

  if (mime === "image/svg+xml" || ext === ".svg") {
    return {
      ok: false,
      message: "SVG files are not supported. Use JPG, PNG, or WebP.",
    };
  }

  if (mime === "image/gif" || ext === ".gif") {
    return {
      ok: false,
      message: "GIF files are not supported. Use JPG, PNG, or WebP.",
    };
  }

  const mimeOk = mime ? SUPPORTED_MIME.has(mime) : false;
  const extOk = ext ? SUPPORTED_EXT.has(ext) : false;

  if (!mimeOk && !extOk) {
    return {
      ok: false,
      message: "Unsupported image type. Use JPG, PNG, or WebP.",
    };
  }

  if (file.size <= 0) {
    return { ok: false, message: "That file looks empty or corrupt." };
  }

  return { ok: true };
}
