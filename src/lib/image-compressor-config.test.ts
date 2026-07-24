import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMAGE_SETTINGS,
  getPresetById,
  IMAGE_PRESETS,
  IMAGE_QUALITY,
  KEEP_ORIGINAL_PREVIEW_SIZE,
  presetOptionLabel,
  qualityGuidanceLabel,
  resolvePresetAfterEdit,
  settingsFromPreset,
} from "@/lib/image-compressor-config";

describe("image presets", () => {
  it("includes the recommended first-release presets", () => {
    const ids = IMAGE_PRESETS.map((preset) => preset.id);
    expect(ids).toEqual([
      "keep-original",
      "email-friendly",
      "gallery-landscape",
      "square-thumbnail",
      "portrait-headshot",
      "social-landscape",
      "social-portrait",
      "custom",
    ]);
  });

  it("configures Email-friendly as 1600×1600 fill-and-crop without enlargement", () => {
    const settings = settingsFromPreset("email-friendly");
    expect(settings.width).toBe(1600);
    expect(settings.height).toBe(1600);
    expect(settings.fitMode).toBe("fill-crop");
    expect(settings.allowEnlarge).toBe(false);
    expect(settings.outputFormat).toBe("jpeg");
    expect(settings.quality).toBe(IMAGE_QUALITY.default);
  });

  it("uses the Email-friendly frame size for Keep original preview", () => {
    const email = settingsFromPreset("email-friendly");
    expect(KEEP_ORIGINAL_PREVIEW_SIZE.width).toBe(email.width);
    expect(KEEP_ORIGINAL_PREVIEW_SIZE.height).toBe(email.height);
  });

  it("configures Gallery landscape as 450×300 fill-and-crop centre", () => {
    const settings = settingsFromPreset("gallery-landscape");
    expect(settings.width).toBe(450);
    expect(settings.height).toBe(300);
    expect(settings.fitMode).toBe("fill-crop");
    expect(settings.cropFocus).toBe("centre");
    expect(settings.quality).toBe(82);
  });

  it("configures Square thumbnail as 600×600 fill-and-crop", () => {
    const settings = settingsFromPreset("square-thumbnail");
    expect(settings.width).toBe(600);
    expect(settings.height).toBe(600);
    expect(settings.fitMode).toBe("fill-crop");
  });

  it("configures Portrait headshot as 600×800 with top focus", () => {
    const settings = settingsFromPreset("portrait-headshot");
    expect(settings.width).toBe(600);
    expect(settings.height).toBe(800);
    expect(settings.cropFocus).toBe("top");
    expect(settings.fitMode).toBe("fill-crop");
  });

  it("configures Social landscape as 1200×630 fill-and-crop", () => {
    const settings = settingsFromPreset("social-landscape");
    expect(settings.width).toBe(1200);
    expect(settings.height).toBe(630);
    expect(settings.fitMode).toBe("fill-crop");
  });

  it("configures Social portrait as 1080×1920 fill-and-crop", () => {
    const settings = settingsFromPreset("social-portrait");
    expect(settings.width).toBe(1080);
    expect(settings.height).toBe(1920);
    expect(settings.fitMode).toBe("fill-crop");
    expect(settings.cropFocus).toBe("centre");
  });

  it("configures Keep original with null dimensions", () => {
    const settings = settingsFromPreset("keep-original");
    expect(settings.width).toBeNull();
    expect(settings.height).toBeNull();
  });

  it("exposes Custom with editable defaults", () => {
    const preset = getPresetById("custom");
    expect(preset.label).toBe("Custom");
    expect(settingsFromPreset("custom").width).toBe(1200);
  });
});

describe("resolvePresetAfterEdit", () => {
  it("switches to Custom when visible values diverge from the preset", () => {
    const base = settingsFromPreset("gallery-landscape");
    const next = resolvePresetAfterEdit(base, { width: 500 });
    expect(next.presetId).toBe("custom");
    expect(next.width).toBe(500);
  });

  it("keeps the preset when values still match", () => {
    const base = settingsFromPreset("gallery-landscape");
    const next = resolvePresetAfterEdit(base, { quality: 82 });
    expect(next.presetId).toBe("gallery-landscape");
  });

  it("keeps Keep original when quality or format changes", () => {
    const base = settingsFromPreset("keep-original");
    const byQuality = resolvePresetAfterEdit(base, { quality: 60 });
    expect(byQuality.presetId).toBe("keep-original");
    expect(byQuality.quality).toBe(60);

    const byFormat = resolvePresetAfterEdit(base, { outputFormat: "jpeg" });
    expect(byFormat.presetId).toBe("keep-original");
    expect(byFormat.outputFormat).toBe("jpeg");
  });

  it("switches Keep original to Custom only when dimensions are set", () => {
    const base = settingsFromPreset("keep-original");
    const next = resolvePresetAfterEdit(base, { width: 800, height: 600 });
    expect(next.presetId).toBe("custom");
  });
});

describe("presetOptionLabel", () => {
  it("includes pixel sizes in dropdown labels", () => {
    expect(presetOptionLabel(getPresetById("gallery-landscape"))).toBe(
      "Gallery landscape (450 × 300)",
    );
    expect(presetOptionLabel(getPresetById("social-portrait"))).toBe(
      "Social portrait (1080 × 1920)",
    );
    expect(presetOptionLabel(getPresetById("email-friendly"))).toBe(
      "Email-friendly (1600 × 1600)",
    );
    expect(presetOptionLabel(getPresetById("keep-original"))).toBe(
      "Keep original dimensions",
    );
    expect(presetOptionLabel(getPresetById("custom"))).toBe("Custom");
  });
});

describe("qualityGuidanceLabel", () => {
  it("maps ranges to human-readable guidance", () => {
    expect(qualityGuidanceLabel(45)).toBe("Smaller file");
    expect(qualityGuidanceLabel(82)).toBe("Balanced");
    expect(qualityGuidanceLabel(95)).toBe("Higher quality");
  });
});

describe("DEFAULT_IMAGE_SETTINGS", () => {
  it("defaults to Square thumbnail (600 × 600) for the core use case", () => {
    expect(DEFAULT_IMAGE_SETTINGS.presetId).toBe("square-thumbnail");
    expect(DEFAULT_IMAGE_SETTINGS.width).toBe(600);
    expect(DEFAULT_IMAGE_SETTINGS.height).toBe(600);
    expect(DEFAULT_IMAGE_SETTINGS.includeResolutionInFilename).toBe(true);
    expect(DEFAULT_IMAGE_SETTINGS.filenamePrefix).toBe("");
  });
});
