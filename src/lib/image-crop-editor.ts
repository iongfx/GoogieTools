/**
 * Pure manual crop / zoom state for Fill-and-crop editing.
 * Preview and canvas export must both use these helpers.
 */

import {
  IMAGE_BATCH_LIMITS,
  IMAGE_CROP_LIMITS,
  type CropFocus,
  type FitMode,
} from "@/lib/image-compressor-config";
import {
  calculateCoverCrop,
  type Rect,
  type Size,
} from "@/lib/image-crop";

export type ManualCropState = {
  /** Zoom relative to the minimum cover scale. 1 = frame just filled. */
  zoom: number;
  /** Normalized horizontal pan in [0, 1] within the allowed range. */
  panX: number;
  /** Normalized vertical pan in [0, 1] within the allowed range. */
  panY: number;
  /** True after the user has dragged, zoomed, or nudged this image. */
  adjusted: boolean;
  /** Target aspect ratio (width / height) this crop was authored against. */
  aspectRatio: number;
  /** Optional review flag for UI messaging (normally false when framing is preserved). */
  needsReview: boolean;
  reviewMessage: string | null;
};

export type PreviewImageLayout = {
  /** CSS width of the positioned source image relative to the frame. */
  imageWidth: number;
  imageHeight: number;
  /** CSS left offset of the image inside the frame. */
  offsetX: number;
  offsetY: number;
  sourceCrop: Rect;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function aspectRatioOf(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
    return 1;
  }
  return width / height;
}

export function aspectRatiosMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= IMAGE_CROP_LIMITS.aspectRatioEpsilon;
}

/**
 * Source crop size at minimum zoom (zoom = 1) for a target aspect ratio.
 */
export function getCoverCropSize(source: Size, targetAspect: number): Size {
  const sourceAspect = source.width / source.height;
  if (sourceAspect > targetAspect) {
    return {
      width: source.height * targetAspect,
      height: source.height,
    };
  }
  return {
    width: source.width,
    height: source.width / targetAspect,
  };
}

export function maxZoomForSource(source: Size, targetAspect: number): number {
  const base = getCoverCropSize(source, targetAspect);
  // Keep at least 1px of crop on each side; also respect global max.
  const byWidth = base.width / 1;
  const byHeight = base.height / 1;
  const geometricMax = Math.min(byWidth, byHeight);
  return clamp(Math.min(geometricMax, IMAGE_CROP_LIMITS.maxZoom), IMAGE_CROP_LIMITS.minZoom, IMAGE_CROP_LIMITS.maxZoom);
}

export function clampZoom(
  zoom: number,
  source: Size,
  targetAspect: number,
): number {
  return clamp(
    zoom,
    IMAGE_CROP_LIMITS.minZoom,
    maxZoomForSource(source, targetAspect),
  );
}

export function clampPan(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Convert manual crop state into a source rectangle in image pixels.
 */
export function cropRectFromManualState(
  source: Size,
  target: Size,
  state: Pick<ManualCropState, "zoom" | "panX" | "panY">,
): Rect {
  const targetAspect = aspectRatioOf(target.width, target.height);
  const base = getCoverCropSize(source, targetAspect);
  const zoom = clampZoom(state.zoom, source, targetAspect);
  const cropWidth = base.width / zoom;
  const cropHeight = base.height / zoom;
  const maxX = Math.max(0, source.width - cropWidth);
  const maxY = Math.max(0, source.height - cropHeight);
  const x = clampPan(state.panX) * maxX;
  const y = clampPan(state.panY) * maxY;

  // Round carefully to avoid transparent edge lines while staying in bounds.
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rw = Math.round(cropWidth);
  let rh = Math.round(cropHeight);
  rw = Math.max(1, Math.min(rw, source.width));
  rh = Math.max(1, Math.min(rh, source.height));
  rx = clamp(rx, 0, source.width - rw);
  ry = clamp(ry, 0, source.height - rh);

  return { x: rx, y: ry, width: rw, height: rh };
}

/**
 * Build the automatic starting crop from the global crop focus.
 */
export function createAutomaticCropState(
  source: Size,
  target: Size,
  focus: CropFocus,
): ManualCropState {
  const targetAspect = aspectRatioOf(target.width, target.height);
  const crop = calculateCoverCrop(source, target, focus);
  const base = getCoverCropSize(source, targetAspect);
  const maxX = Math.max(0, source.width - base.width);
  const maxY = Math.max(0, source.height - base.height);

  return {
    zoom: IMAGE_CROP_LIMITS.minZoom,
    panX: maxX > 0 ? clampPan(crop.x / maxX) : 0.5,
    panY: maxY > 0 ? clampPan(crop.y / maxY) : 0.5,
    adjusted: false,
    aspectRatio: targetAspect,
    needsReview: false,
    reviewMessage: null,
  };
}

export function clampCropState(
  state: ManualCropState,
  source: Size,
  target: Size,
): ManualCropState {
  const targetAspect = aspectRatioOf(target.width, target.height);
  return {
    ...state,
    zoom: clampZoom(state.zoom, source, targetAspect),
    panX: clampPan(state.panX),
    panY: clampPan(state.panY),
    aspectRatio: targetAspect,
  };
}

/**
 * Reconcile saved crop state when global target dimensions change.
 * Keeps the user's relative zoom and normalized center (pan) whenever possible,
 * including when the output aspect ratio changes.
 */
export function reconcileCropState(
  previous: ManualCropState | null | undefined,
  source: Size,
  target: Size,
  focus: CropFocus,
): { state: ManualCropState; message: string | null } {
  if (!previous) {
    return {
      state: createAutomaticCropState(source, target, focus),
      message: null,
    };
  }

  const nextAspect = aspectRatioOf(target.width, target.height);

  // Same aspect: clamp into the new pixel size and keep framing as-is.
  if (aspectRatiosMatch(previous.aspectRatio, nextAspect)) {
    return {
      state: clampCropState(
        { ...previous, needsReview: false, reviewMessage: null },
        source,
        target,
      ),
      message: null,
    };
  }

  // Different aspect: transfer relative zoom + pan into the new shape.
  // This avoids forcing the user to re-frame every image after a preset/size change.
  if (previous.adjusted) {
    return {
      state: transferNormalizedCrop(previous, source, target),
      message: null,
    };
  }

  return {
    state: createAutomaticCropState(source, target, focus),
    message: null,
  };
}

/**
 * Manual framing is available whenever the preset has output dimensions
 * (not Keep original). The tool always uses fill-and-crop framing.
 */
export function manualCropIsActive(
  keepOriginal: boolean,
  targetWidth: number,
  targetHeight: number,
): boolean {
  return (
    !keepOriginal &&
    Number.isFinite(targetWidth) &&
    Number.isFinite(targetHeight) &&
    targetWidth > 0 &&
    targetHeight > 0
  );
}

/** Whether export should use the saved ManualCropState as a source crop. */
export function shouldApplyManualCrop(
  keepOriginal: boolean,
  _fitMode: FitMode,
  manualCrop: ManualCropState | null | undefined,
): boolean {
  return !keepOriginal && Boolean(manualCrop);
}

/**
 * Layout for CSS preview: image sized/offset so the visible frame matches
 * the source crop rectangle that export will use.
 */
export function previewLayoutFromCrop(
  source: Size,
  target: Size,
  state: Pick<ManualCropState, "zoom" | "panX" | "panY">,
  frameWidth: number,
  frameHeight: number,
): PreviewImageLayout {
  const sourceCrop = cropRectFromManualState(source, target, state);
  const scaleX = frameWidth / sourceCrop.width;
  const scaleY = frameHeight / sourceCrop.height;
  return {
    imageWidth: source.width * scaleX,
    imageHeight: source.height * scaleY,
    offsetX: -sourceCrop.x * scaleX,
    offsetY: -sourceCrop.y * scaleY,
    sourceCrop,
  };
}

/**
 * Best-fit (contain) layout: whole image visible inside the frame, centered.
 * Empty letterbox / pillarbox areas are left for the UI to grey out.
 */
export function previewLayoutContain(
  source: Size,
  frameWidth: number,
  frameHeight: number,
): PreviewImageLayout {
  if (
    source.width <= 0 ||
    source.height <= 0 ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return {
      imageWidth: 0,
      imageHeight: 0,
      offsetX: 0,
      offsetY: 0,
      sourceCrop: { x: 0, y: 0, width: source.width, height: source.height },
    };
  }

  const scale = Math.min(
    frameWidth / source.width,
    frameHeight / source.height,
  );
  const imageWidth = source.width * scale;
  const imageHeight = source.height * scale;
  return {
    imageWidth,
    imageHeight,
    offsetX: (frameWidth - imageWidth) / 2,
    offsetY: (frameHeight - imageHeight) / 2,
    sourceCrop: { x: 0, y: 0, width: source.width, height: source.height },
  };
}

/**
 * Convert a pointer drag in preview frame pixels into a pan delta.
 * Dragging the image right decreases the crop x (shows more of the left).
 */
export function panDeltaFromPointerDrag(
  deltaX: number,
  deltaY: number,
  source: Size,
  target: Size,
  state: Pick<ManualCropState, "zoom" | "panX" | "panY">,
  frameWidth: number,
  frameHeight: number,
): { panX: number; panY: number } {
  const sourceCrop = cropRectFromManualState(source, target, state);
  const targetAspect = aspectRatioOf(target.width, target.height);
  const zoom = clampZoom(state.zoom, source, targetAspect);
  const base = getCoverCropSize(source, targetAspect);
  const cropWidth = base.width / zoom;
  const cropHeight = base.height / zoom;
  const maxX = Math.max(0, source.width - cropWidth);
  const maxY = Math.max(0, source.height - cropHeight);

  const sourceDeltaX = (-deltaX / frameWidth) * sourceCrop.width;
  const sourceDeltaY = (-deltaY / frameHeight) * sourceCrop.height;

  return {
    panX: maxX > 0 ? clampPan(state.panX + sourceDeltaX / maxX) : 0.5,
    panY: maxY > 0 ? clampPan(state.panY + sourceDeltaY / maxY) : 0.5,
  };
}

export function applyZoomKeepingCentre(
  state: ManualCropState,
  nextZoom: number,
  source: Size,
  target: Size,
): ManualCropState {
  const clamped = clampCropState(
    { ...state, zoom: nextZoom, adjusted: true, needsReview: false, reviewMessage: null },
    source,
    target,
  );
  return clamped;
}

export function nudgePan(
  state: ManualCropState,
  deltaX: number,
  deltaY: number,
  source: Size,
  target: Size,
): ManualCropState {
  return clampCropState(
    {
      ...state,
      panX: state.panX + deltaX,
      panY: state.panY + deltaY,
      adjusted: true,
      needsReview: false,
      reviewMessage: null,
    },
    source,
    target,
  );
}

export function zoomPercent(zoom: number): number {
  return Math.round(zoom * 100);
}

/**
 * Effective enlargement scale from source crop to output pixels.
 */
export function effectiveEnlargementScale(
  source: Size,
  target: Size,
  state: Pick<ManualCropState, "zoom" | "panX" | "panY">,
): number {
  const crop = cropRectFromManualState(source, target, state);
  const scaleX = target.width / crop.width;
  const scaleY = target.height / crop.height;
  return Math.max(scaleX, scaleY);
}

export function isSignificantlyEnlarged(
  source: Size,
  target: Size,
  state: Pick<ManualCropState, "zoom" | "panX" | "panY">,
  threshold: number = IMAGE_BATCH_LIMITS.enlargeWarnFactor,
): boolean {
  return effectiveEnlargementScale(source, target, state) > threshold;
}

/**
 * Apply one image's normalized zoom/pan to another source (clamped).
 */
export function transferNormalizedCrop(
  from: ManualCropState,
  source: Size,
  target: Size,
): ManualCropState {
  return clampCropState(
    {
      zoom: from.zoom,
      panX: from.panX,
      panY: from.panY,
      adjusted: true,
      aspectRatio: aspectRatioOf(target.width, target.height),
      needsReview: false,
      reviewMessage: null,
    },
    source,
    target,
  );
}

export function serializeCropState(state: ManualCropState): string {
  return [
    state.zoom.toFixed(4),
    state.panX.toFixed(4),
    state.panY.toFixed(4),
    state.adjusted ? "1" : "0",
    state.aspectRatio.toFixed(6),
  ].join(":");
}
