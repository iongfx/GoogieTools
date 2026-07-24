/**
 * Central limits and defaults for the Colour Screen & Pixel Tester.
 */

import {
  DEFAULT_MARKER_COLOUR,
  getPresetById,
  type ColourPresetId,
} from "@/lib/colour-presets";
import type { RgbColour } from "@/lib/colour-types";

export type MarkerStyle = "outline-ring" | "filled-circle" | "ring-dot" | "crosshair";

export type CycleOrder = "sequential" | "random";

export type CycleDelayPreset =
  | "manual"
  | "1"
  | "2"
  | "3"
  | "5"
  | "10"
  | "custom";

export const MARKER_LIMITS = {
  diameterMin: 8,
  diameterMax: 300,
  diameterDefault: 60,
  diameterStep: 4,
  /** Fixed border width for outline / crosshair styles (not user-editable). */
  strokeWidth: 4,
  opacityMin: 0.15,
  opacityMax: 1,
  opacityDefault: 1,
} as const;

export const CYCLE_LIMITS = {
  /** Minimum auto-cycle delay in seconds. */
  minDelaySeconds: 0.5,
  /** Custom delays below this threshold show a photosensitivity warning. */
  photosensitivityWarnBelowSeconds: 1,
  defaultDelayPreset: "manual" as CycleDelayPreset,
  defaultCustomSeconds: 3,
  defaultAutoSeconds: 3,
} as const;

export const IMAGE_PICKER = {
  acceptMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  acceptExtensions: [".jpg", ".jpeg", ".png", ".webp"] as const,
  loupeGridSize: 11,
  loupeCellPx: 14,
  zoomMin: 1,
  zoomMax: 16,
  zoomStep: 1.25,
  /** Multiplier applied per wheel tick when the preview is focused. */
  wheelZoomFactor: 1.12,
  maxFileBytes: 40 * 1024 * 1024,
} as const;

export type MarkerSettings = {
  enabled: boolean;
  colour: RgbColour;
  diameter: number;
  opacity: number;
  style: MarkerStyle;
  hideSystemCursor: boolean;
  previewInSetup: boolean;
};

export const DEFAULT_MARKER_SETTINGS: MarkerSettings = {
  enabled: false,
  colour: DEFAULT_MARKER_COLOUR,
  diameter: MARKER_LIMITS.diameterDefault,
  opacity: MARKER_LIMITS.opacityDefault,
  style: "filled-circle",
  hideSystemCursor: false,
  previewInSetup: false,
};

export type CycleColourItem = {
  id: string;
  label: string;
  rgb: RgbColour;
  enabled: boolean;
};

export type CycleSettings = {
  items: CycleColourItem[];
  order: CycleOrder;
  delayPreset: CycleDelayPreset;
  customSeconds: number;
  loop: boolean;
  paused: boolean;
};

function cycleItem(
  id: string,
  label: string,
  rgb: RgbColour,
  enabled = true,
): CycleColourItem {
  return { id, label, rgb, enabled };
}

export function createDefaultCycleItems(): CycleColourItem[] {
  const ids: ColourPresetId[] = [
    "black",
    "white",
    "red",
    "green",
    "blue",
  ];
  return ids.map((presetId) => {
    const preset = getPresetById(presetId);
    return cycleItem(preset.id, preset.label, preset.rgb, true);
  });
}

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  items: createDefaultCycleItems(),
  order: "sequential",
  delayPreset: CYCLE_LIMITS.defaultDelayPreset,
  customSeconds: CYCLE_LIMITS.defaultCustomSeconds,
  loop: true,
  paused: false,
};

export const DEFAULT_BACKGROUND_COLOUR = getPresetById("black").rgb;

/** Resolve delay in milliseconds; null means manual only. */
export function resolveCycleDelayMs(settings: CycleSettings): number | null {
  if (settings.delayPreset === "manual") return null;
  if (settings.delayPreset === "custom") {
    const seconds = Math.max(
      CYCLE_LIMITS.minDelaySeconds,
      settings.customSeconds,
    );
    return Math.round(seconds * 1000);
  }
  const seconds = Number(settings.delayPreset);
  if (!Number.isFinite(seconds)) return null;
  return Math.round(Math.max(CYCLE_LIMITS.minDelaySeconds, seconds) * 1000);
}

export function clampMarkerDiameter(value: number): number {
  return Math.min(
    MARKER_LIMITS.diameterMax,
    Math.max(MARKER_LIMITS.diameterMin, Math.round(value)),
  );
}

export function clampMarkerOpacity(value: number): number {
  return Math.min(
    MARKER_LIMITS.opacityMax,
    Math.max(MARKER_LIMITS.opacityMin, value),
  );
}

export type PixelWorkflowId =
  | "rgb-pixel"
  | "subpixel"
  | "backlight"
  | "uniformity"
  | "chroma-key";

export type PixelWorkflow = {
  id: PixelWorkflowId;
  label: string;
  description: string;
  backgroundSequence: ColourPresetId[];
  markerEnabled?: boolean;
  markerQuickColours?: ColourPresetId[];
  hideSystemCursor?: boolean;
};

export const PIXEL_WORKFLOWS: readonly PixelWorkflow[] = [
  {
    id: "rgb-pixel",
    label: "RGB pixel test",
    description:
      "Cycle black, white, red, green, and blue for stuck-pixel checks.",
    backgroundSequence: ["black", "white", "red", "green", "blue"],
  },
  {
    id: "subpixel",
    label: "Subpixel inspection",
    description: "Black background with red, green, blue, and white marker colours.",
    backgroundSequence: ["black"],
    markerEnabled: true,
    markerQuickColours: ["red", "green", "blue", "white"],
  },
  {
    id: "backlight",
    label: "Backlight and bleed",
    description: "Black, dark grey, and white to inspect backlight bleed.",
    backgroundSequence: ["black", "grey-25", "white"],
  },
  {
    id: "uniformity",
    label: "Display uniformity",
    description: "White through greys to black for brightness uniformity.",
    backgroundSequence: ["white", "grey-75", "grey-50", "grey-25", "black"],
  },
  {
    id: "chroma-key",
    label: "Chroma key",
    description: "Practical chroma green or blue fullscreen backgrounds.",
    backgroundSequence: ["chroma-green", "chroma-blue"],
    markerEnabled: false,
    hideSystemCursor: true,
  },
] as const;

export const CMYK_HELPER_COPY =
  "Displays use RGB light. CMYK values are converted to an approximate screen colour and may not match printed output.";

export const PHOTOSENSITIVITY_WARNING =
  "Rapid colour changes may be uncomfortable for some people. Use slower intervals for display inspection.";

export const CHROMA_KEY_NOTE =
  "A display can provide a quick colour background, but reflections, brightness, viewing angle, and screen texture may affect professional chroma-key results.";

export const EYEDROPPER_UNSUPPORTED =
  "Screen colour picking is not supported in this browser. You can still upload, paste, or load an image and select a colour from it.";

export const CLIPBOARD_NO_IMAGE =
  "No image was found on the clipboard. Try uploading the image instead.";

export const CAMERA_UNSUPPORTED =
  "Taking a photo is not available on this device. Your browser could not find a camera, or camera access is not supported here.";

export const CAMERA_PERMISSION_BLOCKED =
  "Camera access was blocked for this site. Click the lock or tune icon to the left of the address bar, set Camera to Allow, then try Take photo again.";

export const CORS_SAMPLE_BLOCKED =
  "This website does not permit pixel sampling from that image. Download it and upload it here instead.";
