/**
 * Central configuration for the Batch Image Compressor.
 * Limits, presets, and defaults live here so UI and validation stay aligned.
 */

export const IMAGE_BATCH_LIMITS = {
  /** Maximum files accepted in one batch. */
  maxFiles: 50,
  /** Maximum size of a single input file (25 MB). */
  maxFileBytes: 25 * 1000 * 1000,
  /** Maximum combined size of all input files (250 MB). */
  maxTotalBytes: 250 * 1000 * 1000,
  /** Maximum decoded source dimensions (browser safety). */
  maxDecodedWidth: 12_000,
  maxDecodedHeight: 12_000,
  /** Maximum allowed output dimensions. */
  maxOutputWidth: 8_000,
  maxOutputHeight: 8_000,
  /** Minimum allowed output dimensions. */
  minOutputDimension: 1,
  /** Warn when either dimension is enlarged beyond this factor. */
  enlargeWarnFactor: 1.5,
  /** Process one image at a time to protect browser memory. */
  concurrency: 1,
} as const;

/**
 * Fixed preview frame for “Keep original dimensions”.
 * Matches Email-friendly (1600×1600) so the window size stays stable while
 * each image is letterboxed inside (actual export still keeps source pixels).
 */
export const KEEP_ORIGINAL_PREVIEW_SIZE = {
  width: 1600,
  height: 1600,
} as const;

/** Manual crop / zoom limits for the interactive Fill-and-crop editor. */
export const IMAGE_CROP_LIMITS = {
  /** 1 = minimum cover scale (frame fully filled, no empty space). */
  minZoom: 1,
  /** Relative to minimum cover scale (400%). */
  maxZoom: 4,
  zoomStep: 0.05,
  /** Mouse-wheel zoom step over the preview frame. */
  wheelZoomStep: 0.08,
  /** Normalized pan nudges when using arrow keys. */
  keyboardPanStep: 0.02,
  keyboardPanStepLarge: 0.08,
  keyboardZoomStep: 0.1,
  /** Aspect ratios closer than this are treated as identical. */
  aspectRatioEpsilon: 0.001,
} as const;

export const IMAGE_QUALITY = {
  min: 40,
  max: 100,
  default: 82,
} as const;

export type FitMode = "fill-crop" | "fit-inside" | "stretch" | "resize-only";

export type CropFocus =
  | "centre"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type OutputFormat = "keep" | "jpeg" | "png" | "webp";

export type FitInsideBackground =
  | "white"
  | "black"
  | "transparent"
  | "custom";

export type PresetId =
  | "keep-original"
  | "email-friendly"
  | "gallery-landscape"
  | "square-thumbnail"
  | "portrait-headshot"
  | "social-landscape"
  | "social-portrait"
  | "custom";

export type ImageCompressorSettings = {
  presetId: PresetId;
  width: number | null;
  height: number | null;
  fitMode: FitMode;
  cropFocus: CropFocus;
  allowEnlarge: boolean;
  outputFormat: OutputFormat;
  quality: number;
  fitInsideBackground: FitInsideBackground;
  customBackground: string;
  /** When true with Fit inside, pad to exact width × height. */
  exactDimensions: boolean;
  /** Optional prefix for download / ZIP names (empty = none). */
  filenamePrefix: string;
  /** When true, append -WIDTHxHEIGHT (default on). */
  includeResolutionInFilename: boolean;
};

export type PresetDefinition = {
  id: PresetId;
  label: string;
  description: string;
  settings: Omit<
    ImageCompressorSettings,
    | "presetId"
    | "customBackground"
    | "filenamePrefix"
    | "includeResolutionInFilename"
  >;
};

export const FIT_MODE_OPTIONS: ReadonlyArray<{
  value: FitMode;
  label: string;
  description: string;
}> = [
  {
    value: "fill-crop",
    label: "Fill and crop (manual)",
    description:
      "Scale until the frame is filled, then crop overflow (like CSS object-fit: cover).",
  },
  {
    value: "fit-inside",
    label: "Fit inside",
    description:
      "Fit the whole image inside the frame without cropping (like CSS object-fit: contain).",
  },
  {
    value: "stretch",
    label: "Stretch",
    description: "Force exact width and height. Stretching may distort the image.",
  },
  {
    value: "resize-only",
    label: "Resize only",
    description:
      "Resize within the maximum width and height while preserving aspect ratio. Never crops.",
  },
] as const;

export const CROP_FOCUS_OPTIONS: ReadonlyArray<{
  value: CropFocus;
  label: string;
}> = [
  { value: "centre", label: "Centre" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
] as const;

export const OUTPUT_FORMAT_OPTIONS: ReadonlyArray<{
  value: OutputFormat;
  label: string;
}> = [
  { value: "keep", label: "Keep original format" },
  { value: "jpeg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
] as const;

export const BACKGROUND_OPTIONS: ReadonlyArray<{
  value: FitInsideBackground;
  label: string;
}> = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "transparent", label: "Transparent" },
  { value: "custom", label: "Custom colour" },
] as const;

const PRESET_BASE = {
  customBackground: "#ffffff",
} as const;

/** Shared defaults for download naming (not part of size presets). */
export const FILENAME_NAMING_DEFAULTS = {
  filenamePrefix: "",
  includeResolutionInFilename: true,
};

export const IMAGE_PRESETS: readonly PresetDefinition[] = [
  {
    id: "keep-original",
    label: "Keep original dimensions",
    description: "No resize or crop — compression and format conversion only.",
    settings: {
      width: null,
      height: null,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: false,
      outputFormat: "keep",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: false,
    },
  },
  {
    id: "email-friendly",
    label: "Email-friendly",
    description:
      "1600 × 1600 output. Use the preview to zoom and position each photo.",
    settings: {
      width: 1600,
      height: 1600,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: false,
      outputFormat: "jpeg",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: true,
    },
  },
  {
    id: "gallery-landscape",
    label: "Gallery landscape",
    description: "450 × 300 for consistent gallery tiles.",
    settings: {
      width: 450,
      height: 300,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: true,
      outputFormat: "jpeg",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: true,
    },
  },
  {
    id: "square-thumbnail",
    label: "Square thumbnail",
    description: "600 × 600 centred thumbnails.",
    settings: {
      width: 600,
      height: 600,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: true,
      outputFormat: "jpeg",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: true,
    },
  },
  {
    id: "portrait-headshot",
    label: "Portrait headshot",
    description: "600 × 800 for portrait photos and headshots.",
    settings: {
      width: 600,
      height: 800,
      fitMode: "fill-crop",
      cropFocus: "top",
      allowEnlarge: true,
      outputFormat: "jpeg",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: true,
    },
  },
  {
    id: "social-landscape",
    label: "Social landscape",
    description: "1200 × 630 for social link previews.",
    settings: {
      width: 1200,
      height: 630,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: true,
      outputFormat: "jpeg",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: true,
    },
  },
  {
    id: "social-portrait",
    label: "Social portrait",
    description: "1080 × 1920 for vertical social posts and stories.",
    settings: {
      width: 1080,
      height: 1920,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: true,
      outputFormat: "jpeg",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: true,
    },
  },
  {
    id: "custom",
    label: "Custom",
    description: "Enter your own width, height, and processing options.",
    settings: {
      width: 1200,
      height: 800,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: false,
      outputFormat: "jpeg",
      quality: IMAGE_QUALITY.default,
      fitInsideBackground: "white",
      exactDimensions: true,
    },
  },
] as const;

/** Dropdown label including pixel size where the preset has fixed dimensions. */
export function presetOptionLabel(preset: PresetDefinition): string {
  const { width, height } = preset.settings;
  if (preset.id === "keep-original" || width == null || height == null) {
    return preset.label;
  }
  if (preset.id === "custom") {
    return preset.label;
  }
  return `${preset.label} (${width} × ${height})`;
}

export const DEFAULT_IMAGE_SETTINGS: ImageCompressorSettings = {
  presetId: "square-thumbnail",
  ...IMAGE_PRESETS.find((p) => p.id === "square-thumbnail")!.settings,
  ...PRESET_BASE,
  ...FILENAME_NAMING_DEFAULTS,
};

export function getPresetById(id: PresetId): PresetDefinition {
  const preset = IMAGE_PRESETS.find((item) => item.id === id);
  if (!preset) {
    return IMAGE_PRESETS.find((item) => item.id === "custom")!;
  }
  return preset;
}

/** Apply a preset’s visible settings (no hidden rules). */
export function settingsFromPreset(id: PresetId): ImageCompressorSettings {
  const preset = getPresetById(id);
  return {
    presetId: id,
    ...preset.settings,
    customBackground: "#ffffff",
    ...FILENAME_NAMING_DEFAULTS,
  };
}

/**
 * If the user edits values away from the active preset, switch indicator to Custom.
 * Keep-original stays selected for compress-only tweaks (quality / format);
 * it only becomes Custom if output dimensions are introduced.
 */
export function resolvePresetAfterEdit(
  current: ImageCompressorSettings,
  patch: Partial<ImageCompressorSettings>,
): ImageCompressorSettings {
  const next: ImageCompressorSettings = { ...current, ...patch };

  if (next.presetId === "custom") {
    return next;
  }

  if (next.presetId === "keep-original") {
    if (next.width == null && next.height == null) {
      return next;
    }
    return { ...next, presetId: "custom" };
  }

  const preset = getPresetById(next.presetId);
  const matches =
    next.width === preset.settings.width &&
    next.height === preset.settings.height &&
    next.fitMode === preset.settings.fitMode &&
    next.cropFocus === preset.settings.cropFocus &&
    next.allowEnlarge === preset.settings.allowEnlarge &&
    next.outputFormat === preset.settings.outputFormat &&
    next.quality === preset.settings.quality &&
    next.fitInsideBackground === preset.settings.fitInsideBackground &&
    next.exactDimensions === preset.settings.exactDimensions;

  if (!matches) {
    return { ...next, presetId: "custom" };
  }

  return next;
}

export function qualityGuidanceLabel(quality: number): string {
  if (quality <= 55) return "Smaller file";
  if (quality <= 85) return "Balanced";
  return "Higher quality";
}

export const SUPPORTED_INPUT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const SUPPORTED_INPUT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const REJECTED_INPUT_MIME_TYPES = [
  "image/svg+xml",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/tiff",
] as const;

export const UNSUPPORTED_FILE_MESSAGE =
  "This file type is not supported yet. Please choose a JPG, PNG, or WebP image.";

export const ANIMATED_WEBP_MESSAGE =
  "Animated WebP files are not supported because canvas processing would discard the animation. Please use a still JPG, PNG, or WebP image.";

export const GIF_REJECT_MESSAGE =
  "GIF files are not supported because canvas processing would discard animation. Please choose a JPG, PNG, or WebP image.";

export const SVG_REJECT_MESSAGE =
  "SVG files are not accepted in this tool. Please choose a JPG, PNG, or WebP image.";

export const ZIP_FILENAME = "googie-tools-images.zip";
