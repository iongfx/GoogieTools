/**
 * Keyboard shortcut mapping for Colour Screen & Pixel Tester (test mode).
 * Pure helpers — keep React handlers thin.
 */

import { getPresetById, type ColourPresetId } from "@/lib/colour-presets";
import {
  clampMarkerDiameter,
  MARKER_LIMITS,
  type MarkerSettings,
  type MarkerStyle,
} from "@/lib/colour-screen-config";
import type { RgbColour } from "@/lib/colour-types";
import { isTypingTarget } from "@/lib/colour-validation";

export type ShortcutAction =
  | { type: "set-marker-colour"; colour: RgbColour; label: string }
  | { type: "marker-size"; delta: number }
  | { type: "toggle-marker-style" }
  | { type: "toggle-system-cursor" }
  | { type: "advance-colour" }
  | { type: "previous-colour" }
  | { type: "toggle-pause" }
  | { type: "enter-fullscreen" }
  | { type: "exit-fullscreen" }
  | { type: "toggle-help" };

const MARKER_COLOUR_KEYS: Record<string, ColourPresetId> = {
  r: "red",
  g: "green",
  b: "blue",
  w: "white",
  k: "black",
  c: "cyan",
  m: "magenta",
  y: "yellow",
};

export type ResolveShortcutOptions = {
  /** When true, F enters fullscreen from setup. */
  allowEnterFullscreen?: boolean;
  /** When true, Esc / exit actions are available. */
  inTestMode?: boolean;
};

/**
 * Map a keyboard event to a shortcut action.
 * Returns null when the event should be ignored.
 */
export function resolveShortcutAction(
  event: Pick<
    KeyboardEvent,
    "key" | "code" | "target" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
  >,
  options: ResolveShortcutOptions = {},
): ShortcutAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (isTypingTarget(event.target)) return null;

  const key = event.key;
  const lower = key.toLowerCase();

  if (lower === "escape") {
    return options.inTestMode ? { type: "exit-fullscreen" } : null;
  }

  if (key === "?" || (key === "/" && event.shiftKey)) {
    return options.inTestMode ? { type: "toggle-help" } : null;
  }

  if (lower === "f" && options.allowEnterFullscreen && !options.inTestMode) {
    return { type: "enter-fullscreen" };
  }

  if (!options.inTestMode) {
    return null;
  }

  const markerPreset = MARKER_COLOUR_KEYS[lower];
  if (markerPreset) {
    const preset = getPresetById(markerPreset);
    return {
      type: "set-marker-colour",
      colour: preset.rgb,
      label: preset.label,
    };
  }

  if (key === "[") {
    return { type: "marker-size", delta: -MARKER_LIMITS.diameterStep };
  }
  if (key === "]") {
    return { type: "marker-size", delta: MARKER_LIMITS.diameterStep };
  }
  if (lower === "o") {
    return { type: "toggle-marker-style" };
  }
  if (lower === "h") {
    return { type: "toggle-system-cursor" };
  }
  if (key === " " || event.code === "Space") {
    return { type: "advance-colour" };
  }
  if (lower === "p") {
    return { type: "toggle-pause" };
  }
  if (key === "ArrowRight" || key === "ArrowDown") {
    return { type: "advance-colour" };
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return { type: "previous-colour" };
  }

  return null;
}

export function applyMarkerSize(
  settings: MarkerSettings,
  delta: number,
): MarkerSettings {
  return {
    ...settings,
    diameter: clampMarkerDiameter(settings.diameter + delta),
  };
}

export function toggleOutlineOrFilled(style: MarkerStyle): MarkerStyle {
  if (style === "outline-ring" || style === "ring-dot" || style === "crosshair") {
    return "filled-circle";
  }
  return "outline-ring";
}

export const SHORTCUT_GUIDE: readonly {
  keys: string;
  description: string;
}[] = [
  { keys: "R G B W K", description: "Marker red, green, blue, white, black" },
  { keys: "C M Y", description: "Marker cyan, magenta, yellow" },
  { keys: "[ ]", description: "Decrease / increase marker size" },
  { keys: "O", description: "Toggle outline or filled marker" },
  { keys: "H", description: "Hide or show the system cursor" },
  { keys: "Space", description: "Next background colour" },
  { keys: "P", description: "Pause or resume auto-cycle" },
  { keys: "F", description: "Start fullscreen from setup" },
  { keys: "Esc", description: "Exit fullscreen test mode" },
  {
    keys: "Double-click",
    description: "Enter from the preview, or exit fullscreen test mode",
  },
  { keys: "?", description: "Show or hide shortcut help in test mode" },
] as const;
