import { describe, expect, it } from "vitest";
import {
  calculateContainLayout,
  calculateCoverCrop,
  calculateDrawPlan,
  calculateResizeOnlySize,
  cropWithinBounds,
  positionCropRect,
} from "@/lib/image-crop";

describe("calculateCoverCrop", () => {
  it("needs no crop when aspect ratios match (1200×800 → 450×300)", () => {
    const crop = calculateCoverCrop(
      { width: 1200, height: 800 },
      { width: 450, height: 300 },
      "centre",
    );
    expect(crop).toEqual({ x: 0, y: 0, width: 1200, height: 800 });
    expect(cropWithinBounds(crop, { width: 1200, height: 800 })).toBe(true);
  });

  it("crops vertical overflow for portrait source to landscape target", () => {
    const source = { width: 800, height: 1200 };
    const target = { width: 450, height: 300 };
    const centre = calculateCoverCrop(source, target, "centre");

    // Target aspect 1.5 → crop height = 800 / 1.5 ≈ 533.33
    expect(centre.width).toBe(800);
    expect(centre.height).toBe(Math.round(800 / 1.5));
    expect(centre.x).toBe(0);
    expect(centre.y).toBeGreaterThan(0);
    expect(cropWithinBounds(centre, source)).toBe(true);

    const top = calculateCoverCrop(source, target, "top");
    expect(top.y).toBe(0);

    const bottom = calculateCoverCrop(source, target, "bottom");
    expect(bottom.y + bottom.height).toBe(source.height);
  });

  it("crops horizontal overflow for landscape source to portrait target", () => {
    const source = { width: 1200, height: 800 };
    const target = { width: 300, height: 450 };
    const centre = calculateCoverCrop(source, target, "centre");

    expect(centre.height).toBe(800);
    expect(centre.width).toBe(Math.round(800 * (300 / 450)));
    expect(centre.y).toBe(0);
    expect(centre.x).toBeGreaterThan(0);

    const left = calculateCoverCrop(source, target, "left");
    expect(left.x).toBe(0);

    const right = calculateCoverCrop(source, target, "right");
    expect(right.x + right.width).toBe(source.width);
  });

  it("handles square source to landscape target", () => {
    const crop = calculateCoverCrop(
      { width: 1000, height: 1000 },
      { width: 450, height: 300 },
      "centre",
    );
    expect(crop.height).toBe(Math.round(1000 * (300 / 450)));
    expect(crop.width).toBe(1000);
    expect(cropWithinBounds(crop, { width: 1000, height: 1000 })).toBe(true);
  });

  it("never exceeds source bounds for corner focuses", () => {
    const source = { width: 900, height: 1200 };
    const target = { width: 450, height: 300 };
    for (const focus of [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "centre",
      "top",
      "bottom",
      "left",
      "right",
    ] as const) {
      const crop = calculateCoverCrop(source, target, focus);
      expect(cropWithinBounds(crop, source)).toBe(true);
    }
  });
});

describe("positionCropRect", () => {
  it("places left/right and top/bottom correctly", () => {
    const source = { width: 200, height: 200 };
    const size = { width: 100, height: 100 };
    expect(positionCropRect(source, size, "left").x).toBe(0);
    expect(positionCropRect(source, size, "right").x).toBe(100);
    expect(positionCropRect(source, size, "top").y).toBe(0);
    expect(positionCropRect(source, size, "bottom").y).toBe(100);
    expect(positionCropRect(source, size, "centre")).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
  });
});

describe("calculateContainLayout", () => {
  it("preserves aspect ratio and fits within the target", () => {
    const layout = calculateContainLayout(
      { width: 1200, height: 800 },
      { width: 450, height: 300 },
      false,
    );
    expect(layout.drawWidth).toBeLessThanOrEqual(450);
    expect(layout.drawHeight).toBeLessThanOrEqual(300);
    expect(layout.drawWidth / layout.drawHeight).toBeCloseTo(1200 / 800, 2);
    expect(layout.offsetX).toBeGreaterThanOrEqual(0);
    expect(layout.offsetY).toBeGreaterThanOrEqual(0);
    expect(layout.enlarged).toBe(false);
  });

  it("does not enlarge when allowEnlarge is false", () => {
    const layout = calculateContainLayout(
      { width: 100, height: 80 },
      { width: 450, height: 300 },
      false,
    );
    expect(layout.drawWidth).toBe(100);
    expect(layout.drawHeight).toBe(80);
    expect(layout.enlarged).toBe(false);
  });

  it("enlarges when allowEnlarge is true", () => {
    const layout = calculateContainLayout(
      { width: 100, height: 80 },
      { width: 450, height: 300 },
      true,
    );
    expect(layout.drawWidth).toBeGreaterThan(100);
    expect(layout.enlarged).toBe(true);
  });

  it("centres the image inside the target", () => {
    const layout = calculateContainLayout(
      { width: 200, height: 100 },
      { width: 400, height: 400 },
      true,
    );
    expect(layout.offsetX).toBe(
      Math.round((400 - layout.drawWidth) / 2),
    );
    expect(layout.offsetY).toBe(
      Math.round((400 - layout.drawHeight) / 2),
    );
  });
});

describe("calculateResizeOnlySize", () => {
  it("preserves aspect ratio and stays within max bounds", () => {
    const size = calculateResizeOnlySize(
      { width: 2000, height: 1000 },
      1000,
      1000,
      false,
    );
    expect(size.width).toBe(1000);
    expect(size.height).toBe(500);
  });

  it("leaves smaller images unchanged when enlargement is disabled", () => {
    const size = calculateResizeOnlySize(
      { width: 400, height: 300 },
      1600,
      1600,
      false,
    );
    expect(size.width).toBe(400);
    expect(size.height).toBe(300);
    expect(size.enlarged).toBe(false);
  });

  it("enlarges smaller images when enabled", () => {
    const size = calculateResizeOnlySize(
      { width: 400, height: 300 },
      800,
      600,
      true,
    );
    expect(size.width).toBe(800);
    expect(size.height).toBe(600);
    expect(size.enlarged).toBe(true);
  });
});

describe("calculateDrawPlan", () => {
  it("fill-crop outputs exact target dimensions", () => {
    const plan = calculateDrawPlan({
      source: { width: 800, height: 1200 },
      targetWidth: 450,
      targetHeight: 300,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: true,
      exactDimensions: true,
      keepOriginal: false,
    });
    expect(plan.output).toEqual({ width: 450, height: 300 });
    expect(plan.destination).toEqual({
      x: 0,
      y: 0,
      width: 450,
      height: 300,
    });
  });

  it.each([
    [450, 300],
    [600, 600],
    [600, 800],
    [1200, 630],
    [1080, 1920],
    [777, 333],
  ] as const)(
    "fill-crop produces exact %i × %i output for mixed source aspects",
    (width, height) => {
      for (const source of [
        { width: 1600, height: 1200 },
        { width: 800, height: 1200 },
        { width: 1000, height: 1000 },
      ]) {
        const plan = calculateDrawPlan({
          source,
          targetWidth: width,
          targetHeight: height,
          fitMode: "fill-crop",
          cropFocus: "centre",
          allowEnlarge: true,
          exactDimensions: true,
          keepOriginal: false,
        });
        expect(plan.output).toEqual({ width, height });
        expect(cropWithinBounds(plan.source, source)).toBe(true);
      }
    },
  );

  it("stretch maps full source to exact target", () => {
    const plan = calculateDrawPlan({
      source: { width: 100, height: 200 },
      targetWidth: 400,
      targetHeight: 100,
      fitMode: "stretch",
      cropFocus: "centre",
      allowEnlarge: true,
      exactDimensions: true,
      keepOriginal: false,
    });
    expect(plan.source).toEqual({ x: 0, y: 0, width: 100, height: 200 });
    expect(plan.output).toEqual({ width: 400, height: 100 });
  });

  it("keep-original returns source size", () => {
    const plan = calculateDrawPlan({
      source: { width: 640, height: 480 },
      targetWidth: 450,
      targetHeight: 300,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: false,
      exactDimensions: true,
      keepOriginal: true,
    });
    expect(plan.output).toEqual({ width: 640, height: 480 });
    expect(plan.scale).toBe(1);
  });

  it("fit-inside with exact dimensions pads to target size", () => {
    const plan = calculateDrawPlan({
      source: { width: 200, height: 100 },
      targetWidth: 400,
      targetHeight: 400,
      fitMode: "fit-inside",
      cropFocus: "centre",
      allowEnlarge: true,
      exactDimensions: true,
      keepOriginal: false,
    });
    expect(plan.output).toEqual({ width: 400, height: 400 });
    expect(plan.destination.width).toBeLessThanOrEqual(400);
    expect(plan.destination.height).toBeLessThanOrEqual(400);
  });

  it("resize-only preserves aspect ratio within max bounds", () => {
    const plan = calculateDrawPlan({
      source: { width: 2000, height: 1000 },
      targetWidth: 1000,
      targetHeight: 1000,
      fitMode: "resize-only",
      cropFocus: "centre",
      allowEnlarge: false,
      exactDimensions: false,
      keepOriginal: false,
    });
    expect(plan.output).toEqual({ width: 1000, height: 500 });
    expect(plan.output.width / plan.output.height).toBeCloseTo(2, 5);
  });

  it("resize-only applies a manual source crop before fitting max dimensions", () => {
    const plan = calculateDrawPlan({
      source: { width: 2000, height: 1000 },
      targetWidth: 1600,
      targetHeight: 1600,
      fitMode: "resize-only",
      cropFocus: "centre",
      allowEnlarge: false,
      exactDimensions: false,
      keepOriginal: false,
      sourceCropOverride: { x: 500, y: 0, width: 1000, height: 1000 },
    });
    expect(plan.source).toEqual({ x: 500, y: 0, width: 1000, height: 1000 });
    expect(plan.output.width).toBeLessThanOrEqual(1600);
    expect(plan.output.height).toBeLessThanOrEqual(1600);
    expect(plan.output.width).toBe(plan.output.height);
  });

  it("uses a shared manual crop override for fill-crop export geometry", () => {
    const override = { x: 100, y: 200, width: 600, height: 400 };
    const plan = calculateDrawPlan({
      source: { width: 1200, height: 800 },
      targetWidth: 450,
      targetHeight: 300,
      fitMode: "fill-crop",
      cropFocus: "centre",
      allowEnlarge: true,
      exactDimensions: true,
      keepOriginal: false,
      sourceCropOverride: override,
    });
    expect(plan.source).toEqual(override);
    expect(plan.output).toEqual({ width: 450, height: 300 });
  });
});
