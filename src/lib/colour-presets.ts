/**
 * Centralised colour presets for the Colour Screen & Pixel Tester.
 * Ordinary RGB green and chroma green are intentionally different.
 */

import type { RgbColour } from "@/lib/colour-types";

export type ColourPresetId =
  | "red"
  | "green"
  | "blue"
  | "white"
  | "black"
  | "cyan"
  | "magenta"
  | "yellow"
  | "grey-25"
  | "grey-50"
  | "grey-75"
  | "chroma-green"
  | "chroma-blue";

export type ColourPreset = {
  id: ColourPresetId;
  label: string;
  /** Short accessible name for buttons */
  shortLabel: string;
  rgb: RgbColour;
  /** Practical chroma-key presets are marked for helper copy. */
  chroma?: boolean;
};

/**
 * Exact preset RGB values.
 * Chroma green/blue are common digital key colours — practical presets,
 * not a universal professional standard.
 */
export const COLOUR_PRESETS: readonly ColourPreset[] = [
  { id: "red", label: "Red", shortLabel: "Red", rgb: { r: 255, g: 0, b: 0 } },
  {
    id: "green",
    label: "Green",
    shortLabel: "Green",
    rgb: { r: 0, g: 255, b: 0 },
  },
  { id: "blue", label: "Blue", shortLabel: "Blue", rgb: { r: 0, g: 0, b: 255 } },
  {
    id: "white",
    label: "White",
    shortLabel: "White",
    rgb: { r: 255, g: 255, b: 255 },
  },
  {
    id: "black",
    label: "Black",
    shortLabel: "Black",
    rgb: { r: 0, g: 0, b: 0 },
  },
  {
    id: "cyan",
    label: "Cyan",
    shortLabel: "Cyan",
    rgb: { r: 0, g: 255, b: 255 },
  },
  {
    id: "magenta",
    label: "Magenta",
    shortLabel: "Magenta",
    rgb: { r: 255, g: 0, b: 255 },
  },
  {
    id: "yellow",
    label: "Yellow",
    shortLabel: "Yellow",
    rgb: { r: 255, g: 255, b: 0 },
  },
  {
    id: "grey-25",
    label: "25% grey",
    shortLabel: "25%",
    rgb: { r: 64, g: 64, b: 64 },
  },
  {
    id: "grey-50",
    label: "50% grey",
    shortLabel: "50%",
    rgb: { r: 128, g: 128, b: 128 },
  },
  {
    id: "grey-75",
    label: "75% grey",
    shortLabel: "75%",
    rgb: { r: 191, g: 191, b: 191 },
  },
  {
    id: "chroma-green",
    label: "Chroma green",
    shortLabel: "Chroma G",
    rgb: { r: 0, g: 177, b: 64 },
    chroma: true,
  },
  {
    id: "chroma-blue",
    label: "Chroma blue",
    shortLabel: "Chroma B",
    rgb: { r: 0, g: 71, b: 187 },
    chroma: true,
  },
] as const;

export function getPresetById(id: ColourPresetId): ColourPreset {
  const preset = COLOUR_PRESETS.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Unknown colour preset: ${id}`);
  }
  return preset;
}

export const DEFAULT_BACKGROUND = getPresetById("blue").rgb;
export const DEFAULT_MARKER_COLOUR = getPresetById("red").rgb;
