/**
 * Input parsing and validation for colour fields.
 */

import {
  cmykToRgb,
  hexToRgb,
  hslToRgb,
  hsvToRgb,
} from "@/lib/colour-conversions";
import type {
  CmykColour,
  HslColour,
  HsvColour,
  RgbColour,
} from "@/lib/colour-types";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parse a finite number from a draft string; empty is incomplete. */
export function parseNumberDraft(raw: string): ParseResult<number | null> {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return { ok: true, value: null };
  }
  if (!/^-?\d*\.?\d+$/.test(trimmed)) {
    return { ok: false, message: "Enter a valid number." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, message: "Enter a valid number." };
  }
  return { ok: true, value };
}

export function parseHexInput(raw: string): ParseResult<RgbColour> {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "#") {
    return { ok: false, message: "Enter a HEX colour such as #C10017." };
  }
  const rgb = hexToRgb(trimmed);
  if (!rgb) {
    return {
      ok: false,
      message: "Use a 3- or 6-digit HEX colour (for example #RGB or #RRGGBB).",
    };
  }
  return { ok: true, value: rgb };
}

export function parseRgbChannels(input: {
  r: number;
  g: number;
  b: number;
}): ParseResult<RgbColour> {
  if (
    ![input.r, input.g, input.b].every((n) => Number.isFinite(n))
  ) {
    return { ok: false, message: "RGB channels must be numbers from 0 to 255." };
  }
  return {
    ok: true,
    value: {
      r: clamp(input.r, 0, 255),
      g: clamp(input.g, 0, 255),
      b: clamp(input.b, 0, 255),
    },
  };
}

export function parseHslChannels(input: {
  h: number;
  s: number;
  l: number;
}): ParseResult<RgbColour> {
  if (![input.h, input.s, input.l].every((n) => Number.isFinite(n))) {
    return { ok: false, message: "HSL values must be valid numbers." };
  }
  const hsl: HslColour = {
    h: ((input.h % 360) + 360) % 360,
    s: clamp(input.s, 0, 100),
    l: clamp(input.l, 0, 100),
  };
  return { ok: true, value: hslToRgb(hsl) };
}

export function parseHsvChannels(input: {
  h: number;
  s: number;
  v: number;
}): ParseResult<RgbColour> {
  if (![input.h, input.s, input.v].every((n) => Number.isFinite(n))) {
    return { ok: false, message: "HSV values must be valid numbers." };
  }
  const hsv: HsvColour = {
    h: ((input.h % 360) + 360) % 360,
    s: clamp(input.s, 0, 100),
    v: clamp(input.v, 0, 100),
  };
  return { ok: true, value: hsvToRgb(hsv) };
}

export function parseCmykChannels(input: {
  c: number;
  m: number;
  y: number;
  k: number;
}): ParseResult<RgbColour> {
  if (![input.c, input.m, input.y, input.k].every((n) => Number.isFinite(n))) {
    return { ok: false, message: "CMYK values must be valid numbers." };
  }
  const cmyk: CmykColour = {
    c: clamp(input.c, 0, 100),
    m: clamp(input.m, 0, 100),
    y: clamp(input.y, 0, 100),
    k: clamp(input.k, 0, 100),
  };
  return { ok: true, value: cmykToRgb(cmyk) };
}

/** True when focus is inside a typing surface — shortcuts should be ignored. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;

  const el = target as {
    isContentEditable?: boolean;
    tagName?: string;
    closest?: (selector: string) => unknown;
  };

  if (el.isContentEditable) return true;

  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;

  if (typeof el.closest === "function") {
    try {
      return Boolean(
        el.closest("input, textarea, select, [contenteditable='true']"),
      );
    } catch {
      return false;
    }
  }

  return false;
}
