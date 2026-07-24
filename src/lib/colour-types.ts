/**
 * Canonical colour model for the Colour Screen & Pixel Tester.
 * Internal math uses RGB floats in 0–255 (and optional alpha 0–1).
 * Round only when formatting for display.
 */

export type RgbColour = {
  r: number;
  g: number;
  b: number;
};

export type RgbaColour = RgbColour & {
  a: number;
};

export type HslColour = {
  h: number;
  s: number;
  l: number;
};

export type HsvColour = {
  h: number;
  s: number;
  v: number;
};

export type CmykColour = {
  c: number;
  m: number;
  y: number;
  k: number;
};

export type ColourFormats = {
  rgb: RgbColour;
  hsl: HslColour;
  hsv: HsvColour;
  cmyk: CmykColour;
  hex: string;
  alpha?: number;
};
