/**
 * Display formatting for colour values.
 * Round only here — keep internal RGB precise until this step.
 */

import {
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from "@/lib/colour-conversions";
import type {
  CmykColour,
  ColourFormats,
  HslColour,
  HsvColour,
  RgbColour,
} from "@/lib/colour-types";

function roundChannel(value: number): number {
  return Math.round(clampDisplay(value, 0, 255));
}

function clampDisplay(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundPercent(value: number): number {
  return Math.round(clampDisplay(value, 0, 100));
}

function roundHue(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return Math.round(normalized);
}

export function formatHex(rgb: RgbColour): string {
  return rgbToHex(rgb);
}

export function formatRgb(rgb: RgbColour): string {
  return `rgb(${roundChannel(rgb.r)}, ${roundChannel(rgb.g)}, ${roundChannel(rgb.b)})`;
}

export function formatRgbChannels(rgb: RgbColour): {
  r: number;
  g: number;
  b: number;
} {
  return {
    r: roundChannel(rgb.r),
    g: roundChannel(rgb.g),
    b: roundChannel(rgb.b),
  };
}

export function formatHsl(hsl: HslColour): string {
  return `hsl(${roundHue(hsl.h)}, ${roundPercent(hsl.s)}%, ${roundPercent(hsl.l)}%)`;
}

export function formatHslChannels(hsl: HslColour): {
  h: number;
  s: number;
  l: number;
} {
  return {
    h: roundHue(hsl.h),
    s: roundPercent(hsl.s),
    l: roundPercent(hsl.l),
  };
}

export function formatHsv(hsv: HsvColour): string {
  return `hsv(${roundHue(hsv.h)}, ${roundPercent(hsv.s)}%, ${roundPercent(hsv.v)}%)`;
}

export function formatHsvChannels(hsv: HsvColour): {
  h: number;
  s: number;
  v: number;
} {
  return {
    h: roundHue(hsv.h),
    s: roundPercent(hsv.s),
    v: roundPercent(hsv.v),
  };
}

export function formatCmyk(cmyk: CmykColour): string {
  return `cmyk(${roundPercent(cmyk.c)}%, ${roundPercent(cmyk.m)}%, ${roundPercent(cmyk.y)}%, ${roundPercent(cmyk.k)}%)`;
}

export function formatCmykChannels(cmyk: CmykColour): {
  c: number;
  m: number;
  y: number;
  k: number;
} {
  return {
    c: roundPercent(cmyk.c),
    m: roundPercent(cmyk.m),
    y: roundPercent(cmyk.y),
    k: roundPercent(cmyk.k),
  };
}

/**
 * Clipboard payload of channel numbers only — comma-separated, no labels.
 * Example: `255, 0, 0`
 */
export function formatChannelsForCopy(
  ...channels: Array<number | string>
): string {
  return channels.join(", ");
}

export function formatAlpha(alpha: number): string {
  const clamped = clampDisplay(alpha, 0, 1);
  if (clamped >= 1 - Number.EPSILON) return "1";
  if (clamped <= Number.EPSILON) return "0";
  return String(Math.round(clamped * 1000) / 1000);
}

/** Derive every display format from a canonical RGB colour. */
export function formatsFromRgb(
  rgb: RgbColour,
  alpha?: number,
): ColourFormats {
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const cmyk = rgbToCmyk(rgb);
  return {
    rgb,
    hsl,
    hsv,
    cmyk,
    hex: formatHex(rgb),
    alpha,
  };
}

/**
 * Multi-line clipboard payload for “Copy all values”.
 */
export function formatAllColourValues(
  rgb: RgbColour,
  options?: { alpha?: number },
): string {
  const formats = formatsFromRgb(rgb, options?.alpha);
  const rgbCh = formatRgbChannels(rgb);
  const hslCh = formatHslChannels(formats.hsl);
  const hsvCh = formatHsvChannels(formats.hsv);
  const cmykCh = formatCmykChannels(formats.cmyk);
  const lines = [
    `HEX: ${formats.hex}`,
    `RGB: (${rgbCh.r}, ${rgbCh.g}, ${rgbCh.b})`,
    `HSL: (${hslCh.h}, ${hslCh.s}%, ${hslCh.l}%)`,
    `HSV/HSB: (${hsvCh.h}, ${hsvCh.s}%, ${hsvCh.v}%)`,
    `CMYK: (${cmykCh.c}, ${cmykCh.m}, ${cmykCh.y}, ${cmykCh.k})`,
  ];
  if (options?.alpha !== undefined && options.alpha < 1 - Number.EPSILON) {
    lines.push(`Alpha: ${formatAlpha(options.alpha)}`);
  }
  return lines.join("\n");
}

export type ColourExportChoice =
  | "rgb"
  | "cmyk"
  | "hex"
  | "hsl"
  | "hsv"
  | "all";

function formatExportLine(label: string, values: Array<number | string>): string {
  return `${label}:  (${values.join(", ")})`;
}

function formatColourExportLines(
  rgb: RgbColour,
  choice: ColourExportChoice,
): string[] {
  const formats = formatsFromRgb(rgb);
  const rgbCh = formatRgbChannels(rgb);
  const hslCh = formatHslChannels(formats.hsl);
  const hsvCh = formatHsvChannels(formats.hsv);
  const cmykCh = formatCmykChannels(formats.cmyk);

  const lines: Record<Exclude<ColourExportChoice, "all">, string> = {
    hex: formatExportLine("HEX", [formats.hex]),
    rgb: formatExportLine("RGB", [rgbCh.r, rgbCh.g, rgbCh.b]),
    hsl: formatExportLine("HSL", [hslCh.h, hslCh.s, hslCh.l]),
    hsv: formatExportLine("HSV/HSB", [hsvCh.h, hsvCh.s, hsvCh.v]),
    cmyk: formatExportLine("CMYK", [cmykCh.c, cmykCh.m, cmykCh.y, cmykCh.k]),
  };

  if (choice === "all") {
    return [lines.rgb, lines.cmyk, lines.hex, lines.hsl, lines.hsv];
  }

  return [lines[choice]];
}

/** Build a text-file export for one colour like `CMYK:  (0, 100, 100, 0)`. */
export function formatColourExport(
  rgb: RgbColour,
  choice: ColourExportChoice,
): string {
  return formatColourExportLines(rgb, choice).join("\n");
}

/**
 * Export every colour in a cycle list, in order:
 *
 * Colour 1:
 * RGB:  (r, g, b)
 * CMYK:  (c, m, y, k)
 */
export function formatColourCycleExport(
  colours: readonly RgbColour[],
  choice: ColourExportChoice,
): string {
  if (colours.length === 0) {
    return "No colours in the colour cycle.";
  }

  return colours
    .map((rgb, index) => {
      const body = formatColourExportLines(rgb, choice).join("\n");
      return `Colour ${index + 1}:\n${body}`;
    })
    .join("\n\n");
}
