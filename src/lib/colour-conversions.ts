/**
 * Colour space conversions for the Colour Screen & Pixel Tester.
 * All paths go through a canonical RGB model. Do not chain through
 * rounded display strings.
 */

import type {
  CmykColour,
  HslColour,
  HsvColour,
  RgbColour,
} from "@/lib/colour-types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp RGB channels to the valid 0–255 range without rounding. */
export function clampRgb(rgb: RgbColour): RgbColour {
  return {
    r: clamp(rgb.r, 0, 255),
    g: clamp(rgb.g, 0, 255),
    b: clamp(rgb.b, 0, 255),
  };
}

/** Parse a 3- or 6-digit hex string (with or without #) to RGB. */
export function hexToRgb(hex: string): RgbColour | null {
  const cleaned = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }
  return null;
}

/** Convert RGB (0–255) to uppercase #RRGGBB. Channels are rounded for hex. */
export function rgbToHex(rgb: RgbColour): string {
  const clamped = clampRgb(rgb);
  const toByte = (channel: number) =>
    Math.round(channel).toString(16).padStart(2, "0").toUpperCase();
  return `#${toByte(clamped.r)}${toByte(clamped.g)}${toByte(clamped.b)}`;
}

export function rgbToHsl(rgb: RgbColour): HslColour {
  const r = clamp(rgb.r, 0, 255) / 255;
  const g = clamp(rgb.g, 0, 255) / 255;
  const b = clamp(rgb.b, 0, 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(hsl: HslColour): RgbColour {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;

  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const hueToRgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  return {
    r: hueToRgb(h / 360 + 1 / 3) * 255,
    g: hueToRgb(h / 360) * 255,
    b: hueToRgb(h / 360 - 1 / 3) * 255,
  };
}

export function rgbToHsv(rgb: RgbColour): HsvColour {
  const r = clamp(rgb.r, 0, 255) / 255;
  const g = clamp(rgb.g, 0, 255) / 255;
  const b = clamp(rgb.b, 0, 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;

  return { h, s, v };
}

export function hsvToRgb(hsv: HsvColour): RgbColour {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = clamp(hsv.s, 0, 100) / 100;
  const v = clamp(hsv.v, 0, 100) / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

/**
 * Approximate device RGB → CMYK (0–100%).
 * This is a mathematical screen conversion, not print-proof.
 */
export function rgbToCmyk(rgb: RgbColour): CmykColour {
  const r = clamp(rgb.r, 0, 255) / 255;
  const g = clamp(rgb.g, 0, 255) / 255;
  const b = clamp(rgb.b, 0, 255) / 255;

  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - Number.EPSILON) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = ((1 - r - k) / (1 - k)) * 100;
  const m = ((1 - g - k) / (1 - k)) * 100;
  const y = ((1 - b - k) / (1 - k)) * 100;

  return { c, m, y, k: k * 100 };
}

/**
 * Approximate CMYK (0–100%) → device RGB.
 * Not colour-managed; suitable only for on-screen approximation.
 */
export function cmykToRgb(cmyk: CmykColour): RgbColour {
  const c = clamp(cmyk.c, 0, 100) / 100;
  const m = clamp(cmyk.m, 0, 100) / 100;
  const y = clamp(cmyk.y, 0, 100) / 100;
  const k = clamp(cmyk.k, 0, 100) / 100;

  return {
    r: 255 * (1 - c) * (1 - k),
    g: 255 * (1 - m) * (1 - k),
    b: 255 * (1 - y) * (1 - k),
  };
}

/** Compare two RGB colours within a small epsilon. */
export function coloursNearlyEqual(
  a: RgbColour,
  b: RgbColour,
  epsilon = 0.5,
): boolean {
  return (
    Math.abs(a.r - b.r) <= epsilon &&
    Math.abs(a.g - b.g) <= epsilon &&
    Math.abs(a.b - b.b) <= epsilon
  );
}

/** CSS `rgb()` / `rgba()` string from internal RGB (rounded channels). */
export function rgbToCss(rgb: RgbColour, alpha = 1): string {
  const clamped = clampRgb(rgb);
  const r = Math.round(clamped.r);
  const g = Math.round(clamped.g);
  const b = Math.round(clamped.b);
  if (alpha >= 1 - Number.EPSILON) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  const a = Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
