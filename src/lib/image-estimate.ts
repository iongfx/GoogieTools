/**
 * Pure estimate helpers for the Batch Image Compressor.
 * Browser encoding stays in image-processing; projection and invalidation live here.
 */

import {
  IMAGE_QUALITY,
  type ImageCompressorSettings,
} from "@/lib/image-compressor-config";
import { settingsEstimateKey } from "@/lib/image-batch-summary";
import { formatUsesQuality, type ImageKind } from "@/lib/image-formats";
import { serializeCropState, type ManualCropState } from "@/lib/image-crop-editor";

/** Longest output edge used when sampling for size estimates. */
export const ESTIMATE_SAMPLE_MAX_EDGE = 512;

export type EstimateAvailability = "pending" | "available" | "unavailable";

/**
 * Scale factor for a downsampled estimate canvas.
 * Values below 1 mean the sample is smaller than the final output.
 */
export function estimateSampleScale(
  outputWidth: number,
  outputHeight: number,
  maxEdge: number = ESTIMATE_SAMPLE_MAX_EDGE,
): number {
  if (
    !Number.isFinite(outputWidth) ||
    !Number.isFinite(outputHeight) ||
    outputWidth < 1 ||
    outputHeight < 1 ||
    !Number.isFinite(maxEdge) ||
    maxEdge < 1
  ) {
    return 1;
  }

  const longest = Math.max(outputWidth, outputHeight);
  if (longest <= maxEdge) return 1;
  return maxEdge / longest;
}

/**
 * Project a sample encode size to the full target pixel count.
 * Uses integer bytes; approximate by design (encoders are non-linear).
 */
export function projectSampleBytesToTarget(
  sampleBytes: number,
  sampleWidth: number,
  sampleHeight: number,
  targetWidth: number,
  targetHeight: number,
): number {
  if (
    !Number.isFinite(sampleBytes) ||
    sampleBytes < 0 ||
    !Number.isFinite(sampleWidth) ||
    !Number.isFinite(sampleHeight) ||
    !Number.isFinite(targetWidth) ||
    !Number.isFinite(targetHeight)
  ) {
    return 0;
  }

  const samplePixels = Math.max(1, sampleWidth * sampleHeight);
  const targetPixels = Math.max(1, targetWidth * targetHeight);
  return Math.max(1, Math.round(sampleBytes * (targetPixels / samplePixels)));
}

/**
 * Settings fingerprint for one image. Omits quality when the output is lossless
 * so JPG/WebP quality sliders do not re-estimate PNG items.
 */
export function settingsEstimateKeyForItem(
  settings: ImageCompressorSettings,
  sourceKind: ImageKind,
): string {
  if (formatUsesQuality(settings.outputFormat, sourceKind)) {
    return settingsEstimateKey(settings);
  }
  return settingsEstimateKey({
    ...settings,
    quality: IMAGE_QUALITY.default,
  });
}

export function buildItemEstimateKey(
  settings: ImageCompressorSettings,
  sourceKind: ImageKind,
  cropState: ManualCropState | null | undefined,
): string {
  const settingsKey = settingsEstimateKeyForItem(settings, sourceKind);
  const cropKey = cropState ? serializeCropState(cropState) : "auto";
  return `${settingsKey}|${cropKey}`;
}

export function estimateAvailability(
  estimatedBytes: number | null,
  estimateKey: string | null,
  currentKey: string,
): EstimateAvailability {
  if (estimateKey == null || estimateKey !== currentKey) {
    return "pending";
  }
  if (estimatedBytes == null || !Number.isFinite(estimatedBytes)) {
    return "unavailable";
  }
  return "available";
}

/** True when an incoming estimate result no longer matches the live key. */
export function isStaleEstimateResult(
  resultKey: string,
  currentKey: string,
): boolean {
  return resultKey !== currentKey;
}

export type EstimateItemLike = {
  id: string;
  kind: ImageKind;
  cropState: ManualCropState | null;
  estimatedBytes: number | null;
  estimateKey: string | null;
};

/**
 * Invalidate only one image’s estimate (e.g. after a manual crop change).
 */
export function invalidateItemEstimate<T extends EstimateItemLike>(
  items: readonly T[],
  id: string,
): T[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, estimatedBytes: null, estimateKey: null }
      : item,
  );
}

/**
 * Invalidate every item after a global settings change.
 */
export function invalidateAllEstimates<T extends EstimateItemLike>(
  items: readonly T[],
): T[] {
  return items.map((item) => ({
    ...item,
    estimatedBytes: null,
    estimateKey: null,
  }));
}

/**
 * After processing, store the exact blob size as both estimate and actual.
 */
export function replaceEstimateWithActual<
  T extends {
    estimatedBytes: number | null;
    estimateKey: string | null;
  },
>(item: T, actualBytes: number, estimateKey: string): T {
  return {
    ...item,
    estimatedBytes: actualBytes,
    estimateKey,
  };
}

/**
 * When settings change after processing, drop actual outputs and force re-estimate.
 */
export function markResultsStaleAfterSettingsChange<
  T extends {
    estimatedBytes: number | null;
    estimateKey: string | null;
    output: unknown | null;
    status: string;
  },
>(items: readonly T[]): T[] {
  return items.map((item) => ({
    ...item,
    estimatedBytes: null,
    estimateKey: null,
    output: null,
    status:
      item.status === "complete" || item.status === "failed"
        ? "ready"
        : item.status,
  }));
}

/**
 * Whether a quality-only settings change should re-encode this image for estimates.
 */
export function qualityChangeAffectsItem(
  outputFormat: ImageCompressorSettings["outputFormat"],
  sourceKind: ImageKind,
): boolean {
  return formatUsesQuality(outputFormat, sourceKind);
}
