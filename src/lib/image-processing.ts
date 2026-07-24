/**
 * Browser image decode / transform / encode for the Batch Image Compressor.
 * Geometry lives in image-crop.ts; keep DOM/canvas work here.
 */

import {
  IMAGE_BATCH_LIMITS,
  type CropFocus,
  type FitInsideBackground,
  type ImageCompressorSettings,
} from "@/lib/image-compressor-config";
import { calculateDrawPlan, type DrawPlan } from "@/lib/image-crop";
import {
  cropRectFromManualState,
  shouldApplyManualCrop,
  type ManualCropState,
} from "@/lib/image-crop-editor";
import {
  ESTIMATE_SAMPLE_MAX_EDGE,
  estimateSampleScale,
  projectSampleBytesToTarget,
} from "@/lib/image-estimate";
import {
  buildOutputFilename,
  validateDecodedDimensions,
  looksLikeAnimatedWebp,
  animatedWebpMessage,
} from "@/lib/image-file-utils";
import {
  canvasNeedsBackground,
  outputMimeFor,
  resolveImageKind,
  resolveOutputKind,
  type ImageKind,
} from "@/lib/image-formats";

export type ProcessImageInput = {
  file: File;
  settings: ImageCompressorSettings;
  cropFocusOverride?: CropFocus;
  /** Per-image manual Fill-and-crop state shared with the preview editor. */
  manualCrop?: ManualCropState | null;
  /** Used to keep ZIP names unique. */
  duplicateIndex?: number;
  /**
   * Display / download basename (may differ from file.name after rename).
   * Defaults to file.name when omitted.
   */
  sourceName?: string;
};

export type ProcessImageSuccess = {
  ok: true;
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  filename: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceKind: ImageKind;
  outputKind: ImageKind;
  plan: DrawPlan;
  warning: string | null;
};

export type ProcessImageFailure = {
  ok: false;
  message: string;
};

export type ProcessImageResult = ProcessImageSuccess | ProcessImageFailure;

function backgroundCss(
  background: FitInsideBackground,
  custom: string,
  outputKind: ImageKind,
): string | null {
  if (background === "transparent") {
    if (outputKind === "jpeg") return "#ffffff";
    return null;
  }
  if (background === "black") return "#000000";
  if (background === "custom") {
    return /^#[0-9a-fA-F]{6}$/.test(custom) ? custom : "#ffffff";
  }
  return "#ffffff";
}

function enlargementWarning(plan: DrawPlan): string | null {
  if (plan.scale > IMAGE_BATCH_LIMITS.enlargeWarnFactor) {
    return "This crop is enlarged and may look softer.";
  }
  return null;
}

/**
 * Decode an image file into an ImageBitmap with orientation respected when supported.
 *
 * Supported approach: prefer `createImageBitmap(file, { imageOrientation: "from-image" })`
 * so smartphone EXIF rotation is applied before crop geometry. Fallbacks omit the option
 * or use HTMLImageElement; behaviour can vary by browser, but we avoid a heavy EXIF parser.
 */
export async function decodeImageFile(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      // Prefer orientation from EXIF when the engine supports the option.
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      // Fall through to plain createImageBitmap / HTMLImageElement.
      try {
        return await createImageBitmap(file);
      } catch {
        // continue
      }
    }
  }

  return decodeWithHtmlImage(file);
}

function decodeWithHtmlImage(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      createImageBitmap(img)
        .then(resolve)
        .catch(() => {
          // Last resort: draw via canvas to bitmap
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas is not available in this browser."));
              return;
            }
            ctx.drawImage(img, 0, 0);
            createImageBitmap(canvas).then(resolve).catch(reject);
          } catch (error) {
            reject(error);
          }
        });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be decoded. It may be corrupted."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              `Could not encode ${mimeType}. Your browser may not support this format.`,
            ),
          );
          return;
        }
        resolve(blob);
      },
      mimeType,
      mimeType === "image/png" ? undefined : quality / 100,
    );
  });
}

/**
 * Process a single image file according to settings.
 */
export async function processImageFile(
  input: ProcessImageInput,
): Promise<ProcessImageResult> {
  const { file, settings } = input;
  const sourceKind = resolveImageKind(file);

  if (sourceKind === "webp") {
    try {
      const prefix = await file.slice(0, 512 * 1024).arrayBuffer();
      if (looksLikeAnimatedWebp(prefix)) {
        return { ok: false, message: animatedWebpMessage() };
      }
    } catch {
      // Ignore peek failures; decoding will surface real errors.
    }
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeImageFile(file);
  } catch {
    return {
      ok: false,
      message: "This image could not be decoded. It may be corrupted or unsupported.",
    };
  }

  try {
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const dimensionError = validateDecodedDimensions(sourceWidth, sourceHeight);
    if (dimensionError) {
      return { ok: false, message: dimensionError };
    }

    const keepOriginal = settings.presetId === "keep-original";
    const cropFocus = input.cropFocusOverride ?? settings.cropFocus;

    const sourceSize = { width: sourceWidth, height: sourceHeight };
    const sourceCropOverride =
      settings.width != null &&
      settings.height != null &&
      shouldApplyManualCrop(keepOriginal, settings.fitMode, input.manualCrop)
        ? cropRectFromManualState(
            sourceSize,
            { width: settings.width, height: settings.height },
            input.manualCrop!,
          )
        : null;

    const plan = calculateDrawPlan({
      source: sourceSize,
      targetWidth: settings.width,
      targetHeight: settings.height,
      fitMode: settings.fitMode,
      cropFocus,
      allowEnlarge: settings.allowEnlarge,
      exactDimensions: settings.exactDimensions,
      keepOriginal,
      sourceCropOverride,
    });

    if (
      plan.output.width > IMAGE_BATCH_LIMITS.maxOutputWidth ||
      plan.output.height > IMAGE_BATCH_LIMITS.maxOutputHeight
    ) {
      return {
        ok: false,
        message: `Output size ${plan.output.width} × ${plan.output.height} px exceeds the ${IMAGE_BATCH_LIMITS.maxOutputWidth.toLocaleString()} × ${IMAGE_BATCH_LIMITS.maxOutputHeight.toLocaleString()} px limit.`,
      };
    }

    const outputKind = resolveOutputKind(settings.outputFormat, sourceKind);
    const mimeType = outputMimeFor(settings.outputFormat, sourceKind);

    const canvas = document.createElement("canvas");
    canvas.width = plan.output.width;
    canvas.height = plan.output.height;
    const ctx = canvas.getContext("2d", { alpha: outputKind !== "jpeg" });
    if (!ctx) {
      return { ok: false, message: "Canvas is not available in this browser." };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const needsBg =
      settings.fitMode === "fit-inside" && settings.exactDimensions
        ? true
        : canvasNeedsBackground(outputKind, true);

    const bg = backgroundCss(
      settings.fitInsideBackground,
      settings.customBackground,
      outputKind,
    );

    if (needsBg && bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (outputKind === "jpeg") {
      ctx.fillStyle = bg ?? "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(
      bitmap,
      plan.source.x,
      plan.source.y,
      plan.source.width,
      plan.source.height,
      plan.destination.x,
      plan.destination.y,
      plan.destination.width,
      plan.destination.height,
    );

    let blob: Blob;
    try {
      blob = await canvasToBlob(canvas, mimeType, settings.quality);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not encode the processed image.";
      return { ok: false, message };
    }

    // Release canvas pixels promptly.
    canvas.width = 0;
    canvas.height = 0;

    const filename = buildOutputFilename({
      sourceName: input.sourceName ?? file.name,
      outputKind,
      width: plan.output.width,
      height: plan.output.height,
      keepOriginal,
      duplicateIndex: input.duplicateIndex,
      filenamePrefix: settings.filenamePrefix,
      includeResolutionInFilename: settings.includeResolutionInFilename,
    });

    return {
      ok: true,
      blob,
      width: plan.output.width,
      height: plan.output.height,
      mimeType,
      filename,
      sourceWidth,
      sourceHeight,
      sourceKind,
      outputKind,
      plan,
      warning: enlargementWarning(plan),
    };
  } finally {
    bitmap.close();
  }
}

export type EstimateImageSuccess = {
  ok: true;
  estimatedBytes: number;
  outputWidth: number;
  outputHeight: number;
  sampleWidth: number;
  sampleHeight: number;
};

export type EstimateImageResult = EstimateImageSuccess | ProcessImageFailure;

/**
 * Encode a downsampled sample of the final output and project bytes to full size.
 * Uses the same crop / draw plan as export so estimates track framing changes.
 */
export async function estimateImageFile(
  input: ProcessImageInput,
): Promise<EstimateImageResult> {
  const { file, settings } = input;
  const sourceKind = resolveImageKind(file);

  if (sourceKind === "webp") {
    try {
      const prefix = await file.slice(0, 512 * 1024).arrayBuffer();
      if (looksLikeAnimatedWebp(prefix)) {
        return { ok: false, message: animatedWebpMessage() };
      }
    } catch {
      // Ignore peek failures; decoding will surface real errors.
    }
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeImageFile(file);
  } catch {
    return {
      ok: false,
      message: "This image could not be decoded. It may be corrupted or unsupported.",
    };
  }

  try {
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const dimensionError = validateDecodedDimensions(sourceWidth, sourceHeight);
    if (dimensionError) {
      return { ok: false, message: dimensionError };
    }

    const keepOriginal = settings.presetId === "keep-original";
    const cropFocus = input.cropFocusOverride ?? settings.cropFocus;
    const sourceSize = { width: sourceWidth, height: sourceHeight };
    const sourceCropOverride =
      settings.width != null &&
      settings.height != null &&
      shouldApplyManualCrop(keepOriginal, settings.fitMode, input.manualCrop)
        ? cropRectFromManualState(
            sourceSize,
            { width: settings.width, height: settings.height },
            input.manualCrop!,
          )
        : null;

    const plan = calculateDrawPlan({
      source: sourceSize,
      targetWidth: settings.width,
      targetHeight: settings.height,
      fitMode: settings.fitMode,
      cropFocus,
      allowEnlarge: settings.allowEnlarge,
      exactDimensions: settings.exactDimensions,
      keepOriginal,
      sourceCropOverride,
    });

    if (
      plan.output.width > IMAGE_BATCH_LIMITS.maxOutputWidth ||
      plan.output.height > IMAGE_BATCH_LIMITS.maxOutputHeight
    ) {
      return {
        ok: false,
        message: `Output size ${plan.output.width} × ${plan.output.height} px exceeds the ${IMAGE_BATCH_LIMITS.maxOutputWidth.toLocaleString()} × ${IMAGE_BATCH_LIMITS.maxOutputHeight.toLocaleString()} px limit.`,
      };
    }

    const outputKind = resolveOutputKind(settings.outputFormat, sourceKind);
    const mimeType = outputMimeFor(settings.outputFormat, sourceKind);
    const scale = estimateSampleScale(
      plan.output.width,
      plan.output.height,
      ESTIMATE_SAMPLE_MAX_EDGE,
    );
    const sampleWidth = Math.max(1, Math.round(plan.output.width * scale));
    const sampleHeight = Math.max(1, Math.round(plan.output.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext("2d", { alpha: outputKind !== "jpeg" });
    if (!ctx) {
      return { ok: false, message: "Canvas is not available in this browser." };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const needsBg =
      settings.fitMode === "fit-inside" && settings.exactDimensions
        ? true
        : canvasNeedsBackground(outputKind, true);

    const bg = backgroundCss(
      settings.fitInsideBackground,
      settings.customBackground,
      outputKind,
    );

    if (needsBg && bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (outputKind === "jpeg") {
      ctx.fillStyle = bg ?? "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(
      bitmap,
      plan.source.x,
      plan.source.y,
      plan.source.width,
      plan.source.height,
      Math.round(plan.destination.x * scale),
      Math.round(plan.destination.y * scale),
      Math.max(1, Math.round(plan.destination.width * scale)),
      Math.max(1, Math.round(plan.destination.height * scale)),
    );

    let blob: Blob;
    try {
      blob = await canvasToBlob(canvas, mimeType, settings.quality);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not encode the processed image.";
      return { ok: false, message };
    }

    canvas.width = 0;
    canvas.height = 0;

    const estimatedBytes = projectSampleBytesToTarget(
      blob.size,
      sampleWidth,
      sampleHeight,
      plan.output.width,
      plan.output.height,
    );

    return {
      ok: true,
      estimatedBytes,
      outputWidth: plan.output.width,
      outputHeight: plan.output.height,
      sampleWidth,
      sampleHeight,
    };
  } finally {
    bitmap.close();
  }
}

/** Yield to the browser event loop between batch items. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

/**
 * Pure helper: build the draw plan used by processing (exported for tests).
 */
export function planForSettings(
  sourceWidth: number,
  sourceHeight: number,
  settings: ImageCompressorSettings,
  cropFocusOverride?: CropFocus,
  manualCrop?: ManualCropState | null,
): DrawPlan {
  const keepOriginal = settings.presetId === "keep-original";
  const source = { width: sourceWidth, height: sourceHeight };
  const sourceCropOverride =
    settings.width != null &&
    settings.height != null &&
    shouldApplyManualCrop(keepOriginal, settings.fitMode, manualCrop)
      ? cropRectFromManualState(
          source,
          { width: settings.width, height: settings.height },
          manualCrop!,
        )
      : null;

  return calculateDrawPlan({
    source,
    targetWidth: settings.width,
    targetHeight: settings.height,
    fitMode: settings.fitMode,
    cropFocus: cropFocusOverride ?? settings.cropFocus,
    allowEnlarge: settings.allowEnlarge,
    exactDimensions: settings.exactDimensions,
    keepOriginal,
    sourceCropOverride,
  });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the browser has a chance to start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
