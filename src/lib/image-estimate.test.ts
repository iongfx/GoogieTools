import { describe, expect, it } from "vitest";
import { settingsFromPreset } from "@/lib/image-compressor-config";
import { createAutomaticCropState } from "@/lib/image-crop-editor";
import {
  buildItemEstimateKey,
  estimateAvailability,
  estimateSampleScale,
  invalidateAllEstimates,
  invalidateItemEstimate,
  isStaleEstimateResult,
  markResultsStaleAfterSettingsChange,
  projectSampleBytesToTarget,
  qualityChangeAffectsItem,
  replaceEstimateWithActual,
  settingsEstimateKeyForItem,
} from "@/lib/image-estimate";

describe("estimateSampleScale / projectSampleBytesToTarget", () => {
  it("keeps scale at 1 when output fits inside the sample budget", () => {
    expect(estimateSampleScale(450, 300)).toBe(1);
    expect(estimateSampleScale(512, 512)).toBe(1);
  });

  it("downscales large outputs for sampling", () => {
    const scale = estimateSampleScale(1600, 1600);
    expect(scale).toBeCloseTo(512 / 1600, 5);
    expect(scale).toBeLessThan(1);
  });

  it("projects sample bytes to the target pixel count", () => {
    // 100×100 sample → 200×200 target = 4× pixels → 4× bytes
    expect(projectSampleBytesToTarget(1_000, 100, 100, 200, 200)).toBe(4_000);
  });

  it("never returns zero for a positive sample", () => {
    expect(projectSampleBytesToTarget(1, 512, 512, 1600, 1600)).toBeGreaterThan(
      0,
    );
  });
});

describe("estimate keys and availability", () => {
  const source = { width: 1200, height: 800 };
  const target = { width: 450, height: 300 };
  const crop = createAutomaticCropState(source, target, "centre");

  it("marks pending when the key is missing or mismatched", () => {
    expect(estimateAvailability(1200, null, "key-a")).toBe("pending");
    expect(estimateAvailability(1200, "old", "new")).toBe("pending");
  });

  it("marks available and unavailable for matching keys", () => {
    expect(estimateAvailability(1200, "key-a", "key-a")).toBe("available");
    expect(estimateAvailability(null, "key-a", "key-a")).toBe("unavailable");
  });

  it("ignores stale estimate results", () => {
    expect(isStaleEstimateResult("run-1", "run-2")).toBe(true);
    expect(isStaleEstimateResult("run-1", "run-1")).toBe(false);
  });

  it("builds distinct keys when crop state changes for one image", () => {
    const settings = settingsFromPreset("gallery-landscape");
    const base = buildItemEstimateKey(settings, "jpeg", crop);
    const zoomed = buildItemEstimateKey(settings, "jpeg", {
      ...crop,
      zoom: 2,
      adjusted: true,
    });
    expect(base).not.toBe(zoomed);
  });

  it("excludes PNG outputs from lossy quality key changes", () => {
    const jpegSettings = {
      ...settingsFromPreset("gallery-landscape"),
      outputFormat: "jpeg" as const,
      quality: 82,
    };
    const pngSettings = {
      ...settingsFromPreset("gallery-landscape"),
      outputFormat: "png" as const,
      quality: 82,
    };

    const pngAt82 = settingsEstimateKeyForItem(pngSettings, "png");
    const pngAt60 = settingsEstimateKeyForItem(
      { ...pngSettings, quality: 60 },
      "png",
    );
    expect(pngAt82).toBe(pngAt60);

    const jpegAt82 = settingsEstimateKeyForItem(jpegSettings, "jpeg");
    const jpegAt60 = settingsEstimateKeyForItem(
      { ...jpegSettings, quality: 60 },
      "jpeg",
    );
    expect(jpegAt82).not.toBe(jpegAt60);

    expect(qualityChangeAffectsItem("png", "png")).toBe(false);
    expect(qualityChangeAffectsItem("jpeg", "jpeg")).toBe(true);
    expect(qualityChangeAffectsItem("keep", "png")).toBe(false);
    expect(qualityChangeAffectsItem("keep", "jpeg")).toBe(true);
  });
});

describe("estimate invalidation helpers", () => {
  it("invalidates only the affected image estimate after a crop change", () => {
    const items = [
      {
        id: "a",
        kind: "jpeg" as const,
        cropState: null,
        estimatedBytes: 100,
        estimateKey: "a-key",
      },
      {
        id: "b",
        kind: "jpeg" as const,
        cropState: null,
        estimatedBytes: 200,
        estimateKey: "b-key",
      },
    ];
    const next = invalidateItemEstimate(items, "a");
    expect(next[0]?.estimatedBytes).toBeNull();
    expect(next[0]?.estimateKey).toBeNull();
    expect(next[1]?.estimatedBytes).toBe(200);
    expect(next[1]?.estimateKey).toBe("b-key");
  });

  it("invalidates all estimates after a global settings change", () => {
    const items = [
      {
        id: "a",
        kind: "jpeg" as const,
        cropState: null,
        estimatedBytes: 100,
        estimateKey: "a-key",
      },
      {
        id: "b",
        kind: "png" as const,
        cropState: null,
        estimatedBytes: 200,
        estimateKey: "b-key",
      },
    ];
    const next = invalidateAllEstimates(items);
    expect(next.every((item) => item.estimatedBytes == null)).toBe(true);
    expect(next.every((item) => item.estimateKey == null)).toBe(true);
  });

  it("replaces an estimate with an actual size", () => {
    const updated = replaceEstimateWithActual(
      { estimatedBytes: 900, estimateKey: "old" },
      750,
      "fresh",
    );
    expect(updated.estimatedBytes).toBe(750);
    expect(updated.estimateKey).toBe("fresh");
  });

  it("marks actual results stale after settings change", () => {
    const next = markResultsStaleAfterSettingsChange([
      {
        estimatedBytes: 100,
        estimateKey: "k",
        output: { size: 100 },
        status: "complete",
      },
      {
        estimatedBytes: null,
        estimateKey: null,
        output: null,
        status: "ready",
      },
    ]);
    expect(next[0]?.output).toBeNull();
    expect(next[0]?.status).toBe("ready");
    expect(next[0]?.estimatedBytes).toBeNull();
    expect(next[1]?.status).toBe("ready");
  });
});
