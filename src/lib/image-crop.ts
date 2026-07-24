/**
 * Pure geometry helpers for batch image resize / crop modes.
 * No canvas or DOM access — safe to unit-test in Node.
 */

import type { CropFocus, FitMode } from "@/lib/image-compressor-config";

export type Size = { width: number; height: number };

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DrawPlan = {
  /** Source crop rectangle in original image pixels. */
  source: Rect;
  /** Destination rectangle on the output canvas. */
  destination: Rect;
  /** Final output canvas size. */
  output: Size;
  /** True when either dimension was enlarged past the source. */
  enlarged: boolean;
  /** Scale factor applied to the source (destination / crop). */
  scale: number;
};

function assertPositiveSize(size: Size, label: string): void {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new Error(`${label} must be positive finite dimensions.`);
  }
}

function roundRect(rect: Rect): Rect {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  return { x, y, width, height };
}

function clampCropToSource(crop: Rect, source: Size): Rect {
  let { x, y, width, height } = roundRect(crop);

  if (x + width > source.width) {
    x = Math.max(0, source.width - width);
  }
  if (y + height > source.height) {
    y = Math.max(0, source.height - height);
  }

  width = Math.min(width, source.width - x);
  height = Math.min(height, source.height - y);

  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

/**
 * Position a crop rectangle of known size inside the source using crop focus.
 */
export function positionCropRect(
  source: Size,
  cropSize: Size,
  focus: CropFocus,
): Rect {
  assertPositiveSize(source, "Source");
  assertPositiveSize(cropSize, "Crop");

  const width = Math.min(cropSize.width, source.width);
  const height = Math.min(cropSize.height, source.height);

  const maxX = Math.max(0, source.width - width);
  const maxY = Math.max(0, source.height - height);

  const horizontal =
    focus === "left" || focus === "top-left" || focus === "bottom-left"
      ? 0
      : focus === "right" || focus === "top-right" || focus === "bottom-right"
        ? 1
        : 0.5;

  const vertical =
    focus === "top" || focus === "top-left" || focus === "top-right"
      ? 0
      : focus === "bottom" ||
          focus === "bottom-left" ||
          focus === "bottom-right"
        ? 1
        : 0.5;

  return clampCropToSource(
    {
      x: maxX * horizontal,
      y: maxY * vertical,
      width,
      height,
    },
    source,
  );
}

/**
 * Source crop rectangle that matches the target aspect ratio (cover / fill-crop).
 */
export function calculateCoverCrop(
  source: Size,
  target: Size,
  focus: CropFocus = "centre",
): Rect {
  assertPositiveSize(source, "Source");
  assertPositiveSize(target, "Target");

  const sourceAspect = source.width / source.height;
  const targetAspect = target.width / target.height;

  let cropWidth: number;
  let cropHeight: number;

  if (sourceAspect > targetAspect) {
    // Source is wider — crop left/right.
    cropHeight = source.height;
    cropWidth = source.height * targetAspect;
  } else {
    // Source is taller (or equal) — crop top/bottom.
    cropWidth = source.width;
    cropHeight = source.width / targetAspect;
  }

  return positionCropRect(
    source,
    { width: cropWidth, height: cropHeight },
    focus,
  );
}

export type FitInsideLayout = {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  enlarged: boolean;
};

/**
 * Uniform scale to fit inside a box (contain). Centres the result.
 */
export function calculateContainLayout(
  source: Size,
  target: Size,
  allowEnlarge: boolean,
): FitInsideLayout {
  assertPositiveSize(source, "Source");
  assertPositiveSize(target, "Target");

  let scale = Math.min(target.width / source.width, target.height / source.height);
  if (!allowEnlarge) {
    scale = Math.min(scale, 1);
  }

  const drawWidth = Math.max(1, Math.round(source.width * scale));
  const drawHeight = Math.max(1, Math.round(source.height * scale));
  const offsetX = Math.round((target.width - drawWidth) / 2);
  const offsetY = Math.round((target.height - drawHeight) / 2);

  return {
    drawWidth,
    drawHeight,
    offsetX,
    offsetY,
    scale,
    enlarged: scale > 1,
  };
}

/**
 * Resize-only: fit within max bounds, preserve aspect ratio, never crop.
 */
export function calculateResizeOnlySize(
  source: Size,
  maxWidth: number | null,
  maxHeight: number | null,
  allowEnlarge: boolean,
): Size & { scale: number; enlarged: boolean } {
  assertPositiveSize(source, "Source");

  const boundW =
    maxWidth != null && maxWidth > 0 ? maxWidth : Number.POSITIVE_INFINITY;
  const boundH =
    maxHeight != null && maxHeight > 0 ? maxHeight : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(boundW) && !Number.isFinite(boundH)) {
    return {
      width: source.width,
      height: source.height,
      scale: 1,
      enlarged: false,
    };
  }

  let scale = Math.min(boundW / source.width, boundH / source.height);
  if (!allowEnlarge) {
    scale = Math.min(scale, 1);
  }

  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
    scale,
    enlarged: scale > 1,
  };
}

export type GeometryInput = {
  source: Size;
  targetWidth: number | null;
  targetHeight: number | null;
  fitMode: FitMode;
  cropFocus: CropFocus;
  allowEnlarge: boolean;
  /** For fit-inside: pad to exact target size when true. */
  exactDimensions: boolean;
  /** Keep original dimensions — compression / format only. */
  keepOriginal: boolean;
  /**
   * Optional source crop rectangle from manual framing.
   * Built from ManualCropState via cropRectFromManualState so preview and
   * export share one geometry model. Applied for Fill and crop always, and
   * for other fit modes when the user has manually adjusted the framing.
   */
  sourceCropOverride?: Rect | null;
};

/**
 * Build a full draw plan for the selected fit mode.
 */
export function calculateDrawPlan(input: GeometryInput): DrawPlan {
  const { source, fitMode, cropFocus, allowEnlarge, exactDimensions } = input;

  assertPositiveSize(source, "Source");

  if (input.keepOriginal) {
    return {
      source: { x: 0, y: 0, width: source.width, height: source.height },
      destination: { x: 0, y: 0, width: source.width, height: source.height },
      output: { width: source.width, height: source.height },
      enlarged: false,
      scale: 1,
    };
  }

  const targetWidth = input.targetWidth;
  const targetHeight = input.targetHeight;

  if (
    targetWidth == null ||
    targetHeight == null ||
    targetWidth <= 0 ||
    targetHeight <= 0
  ) {
    // Fallback: treat as keep-original when dimensions are missing.
    return calculateDrawPlan({ ...input, keepOriginal: true });
  }

  const target: Size = { width: targetWidth, height: targetHeight };
  const override = input.sourceCropOverride ?? null;
  // When a manual crop is present, treat that region as the content to fit.
  const contentSource: Size = override
    ? { width: override.width, height: override.height }
    : source;
  const contentRect: Rect = override ?? {
    x: 0,
    y: 0,
    width: source.width,
    height: source.height,
  };

  if (fitMode === "fill-crop") {
    const crop = override ?? calculateCoverCrop(source, target, cropFocus);
    const scale = target.width / crop.width;
    return {
      source: crop,
      destination: { x: 0, y: 0, width: target.width, height: target.height },
      output: target,
      enlarged: scale > 1,
      scale,
    };
  }

  if (fitMode === "stretch") {
    const scaleX = target.width / contentSource.width;
    const scaleY = target.height / contentSource.height;
    return {
      source: contentRect,
      destination: { x: 0, y: 0, width: target.width, height: target.height },
      output: target,
      enlarged: scaleX > 1 || scaleY > 1,
      scale: Math.max(scaleX, scaleY),
    };
  }

  if (fitMode === "resize-only") {
    const resized = calculateResizeOnlySize(
      contentSource,
      targetWidth,
      targetHeight,
      allowEnlarge,
    );
    return {
      source: contentRect,
      destination: {
        x: 0,
        y: 0,
        width: resized.width,
        height: resized.height,
      },
      output: { width: resized.width, height: resized.height },
      enlarged: resized.enlarged,
      scale: resized.scale,
    };
  }

  // fit-inside
  const layout = calculateContainLayout(contentSource, target, allowEnlarge);

  if (exactDimensions) {
    return {
      source: contentRect,
      destination: {
        x: layout.offsetX,
        y: layout.offsetY,
        width: layout.drawWidth,
        height: layout.drawHeight,
      },
      output: target,
      enlarged: layout.enlarged,
      scale: layout.scale,
    };
  }

  return {
    source: contentRect,
    destination: {
      x: 0,
      y: 0,
      width: layout.drawWidth,
      height: layout.drawHeight,
    },
    output: { width: layout.drawWidth, height: layout.drawHeight },
    enlarged: layout.enlarged,
    scale: layout.scale,
  };
}

/** True when crop rect stays inside source bounds. */
export function cropWithinBounds(crop: Rect, source: Size): boolean {
  return (
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.width >= 1 &&
    crop.height >= 1 &&
    crop.x + crop.width <= source.width &&
    crop.y + crop.height <= source.height
  );
}
