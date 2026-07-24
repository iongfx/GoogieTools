/**
 * Pure coordinate mapping for the image colour picker.
 * Accounts for zoom, pan, and element layout — not device pixel ratio of the
 * CSS box (sampling uses natural image pixels via canvas).
 */

export type ImageViewTransform = {
  /** Zoom multiplier relative to fit-contain scale (1 = fitted). */
  zoom: number;
  /** Pan offset in preview CSS pixels (positive moves image right/down). */
  panX: number;
  panY: number;
};

export type PreviewLayout = {
  /** Preview element width in CSS pixels. */
  width: number;
  /** Preview element height in CSS pixels. */
  height: number;
  /** Natural image width in pixels. */
  imageWidth: number;
  /** Natural image height in pixels. */
  imageHeight: number;
};

export type MappedPixel = {
  /** Integer source-image pixel coordinates (0-based). */
  x: number;
  y: number;
  /** Whether the point falls inside the image. */
  inside: boolean;
};

/**
 * Fit-contain scale so the full image fits in the preview box at zoom = 1.
 */
export function fitContainScale(layout: PreviewLayout): number {
  if (
    layout.width <= 0 ||
    layout.height <= 0 ||
    layout.imageWidth <= 0 ||
    layout.imageHeight <= 0
  ) {
    return 1;
  }
  return Math.min(
    layout.width / layout.imageWidth,
    layout.height / layout.imageHeight,
  );
}

/**
 * Displayed image size in CSS pixels for the current transform.
 */
export function displayedImageSize(
  layout: PreviewLayout,
  transform: ImageViewTransform,
): { width: number; height: number } {
  const base = fitContainScale(layout);
  const scale = base * transform.zoom;
  return {
    width: layout.imageWidth * scale,
    height: layout.imageHeight * scale,
  };
}

/**
 * Top-left of the image content within the preview (CSS pixels), including pan.
 */
export function imageOriginInPreview(
  layout: PreviewLayout,
  transform: ImageViewTransform,
): { x: number; y: number } {
  const size = displayedImageSize(layout, transform);
  const centeredX = (layout.width - size.width) / 2;
  const centeredY = (layout.height - size.height) / 2;
  return {
    x: centeredX + transform.panX,
    y: centeredY + transform.panY,
  };
}

/**
 * Map a pointer position (relative to the preview element) to a source pixel.
 * Uses floor of exact fractional coordinates — no premature rounding of layout.
 */
export function mapPreviewPointToPixel(
  clientX: number,
  clientY: number,
  previewRect: { left: number; top: number; width: number; height: number },
  layout: PreviewLayout,
  transform: ImageViewTransform,
): MappedPixel {
  const localX = clientX - previewRect.left;
  const localY = clientY - previewRect.top;

  const origin = imageOriginInPreview(
    { ...layout, width: previewRect.width, height: previewRect.height },
    transform,
  );
  const size = displayedImageSize(
    { ...layout, width: previewRect.width, height: previewRect.height },
    transform,
  );

  if (size.width <= 0 || size.height <= 0) {
    return { x: 0, y: 0, inside: false };
  }

  const relX = (localX - origin.x) / size.width;
  const relY = (localY - origin.y) / size.height;

  if (relX < 0 || relY < 0 || relX >= 1 || relY >= 1) {
    return {
      x: Math.floor(clamp01(relX) * layout.imageWidth),
      y: Math.floor(clamp01(relY) * layout.imageHeight),
      inside: false,
    };
  }

  const x = Math.min(
    layout.imageWidth - 1,
    Math.max(0, Math.floor(relX * layout.imageWidth)),
  );
  const y = Math.min(
    layout.imageHeight - 1,
    Math.max(0, Math.floor(relY * layout.imageHeight)),
  );

  return { x, y, inside: true };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Neighbourhood of pixels for the loupe (odd grid size centred on sample).
 */
export function loupeSampleOrigin(
  centreX: number,
  centreY: number,
  gridSize: number,
  imageWidth: number,
  imageHeight: number,
): { startX: number; startY: number } {
  const half = Math.floor(gridSize / 2);
  let startX = centreX - half;
  let startY = centreY - half;
  startX = Math.min(Math.max(0, startX), Math.max(0, imageWidth - gridSize));
  startY = Math.min(Math.max(0, startY), Math.max(0, imageHeight - gridSize));
  return { startX, startY };
}
