import { describe, expect, it } from "vitest";
import { settingsFromPreset } from "@/lib/image-compressor-config";
import {
  createAutomaticCropState,
  cropRectFromManualState,
} from "@/lib/image-crop-editor";
import { planForSettings } from "@/lib/image-processing";
import { formatUsesQuality, resolveOutputKind } from "@/lib/image-formats";

describe("planForSettings", () => {
  it("produces exact 450×300 for gallery landscape fill-and-crop", () => {
    const settings = settingsFromPreset("gallery-landscape");
    const plan = planForSettings(1600, 1200, settings);
    expect(plan.output).toEqual({ width: 450, height: 300 });
  });

  it.each([
    ["gallery-landscape", 450, 300],
    ["square-thumbnail", 600, 600],
    ["portrait-headshot", 600, 800],
    ["social-landscape", 1200, 630],
    ["social-portrait", 1080, 1920],
    ["email-friendly", 1600, 1600],
  ] as const)(
    "%s produces exact %i × %i output",
    (presetId, width, height) => {
      const settings = settingsFromPreset(presetId);
      expect(planForSettings(2400, 1600, settings).output).toEqual({
        width,
        height,
      });
      expect(planForSettings(900, 1600, settings).output).toEqual({
        width,
        height,
      });
    },
  );

  it("respects crop focus overrides", () => {
    const settings = settingsFromPreset("gallery-landscape");
    const centre = planForSettings(800, 1200, settings, "centre");
    const top = planForSettings(800, 1200, settings, "top");
    expect(top.source.y).toBe(0);
    expect(centre.source.y).toBeGreaterThan(0);
  });

  it("keeps original dimensions for keep-original preset", () => {
    const settings = settingsFromPreset("keep-original");
    const plan = planForSettings(1920, 1080, settings);
    expect(plan.output).toEqual({ width: 1920, height: 1080 });
  });

  it("uses the same manual crop rectangle as cropRectFromManualState", () => {
    const settings = settingsFromPreset("gallery-landscape");
    const source = { width: 800, height: 1200 };
    const target = { width: 450, height: 300 };
    const manual = {
      ...createAutomaticCropState(source, target, "centre"),
      zoom: 2,
      panX: 0.2,
      panY: 0.8,
      adjusted: true,
    };
    const expected = cropRectFromManualState(source, target, manual);
    const plan = planForSettings(
      source.width,
      source.height,
      settings,
      undefined,
      manual,
    );
    expect(plan.source).toEqual(expected);
    expect(plan.output).toEqual(target);
  });
});

describe("output format helpers", () => {
  it("keeps original format kinds", () => {
    expect(resolveOutputKind("keep", "png")).toBe("png");
    expect(resolveOutputKind("jpeg", "png")).toBe("jpeg");
  });

  it("shows quality for keep-original with mixed or lossy sources", () => {
    expect(formatUsesQuality("keep")).toBe(true);
    expect(formatUsesQuality("keep", "png")).toBe(false);
    expect(formatUsesQuality("png")).toBe(false);
    expect(formatUsesQuality("webp")).toBe(true);
  });
});
