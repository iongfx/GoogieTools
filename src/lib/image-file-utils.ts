/**
 * File validation, naming, and size helpers for the Batch Image Compressor.
 * Pure utilities — no canvas / DOM dependency except optional File shape.
 */

import {
  ANIMATED_WEBP_MESSAGE,
  GIF_REJECT_MESSAGE,
  IMAGE_BATCH_LIMITS,
  IMAGE_QUALITY,
  SVG_REJECT_MESSAGE,
  SUPPORTED_INPUT_EXTENSIONS,
  SUPPORTED_INPUT_MIME_TYPES,
  UNSUPPORTED_FILE_MESSAGE,
  type ImageCompressorSettings,
} from "@/lib/image-compressor-config";
import {
  extensionForKind,
  extensionFromFilename,
  kindFromExtension,
  kindFromMime,
  resolveImageKind,
  resolveOutputKind,
  type ImageKind,
} from "@/lib/image-formats";

export type FileLike = {
  name: string;
  type: string;
  size: number;
};

export type FileValidationOk = {
  ok: true;
  kind: ImageKind;
};

export type FileValidationError = {
  ok: false;
  message: string;
};

export type FileValidationResult = FileValidationOk | FileValidationError;

function isSupportedMime(mime: string): boolean {
  const normalized = mime.toLowerCase();
  return (SUPPORTED_INPUT_MIME_TYPES as readonly string[]).includes(normalized);
}

function isSupportedExtension(filename: string): boolean {
  const ext = extensionFromFilename(filename);
  return (SUPPORTED_INPUT_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Validate a single input file using MIME (primary) and extension (secondary).
 */
export function validateImageFile(file: FileLike): FileValidationResult {
  const mime = (file.type || "").toLowerCase();
  const ext = extensionFromFilename(file.name);
  const mimeKind = mime ? kindFromMime(mime) : "unknown";
  const extKind = kindFromExtension(file.name);

  if (mime === "image/svg+xml" || ext === ".svg") {
    return { ok: false, message: SVG_REJECT_MESSAGE };
  }

  if (mime === "image/gif" || ext === ".gif") {
    return { ok: false, message: GIF_REJECT_MESSAGE };
  }

  if (
    mime.startsWith("image/") &&
    !isSupportedMime(mime) &&
    mimeKind === "unknown"
  ) {
    return { ok: false, message: UNSUPPORTED_FILE_MESSAGE };
  }

  if (!mime && !isSupportedExtension(file.name)) {
    return { ok: false, message: UNSUPPORTED_FILE_MESSAGE };
  }

  if (mime && !isSupportedMime(mime) && !isSupportedExtension(file.name)) {
    return { ok: false, message: UNSUPPORTED_FILE_MESSAGE };
  }

  // MIME claims unsupported while extension looks fine — reject.
  if (mime && !isSupportedMime(mime) && mimeKind === "unknown") {
    return { ok: false, message: UNSUPPORTED_FILE_MESSAGE };
  }

  // Extension unsupported and MIME empty/unknown.
  if (!isSupportedExtension(file.name) && mimeKind === "unknown") {
    return { ok: false, message: UNSUPPORTED_FILE_MESSAGE };
  }

  // Prefer supported MIME; allow empty MIME with supported extension.
  if (mime && isSupportedMime(mime)) {
    return { ok: true, kind: mimeKind === "unknown" ? extKind : mimeKind };
  }

  if (!mime && isSupportedExtension(file.name) && extKind !== "unknown") {
    return { ok: true, kind: extKind };
  }

  // MIME missing but extension ok, or MIME ok already handled.
  const kind = resolveImageKind(file);
  if (kind === "unknown") {
    return { ok: false, message: UNSUPPORTED_FILE_MESSAGE };
  }

  return { ok: true, kind };
}

export type BatchAddResult<T extends FileLike = FileLike> = {
  accepted: T[];
  rejected: Array<{ file: T; message: string }>;
};

/**
 * Validate a proposed batch addition against count and size limits.
 * Existing files are counted toward the totals.
 */
export function validateBatchAddition<T extends FileLike>(
  existing: FileLike[],
  incoming: T[],
): BatchAddResult<T> {
  const accepted: T[] = [];
  const rejected: Array<{ file: T; message: string }> = [];

  let totalBytes = existing.reduce((sum, file) => sum + file.size, 0);
  let totalCount = existing.length;

  for (const file of incoming) {
    const typeResult = validateImageFile(file);
    if (!typeResult.ok) {
      rejected.push({ file, message: typeResult.message });
      continue;
    }

    if (file.size > IMAGE_BATCH_LIMITS.maxFileBytes) {
      rejected.push({
        file,
        message: `"${file.name}" is larger than the ${formatFileSize(IMAGE_BATCH_LIMITS.maxFileBytes)} per-file limit.`,
      });
      continue;
    }

    if (totalCount >= IMAGE_BATCH_LIMITS.maxFiles) {
      rejected.push({
        file,
        message: `Batch limit of ${IMAGE_BATCH_LIMITS.maxFiles} files reached. "${file.name}" was not added.`,
      });
      continue;
    }

    if (totalBytes + file.size > IMAGE_BATCH_LIMITS.maxTotalBytes) {
      rejected.push({
        file,
        message: `Adding "${file.name}" would exceed the ${formatFileSize(IMAGE_BATCH_LIMITS.maxTotalBytes)} combined batch limit.`,
      });
      continue;
    }

    accepted.push(file);
    totalBytes += file.size;
    totalCount += 1;
  }

  return { accepted, rejected };
}

export function validateDecodedDimensions(
  width: number,
  height: number,
): string | null {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1
  ) {
    return "This image could not be measured. It may be corrupted.";
  }

  if (
    width > IMAGE_BATCH_LIMITS.maxDecodedWidth ||
    height > IMAGE_BATCH_LIMITS.maxDecodedHeight
  ) {
    return `This image is ${width} × ${height} px, which exceeds the ${IMAGE_BATCH_LIMITS.maxDecodedWidth.toLocaleString()} × ${IMAGE_BATCH_LIMITS.maxDecodedHeight.toLocaleString()} px decode limit.`;
  }

  return null;
}

export type DimensionValidation = {
  ok: boolean;
  widthError: string | null;
  heightError: string | null;
};

/**
 * Validate user-entered output dimensions (positive whole pixels).
 */
export function validateOutputDimensions(
  width: number | null,
  height: number | null,
  options: { required: boolean },
): DimensionValidation {
  const check = (value: number | null, label: string): string | null => {
    if (value == null) {
      return options.required ? `${label} is required.` : null;
    }
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return `${label} must be a whole number.`;
    }
    if (!Number.isInteger(value)) {
      return `${label} must be a whole number of pixels (no decimals).`;
    }
    if (value < IMAGE_BATCH_LIMITS.minOutputDimension) {
      return `${label} must be at least ${IMAGE_BATCH_LIMITS.minOutputDimension} px.`;
    }
    if (value > IMAGE_BATCH_LIMITS.maxOutputWidth) {
      return `${label} cannot exceed ${IMAGE_BATCH_LIMITS.maxOutputWidth.toLocaleString()} px.`;
    }
    return null;
  };

  const widthError = check(width, "Width");
  const heightError = check(height, "Height");

  return {
    ok: !widthError && !heightError,
    widthError,
    heightError,
  };
}

export function validateQuality(quality: number): string | null {
  if (!Number.isFinite(quality) || !Number.isInteger(quality)) {
    return "Quality must be a whole number.";
  }
  if (quality < IMAGE_QUALITY.min || quality > IMAGE_QUALITY.max) {
    return `Quality must be between ${IMAGE_QUALITY.min} and ${IMAGE_QUALITY.max}.`;
  }
  return null;
}

export function settingsAreValid(
  settings: ImageCompressorSettings,
): { ok: true } | { ok: false; message: string } {
  const keepOriginal = settings.presetId === "keep-original";
  const dims = validateOutputDimensions(settings.width, settings.height, {
    required: !keepOriginal,
  });

  if (!dims.ok) {
    return {
      ok: false,
      message: dims.widthError ?? dims.heightError ?? "Invalid dimensions.",
    };
  }

  const qualityError = validateQuality(settings.quality);
  if (qualityError) {
    return { ok: false, message: qualityError };
  }

  return { ok: true };
}

/**
 * Sanitize a filename for download / ZIP entry use.
 * Removes path segments and unsafe characters; keeps it readable.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "image";
  }

  // Prevent hidden path tricks like "....//evil"
  return cleaned.replace(/^\.+/, "").slice(0, 180) || "image";
}

export function stripExtension(filename: string): string {
  const safe = sanitizeFilename(filename);
  const ext = extensionFromFilename(safe);
  if (!ext) return safe;
  return safe.slice(0, -ext.length) || "image";
}

/**
 * Rename only the basename; keep the original file extension unchanged.
 * Empty / invalid basenames fall back to the previous basename.
 */
export function renameBasename(filename: string, nextBaseRaw: string): string {
  const leaf = filename.split(/[/\\]/).pop() ?? filename;
  const dot = leaf.lastIndexOf(".");
  const originalExt = dot > 0 ? leaf.slice(dot) : "";
  const cleaned = nextBaseRaw
    .replace(/[/\\]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .trim()
    .slice(0, 160);
  const base = cleaned || stripExtension(filename);
  return `${base}${originalExt}`;
}

export type OutputFilenameOptions = {
  sourceName: string;
  outputKind: ImageKind;
  width: number;
  height: number;
  /** Kept for callers; resolution uses width × height when included. */
  keepOriginal?: boolean;
  /** Disambiguation suffix for duplicate base names (2, 3, …). */
  duplicateIndex?: number;
  filenamePrefix?: string;
  /** When false, omit -WIDTHxHEIGHT. Defaults to true. */
  includeResolutionInFilename?: boolean;
};

/** Sanitize optional prefix text for download names. */
export function sanitizeFilenamePrefix(raw: string): string {
  const cleaned = raw
    .replace(/[/\\]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/\s+/g, "-")
    .replace(/\.+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim()
    .slice(0, 40);
  return cleaned;
}

/**
 * Build a predictable output filename such as DSC_1042-450x300.jpg
 * Optional prefix and resolution toggle are applied from settings.
 */
export function buildOutputFilename(options: OutputFilenameOptions): string {
  const base = stripExtension(options.sourceName);
  const ext = extensionForKind(options.outputKind);
  const prefix = sanitizeFilenamePrefix(options.filenamePrefix ?? "");
  const includeResolution = options.includeResolutionInFilename !== false;

  const stem = prefix ? `${prefix}-${base}` : base;

  const dup =
    options.duplicateIndex && options.duplicateIndex > 1
      ? `-${options.duplicateIndex}`
      : "";
  const resolution = includeResolution
    ? `-${options.width}x${options.height}`
    : "";

  // Resolution first, then duplicate index: photo-450x300-2.jpg
  return `${stem}${resolution}${dup}${ext}`;
}

/**
 * Ensure ZIP / download names stay unique within a batch.
 */
export function uniquifyFilenames(filenames: string[]): string[] {
  const seen = new Map<string, number>();
  return filenames.map((name) => {
    const safe = sanitizeFilename(name);
    const count = (seen.get(safe.toLowerCase()) ?? 0) + 1;
    seen.set(safe.toLowerCase(), count);
    if (count === 1) return safe;

    const ext = extensionFromFilename(safe);
    const base = stripExtension(safe);
    return `${base}-${count}${ext}`;
  });
}

/**
 * Format byte sizes with decimal units (1 KB = 1000 bytes) for user-facing UI.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1000) return `${Math.round(bytes)} B`;

  const kb = bytes / 1000;
  if (kb < 1000) {
    return `${trimDecimal(kb)} KB`;
  }

  const mb = kb / 1000;
  if (mb < 1000) {
    return `${trimDecimal(mb)} MB`;
  }

  const gb = mb / 1000;
  return `${trimDecimal(gb)} GB`;
}

/**
 * Exact decimal formatting for confirmed processed totals (1 KB = 1000 bytes).
 * Keeps enough precision that the displayed KB matches the summed file bytes.
 */
export function formatExactFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1000) return `${Math.round(bytes)} B`;

  const kb = bytes / 1000;
  if (kb < 1000) {
    return `${Number(kb.toFixed(2))} KB`;
  }

  const mb = kb / 1000;
  if (mb < 1000) {
    return `${Number(mb.toFixed(2))} MB`;
  }

  const gb = mb / 1000;
  return `${Number(gb.toFixed(2))} GB`;
}

function trimDecimal(value: number): string {
  if (value >= 100) return String(Math.round(value));
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export type SizeChangeLabel =
  | { kind: "saved"; percent: number; label: string }
  | { kind: "larger"; percent: number; label: string }
  | { kind: "same"; label: string };

/**
 * percentage saved = ((original - processed) / original) × 100
 */
export function calculateSizeChange(
  originalBytes: number,
  processedBytes: number,
): SizeChangeLabel {
  if (
    !Number.isFinite(originalBytes) ||
    !Number.isFinite(processedBytes) ||
    originalBytes <= 0
  ) {
    return { kind: "same", label: "No meaningful size change" };
  }

  const ratio = (originalBytes - processedBytes) / originalBytes;
  const percent = Math.round(ratio * 1000) / 10; // one decimal

  if (Math.abs(percent) < 0.5) {
    return { kind: "same", label: "No meaningful size change" };
  }

  if (percent > 0) {
    const clamped = Math.min(percent, 100);
    const display = Number.isInteger(clamped)
      ? String(clamped)
      : clamped.toFixed(1);
    return {
      kind: "saved",
      percent: clamped,
      label: `Saved ${display}%`,
    };
  }

  const larger = Math.min(Math.abs(percent), 9999);
  const display = Number.isInteger(larger)
    ? String(larger)
    : larger.toFixed(1);
  return {
    kind: "larger",
    percent: larger,
    label: `${display}% larger`,
  };
}

export function parseDimensionInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  return Number.parseInt(trimmed, 10);
}

/** Heuristic: RIFF....WEBP + ANIM chunk suggests animated WebP. */
export function looksLikeAnimatedWebp(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 16) return false;
  const view = new Uint8Array(bytes);
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...view.slice(start, start + len));

  if (ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WEBP") {
    return false;
  }

  // Scan a limited prefix for ANIM / ANMF chunks.
  const limit = Math.min(view.length, 512 * 1024);
  for (let i = 12; i < limit - 4; i += 1) {
    const tag = ascii(i, 4);
    if (tag === "ANIM" || tag === "ANMF") {
      return true;
    }
  }
  return false;
}

export function animatedWebpMessage(): string {
  return ANIMATED_WEBP_MESSAGE;
}

export function describeOutputKind(
  settings: ImageCompressorSettings,
  sourceKind: ImageKind,
): ImageKind {
  return resolveOutputKind(settings.outputFormat, sourceKind);
}
