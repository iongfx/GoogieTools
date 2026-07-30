import { describe, expect, it } from "vitest";
import {
  cmykToRgb,
  coloursNearlyEqual,
  hexToRgb,
  hslToRgb,
  hsvToRgb,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from "@/lib/colour-conversions";
import {
  formatAllColourValues,
  formatCmyk,
  formatHex,
  formatHsl,
  formatHsv,
  formatRgb,
} from "@/lib/colour-formatting";
import { getPresetById } from "@/lib/colour-presets";
import {
  displayedImageSize,
  mapPreviewPointToPixel,
  loupeSampleOrigin,
} from "@/lib/colour-image-coords";
import { validateImageUrl, validateColourPickerImageFile } from "@/lib/colour-image-url";
import { nextCycleIndex, previousCycleIndex } from "@/lib/colour-cycle";
import { resolveShortcutAction } from "@/lib/colour-screen-shortcuts";
import { parseHexInput, isTypingTarget } from "@/lib/colour-validation";
import type { CycleColourItem } from "@/lib/colour-screen-config";

describe("hex and rgb", () => {
  it("round-trips primary colours", () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#FF0000");
    expect(hexToRgb("#00FF00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#00f")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("rejects invalid hex", () => {
    expect(hexToRgb("zzz")).toBeNull();
    expect(parseHexInput("#GG0000").ok).toBe(false);
  });
});

describe("hsl and hsv", () => {
  it("converts red correctly", () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(Math.round(hsl.h)).toBe(0);
    expect(Math.round(hsl.s)).toBe(100);
    expect(Math.round(hsl.l)).toBe(50);

    const hsv = rgbToHsv({ r: 255, g: 0, b: 0 });
    expect(Math.round(hsv.h)).toBe(0);
    expect(Math.round(hsv.s)).toBe(100);
    expect(Math.round(hsv.v)).toBe(100);
  });

  it("round-trips through hsl and hsv without chaining display strings", () => {
    const original = { r: 193, g: 0, b: 23 };
    const viaHsl = hslToRgb(rgbToHsl(original));
    const viaHsv = hsvToRgb(rgbToHsv(original));
    expect(coloursNearlyEqual(original, viaHsl, 1)).toBe(true);
    expect(coloursNearlyEqual(original, viaHsv, 1)).toBe(true);
  });
});

describe("cmyk approximation", () => {
  it("maps black and white", () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 }).k).toBeCloseTo(100, 5);
    const white = rgbToCmyk({ r: 255, g: 255, b: 255 });
    expect(white.k).toBeCloseTo(0, 5);
    expect(white.c).toBeCloseTo(0, 5);
  });

  it("round-trips approximately", () => {
    const rgb = { r: 193, g: 0, b: 23 };
    const back = cmykToRgb(rgbToCmyk(rgb));
    expect(coloursNearlyEqual(rgb, back, 1.5)).toBe(true);
  });
});

describe("formatting", () => {
  it("formats the sample colour block", () => {
    const rgb = { r: 193, g: 0, b: 23 };
    expect(formatHex(rgb)).toBe("#C10017");
    expect(formatRgb(rgb)).toBe("rgb(193, 0, 23)");
    expect(formatHsl(rgbToHsl(rgb))).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    expect(formatHsv(rgbToHsv(rgb))).toMatch(/^hsv\(\d+, \d+%, \d+%\)$/);
    expect(formatCmyk(rgbToCmyk(rgb))).toMatch(/^cmyk\(\d+%, \d+%, \d+%, \d+%\)$/);
    expect(formatAllColourValues(rgb)).toContain("HEX: #C10017");
    expect(formatAllColourValues(rgb)).toMatch(
      /^HEX: #[0-9A-F]{6}\nRGB: \(\d+, \d+, \d+\)\nHSL: \(\d+, \d+%, \d+%\)\nHSV\/HSB: \(\d+, \d+%, \d+%\)\nCMYK: \(\d+, \d+, \d+, \d+\)$/,
    );
  });
});

describe("presets", () => {
  it("keeps chroma green different from rgb green", () => {
    const green = getPresetById("green").rgb;
    const chroma = getPresetById("chroma-green").rgb;
    expect(green).toEqual({ r: 0, g: 255, b: 0 });
    expect(chroma).not.toEqual(green);
  });
});

describe("image coordinates", () => {
  it("maps the centre of a fitted image", () => {
    const layout = {
      width: 200,
      height: 200,
      imageWidth: 100,
      imageHeight: 100,
    };
    const transform = { zoom: 1, panX: 0, panY: 0 };
    const mapped = mapPreviewPointToPixel(
      100,
      100,
      { left: 0, top: 0, width: 200, height: 200 },
      layout,
      transform,
    );
    expect(mapped.inside).toBe(true);
    expect(mapped.x).toBe(50);
    expect(mapped.y).toBe(50);
  });

  it("fills both axes at zoom 1 for mismatched aspect ratios", () => {
    const layout = {
      width: 400,
      height: 200,
      imageWidth: 100,
      imageHeight: 100,
    };
    const size = displayedImageSize(layout, { zoom: 1, panX: 0, panY: 0 });
    // Cover scale = max(400/100, 200/100) = 4 → 400×400, filling width and height.
    expect(size.width).toBe(400);
    expect(size.height).toBe(400);
  });

  it("clamps loupe origins inside the image", () => {
    expect(loupeSampleOrigin(0, 0, 11, 20, 20)).toEqual({ startX: 0, startY: 0 });
    expect(loupeSampleOrigin(19, 19, 11, 20, 20)).toEqual({
      startX: 9,
      startY: 9,
    });
  });
});

describe("image url and file validation", () => {
  it("accepts https urls and blocks unsafe schemes", () => {
    expect(validateImageUrl("https://example.com/a.png").ok).toBe(true);
    expect(validateImageUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateImageUrl("data:image/png;base64,xx").ok).toBe(false);
    expect(validateImageUrl("file:///C:/x.png").ok).toBe(false);
  });

  it("rejects svg and gif uploads", () => {
    expect(
      validateColourPickerImageFile({
        name: "a.svg",
        type: "image/svg+xml",
        size: 10,
      }).ok,
    ).toBe(false);
    expect(
      validateColourPickerImageFile({
        name: "a.gif",
        type: "image/gif",
        size: 10,
      }).ok,
    ).toBe(false);
    expect(
      validateColourPickerImageFile({
        name: "a.png",
        type: "image/png",
        size: 10,
      }).ok,
    ).toBe(true);
  });
});

describe("cycle helpers", () => {
  const items: CycleColourItem[] = [
    { id: "a", label: "A", rgb: { r: 1, g: 0, b: 0 }, enabled: true },
    { id: "b", label: "B", rgb: { r: 0, g: 1, b: 0 }, enabled: false },
    { id: "c", label: "C", rgb: { r: 0, g: 0, b: 1 }, enabled: true },
  ];

  it("skips disabled colours and loops", () => {
    expect(nextCycleIndex(items, 0, "sequential", true)).toBe(2);
    expect(nextCycleIndex(items, 2, "sequential", true)).toBe(0);
    expect(previousCycleIndex(items, 0, true)).toBe(2);
  });
});

describe("shortcuts", () => {
  it("ignores typing targets", () => {
    const input = {
      tagName: "INPUT",
      isContentEditable: false,
      closest: () => null,
    } as unknown as EventTarget;
    expect(
      resolveShortcutAction(
        {
          key: "r",
          code: "KeyR",
          target: input,
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
        },
        { inTestMode: true },
      ),
    ).toBeNull();
  });

  it("maps marker and navigation keys in test mode", () => {
    const div = {
      tagName: "DIV",
      isContentEditable: false,
      closest: () => null,
    } as unknown as EventTarget;
    expect(
      resolveShortcutAction(
        {
          key: "r",
          code: "KeyR",
          target: div,
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
        },
        { inTestMode: true },
      ),
    ).toMatchObject({ type: "set-marker-colour" });

    expect(
      resolveShortcutAction(
        {
          key: " ",
          code: "Space",
          target: div,
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
        },
        { inTestMode: true },
      ),
    ).toEqual({ type: "advance-colour" });

    expect(
      resolveShortcutAction(
        {
          key: "Escape",
          code: "Escape",
          target: div,
          metaKey: false,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
        },
        { inTestMode: true },
      ),
    ).toEqual({ type: "exit-fullscreen" });
  });

  it("detects typing targets via tagName", () => {
    const textarea = {
      tagName: "TEXTAREA",
      isContentEditable: false,
      closest: () => null,
    };
    const div = {
      tagName: "DIV",
      isContentEditable: false,
      closest: () => null,
    };
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(textarea as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget(div as unknown as EventTarget)).toBe(false);
  });
});
