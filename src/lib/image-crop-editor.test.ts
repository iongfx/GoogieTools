import { describe, expect, it } from "vitest";
import { IMAGE_CROP_LIMITS } from "@/lib/image-compressor-config";
import { cropWithinBounds } from "@/lib/image-crop";
import {
  applyZoomKeepingCentre,
  aspectRatiosMatch,
  clampZoom,
  createAutomaticCropState,
  cropRectFromManualState,
  effectiveEnlargementScale,
  getCoverCropSize,
  isSignificantlyEnlarged,
  maxZoomForSource,
  nudgePan,
  panDeltaFromPointerDrag,
  previewLayoutContain,
  previewLayoutFromCrop,
  manualCropIsActive,
  reconcileCropState,
  serializeCropState,
  shouldApplyManualCrop,
  transferNormalizedCrop,
  zoomPercent,
  type ManualCropState,
} from "@/lib/image-crop-editor";

const SOURCE = { width: 1200, height: 800 };
const TARGET_450 = { width: 450, height: 300 };

describe("cover crop size and zoom limits", () => {
  it("computes minimum Fill-and-crop scale size for matching aspect", () => {
    const size = getCoverCropSize(SOURCE, 450 / 300);
    expect(size.width).toBeCloseTo(1200, 5);
    expect(size.height).toBeCloseTo(800, 5);
  });

  it("keeps minimum zoom at 1 and caps maximum zoom", () => {
    expect(clampZoom(0.5, SOURCE, 1.5)).toBe(IMAGE_CROP_LIMITS.minZoom);
    expect(clampZoom(10, SOURCE, 1.5)).toBe(maxZoomForSource(SOURCE, 1.5));
    expect(maxZoomForSource(SOURCE, 1.5)).toBeLessThanOrEqual(
      IMAGE_CROP_LIMITS.maxZoom,
    );
  });
});

describe("cropRectFromManualState", () => {
  it("fills the frame at zoom 1 without exposing empty area", () => {
    const state = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    const crop = cropRectFromManualState(SOURCE, TARGET_450, state);
    expect(cropWithinBounds(crop, SOURCE)).toBe(true);
    expect(crop.width / crop.height).toBeCloseTo(450 / 300, 2);
  });

  it("clamps dragging so the crop stays inside the source", () => {
    const portrait = { width: 800, height: 1200 };
    const target = { width: 450, height: 300 };
    const state: ManualCropState = {
      ...createAutomaticCropState(portrait, target, "centre"),
      zoom: 2,
      panX: -10,
      panY: 10,
      adjusted: true,
    };
    const crop = cropRectFromManualState(portrait, target, state);
    expect(cropWithinBounds(crop, portrait)).toBe(true);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(portrait.width);
    expect(crop.y + crop.height).toBeLessThanOrEqual(portrait.height);
  });

  it("clamps crop at every pan movement boundary", () => {
    const portrait = { width: 800, height: 1200 };
    for (const panX of [0, 0.5, 1]) {
      for (const panY of [0, 0.5, 1]) {
        const crop = cropRectFromManualState(portrait, TARGET_450, {
          zoom: 1.8,
          panX,
          panY,
        });
        expect(cropWithinBounds(crop, portrait)).toBe(true);
        expect(crop.x + crop.width).toBeLessThanOrEqual(portrait.width);
        expect(crop.y + crop.height).toBeLessThanOrEqual(portrait.height);
      }
    }
  });

  it("respects minimum and maximum permitted zoom", () => {
    const min = applyZoomKeepingCentre(
      createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      IMAGE_CROP_LIMITS.minZoom,
      SOURCE,
      TARGET_450,
    );
    const max = applyZoomKeepingCentre(
      createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      IMAGE_CROP_LIMITS.maxZoom + 5,
      SOURCE,
      TARGET_450,
    );
    expect(min.zoom).toBe(IMAGE_CROP_LIMITS.minZoom);
    expect(max.zoom).toBe(maxZoomForSource(SOURCE, 450 / 300));
    expect(
      cropWithinBounds(
        cropRectFromManualState(SOURCE, TARGET_450, max),
        SOURCE,
      ),
    ).toBe(true);
  });

  it("zooming in shrinks the source crop rectangle", () => {
    const base = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    const zoomed = applyZoomKeepingCentre(base, 2, SOURCE, TARGET_450);
    const a = cropRectFromManualState(SOURCE, TARGET_450, base);
    const b = cropRectFromManualState(SOURCE, TARGET_450, zoomed);
    expect(b.width).toBeLessThan(a.width);
    expect(b.height).toBeLessThan(a.height);
  });

  it("shares one crop rectangle between preview layout and export geometry", () => {
    const state = {
      ...createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      zoom: 1.75,
      panX: 0.15,
      panY: 0.85,
      adjusted: true,
    };
    const exportCrop = cropRectFromManualState(SOURCE, TARGET_450, state);
    const preview = previewLayoutFromCrop(SOURCE, TARGET_450, state, 750, 500);
    expect(preview.sourceCrop).toEqual(exportCrop);
  });
});

describe("automatic crop from focus", () => {
  it("starts centred for centre focus", () => {
    const state = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    expect(state.adjusted).toBe(false);
    expect(state.zoom).toBe(1);
    expect(state.panX).toBeCloseTo(0.5, 5);
    expect(state.panY).toBeCloseTo(0.5, 5);
  });

  it("maps top focus to panY = 0 for tall sources", () => {
    const portrait = { width: 800, height: 1200 };
    const state = createAutomaticCropState(portrait, TARGET_450, "top");
    expect(state.panY).toBe(0);
  });
});

describe("reconcileCropState / aspect ratio", () => {
  it("preserves crop when output dimensions change but aspect stays the same", () => {
    const previous = {
      ...createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      zoom: 1.5,
      panX: 0.2,
      panY: 0.8,
      adjusted: true,
    };
    const { state, message } = reconcileCropState(
      previous,
      SOURCE,
      { width: 900, height: 600 },
      "centre",
    );
    expect(message).toBeNull();
    expect(state.zoom).toBeCloseTo(1.5, 5);
    expect(state.panX).toBeCloseTo(0.2, 5);
    expect(state.panY).toBeCloseTo(0.8, 5);
    expect(state.adjusted).toBe(true);
    expect(aspectRatiosMatch(state.aspectRatio, 900 / 600)).toBe(true);
  });

  it("preserves relative zoom and pan when aspect ratio changes", () => {
    const previous = {
      ...createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      zoom: 2,
      panX: 0.1,
      panY: 0.9,
      adjusted: true,
    };
    const nextTarget = { width: 600, height: 600 };
    const { state, message } = reconcileCropState(
      previous,
      SOURCE,
      nextTarget,
      "centre",
    );
    expect(message).toBeNull();
    expect(state.adjusted).toBe(true);
    expect(state.needsReview).toBe(false);
    expect(state.zoom).toBeCloseTo(2, 5);
    expect(state.panX).toBeCloseTo(0.1, 5);
    expect(state.panY).toBeCloseTo(0.9, 5);
    expect(aspectRatiosMatch(state.aspectRatio, 1)).toBe(true);

    const crop = cropRectFromManualState(SOURCE, nextTarget, state);
    expect(cropWithinBounds(crop, SOURCE)).toBe(true);
    expect(crop.width / crop.height).toBeCloseTo(1, 2);
  });

  it("rebuilds automatic crop when aspect changes but the crop was never adjusted", () => {
    const tallSource = { width: 800, height: 1200 };
    const previous = createAutomaticCropState(tallSource, TARGET_450, "centre");
    const { state } = reconcileCropState(
      previous,
      tallSource,
      { width: 600, height: 600 },
      "top",
    );
    expect(state.adjusted).toBe(false);
    expect(state.zoom).toBe(1);
    expect(state.panY).toBe(0);
  });
});

describe("preview layout and pointer pan", () => {
  it("maps source crop into a preview layout that covers the frame", () => {
    const state = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    const layout = previewLayoutFromCrop(SOURCE, TARGET_450, state, 750, 500);
    expect(layout.sourceCrop.width).toBeGreaterThan(0);
    expect(layout.imageWidth).toBeGreaterThanOrEqual(750);
    expect(layout.imageHeight).toBeGreaterThanOrEqual(500);
  });

  it("best-fits a landscape image inside a square keep-original frame", () => {
    const layout = previewLayoutContain(SOURCE, 400, 400);
    expect(layout.imageWidth).toBeCloseTo(400, 5);
    expect(layout.imageHeight).toBeCloseTo((800 / 1200) * 400, 5);
    expect(layout.offsetX).toBeCloseTo(0, 5);
    expect(layout.offsetY).toBeCloseTo((400 - layout.imageHeight) / 2, 5);
    expect(layout.sourceCrop).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    });
  });

  it("converts pointer drag into clamped pan changes", () => {
    const portrait = { width: 800, height: 1200 };
    const state = createAutomaticCropState(portrait, TARGET_450, "centre");
    // Tall source → vertical pan room at zoom 1; drag vertically.
    const next = panDeltaFromPointerDrag(
      0,
      40,
      portrait,
      TARGET_450,
      state,
      450,
      300,
    );
    expect(next.panY).toBeGreaterThanOrEqual(0);
    expect(next.panY).toBeLessThanOrEqual(1);
    expect(next.panY).not.toBe(state.panY);
  });
});

describe("keyboard nudges and zoom percent", () => {
  it("applies keyboard pan increments", () => {
    const state = createAutomaticCropState(
      { width: 800, height: 1200 },
      TARGET_450,
      "centre",
    );
    const nudged = nudgePan(
      state,
      IMAGE_CROP_LIMITS.keyboardPanStep,
      0,
      { width: 800, height: 1200 },
      TARGET_450,
    );
    expect(nudged.adjusted).toBe(true);
    expect(nudged.panX).toBeGreaterThan(state.panX);
  });

  it("reports zoom percentage", () => {
    expect(zoomPercent(1)).toBe(100);
    expect(zoomPercent(1.5)).toBe(150);
  });
});

describe("enlargement detection", () => {
  it("detects significant enlargement from crop vs target", () => {
    const tiny = { width: 100, height: 80 };
    const state = createAutomaticCropState(tiny, TARGET_450, "centre");
    expect(effectiveEnlargementScale(tiny, TARGET_450, state)).toBeGreaterThan(
      1.5,
    );
    expect(isSignificantlyEnlarged(tiny, TARGET_450, state)).toBe(true);
  });

  it("does not warn for large sources into small targets", () => {
    const state = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    expect(isSignificantlyEnlarged(SOURCE, TARGET_450, state)).toBe(false);
  });
});

describe("serialize / transfer / independent state", () => {
  it("serializes crop state stably", () => {
    const state = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    expect(serializeCropState(state)).toMatch(/:/);
  });

  it("transfers normalized crop to another image with clamping", () => {
    const from = {
      ...createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      zoom: 2,
      panX: 0.1,
      panY: 0.9,
      adjusted: true,
    };
    const other = { width: 900, height: 1600 };
    const transferred = transferNormalizedCrop(from, other, TARGET_450);
    expect(transferred.adjusted).toBe(true);
    expect(transferred.zoom).toBeGreaterThanOrEqual(1);
    const crop = cropRectFromManualState(other, TARGET_450, transferred);
    expect(cropWithinBounds(crop, other)).toBe(true);
  });

  it("keeps independent crop states when switching images conceptually", () => {
    const a = {
      ...createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      zoom: 2,
      adjusted: true,
    };
    const b = createAutomaticCropState(
      { width: 800, height: 1200 },
      TARGET_450,
      "top",
    );
    expect(a.zoom).toBe(2);
    expect(b.zoom).toBe(1);
    expect(b.panY).toBe(0);
  });
});

describe("reset helpers", () => {
  it("resetting one crop restores automatic state", () => {
    const adjusted = {
      ...createAutomaticCropState(SOURCE, TARGET_450, "centre"),
      zoom: 3,
      panX: 0,
      adjusted: true,
    };
    const reset = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    expect(reset.adjusted).toBe(false);
    expect(reset.zoom).toBe(1);
    expect(adjusted.zoom).not.toBe(reset.zoom);
  });
});

describe("manual crop availability across presets", () => {
  it("allows framing for any sized preset, not only fill-crop", () => {
    expect(manualCropIsActive(false, 1600, 1600)).toBe(true);
    expect(manualCropIsActive(true, 1600, 1600)).toBe(false);
  });

  it("applies crop framing whenever a crop state exists", () => {
    const automatic = createAutomaticCropState(SOURCE, TARGET_450, "centre");
    expect(shouldApplyManualCrop(false, "fill-crop", automatic)).toBe(true);
    expect(shouldApplyManualCrop(true, "fill-crop", automatic)).toBe(false);
    expect(shouldApplyManualCrop(false, "fill-crop", null)).toBe(false);
  });
});
