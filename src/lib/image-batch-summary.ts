/**
 * Pure batch file-size summary helpers for the Batch Image Compressor.
 * Keep integer byte math here; format for display at the presentation layer.
 */

import {
  formatExactFileSize,
  formatFileSize,
} from "@/lib/image-file-utils";
import type { ImageCompressorSettings } from "@/lib/image-compressor-config";

/** Differences below this percentage of the original are treated as unchanged. */
export const SIZE_CHANGE_THRESHOLD_PERCENT = 1;

export type SizeDeltaKind = "smaller" | "larger" | "unchanged";

export type SizeDelta = {
  kind: SizeDeltaKind;
  /** Absolute |original - output| in bytes. */
  absoluteBytes: number;
  /** Positive magnitude of the percentage change. */
  percent: number;
};

export type BatchItemSizeInput = {
  id: string;
  size: number;
  /** True when the item is a valid upload that counts toward the batch. */
  valid: boolean;
  /** Per-image estimated output bytes, if available. */
  estimatedBytes: number | null;
  /** Exact processed output bytes when complete. */
  actualBytes: number | null;
  /** True when processing finished successfully for this item. */
  completed: boolean;
  /** True when the item failed or was rejected after upload. */
  failed: boolean;
};

export type BatchSizeSummaryInput = {
  items: readonly BatchItemSizeInput[];
  /** When true, prefer exact processed totals over estimates. */
  preferActual: boolean;
  isUpdating?: boolean;
};

export type BatchSizeSummary = {
  mode: "estimated" | "actual";
  validImageCount: number;
  /** Original size of every valid uploaded file. */
  allUploadedOriginalBytes: number;
  /**
   * Original size used for the output comparison.
   * Estimated mode: originals of items that currently have estimates.
   * Actual mode: originals of successfully processed items.
   */
  comparisonOriginalBytes: number;
  /** Combined estimated or actual output bytes, or null when unavailable. */
  outputBytes: number | null;
  /** How many images contributed to outputBytes. */
  outputImageCount: number;
  completedCount: number;
  failedCount: number;
  isUpdating: boolean;
  /** True when every valid image has a contributing estimate/actual. */
  coverageComplete: boolean;
  delta: SizeDelta | null;
};

export function sumBytes(values: readonly (number | null | undefined)[]): number {
  let total = 0;
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      total += value;
    }
  }
  return total;
}

export function calculateByteDifference(
  originalBytes: number,
  outputBytes: number,
): number {
  return originalBytes - outputBytes;
}

/**
 * Classify whether output is smaller, larger, or effectively unchanged.
 * Percent is always a positive magnitude.
 */
export function classifySizeDelta(
  originalBytes: number,
  outputBytes: number,
  thresholdPercent: number = SIZE_CHANGE_THRESHOLD_PERCENT,
): SizeDelta | null {
  if (
    !Number.isFinite(originalBytes) ||
    !Number.isFinite(outputBytes) ||
    originalBytes <= 0
  ) {
    return null;
  }

  const absoluteBytes = Math.abs(originalBytes - outputBytes);
  const percent =
    Math.round(((absoluteBytes / originalBytes) * 100) * 10) / 10;

  if (percent < thresholdPercent) {
    return {
      kind: "unchanged",
      absoluteBytes,
      percent,
    };
  }

  if (outputBytes < originalBytes) {
    return {
      kind: "smaller",
      absoluteBytes,
      percent: Math.min(percent, 100),
    };
  }

  return {
    kind: "larger",
    absoluteBytes,
    percent,
  };
}

export function sumOriginalBytes(
  items: readonly Pick<BatchItemSizeInput, "size" | "valid">[],
): number {
  return sumBytes(items.filter((item) => item.valid).map((item) => item.size));
}

export function sumEstimatedBytes(
  items: readonly Pick<BatchItemSizeInput, "estimatedBytes" | "valid">[],
): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const item of items) {
    if (!item.valid) continue;
    if (item.estimatedBytes == null || !Number.isFinite(item.estimatedBytes)) {
      continue;
    }
    total += item.estimatedBytes;
    count += 1;
  }
  return { total, count };
}

export function sumActualOutputBytes(
  items: readonly Pick<BatchItemSizeInput, "actualBytes" | "completed">[],
): number {
  return sumBytes(
    items
      .filter((item) => item.completed)
      .map((item) => item.actualBytes),
  );
}

export function sumSuccessfulSourceBytes(
  items: readonly Pick<BatchItemSizeInput, "size" | "completed">[],
): number {
  return sumBytes(items.filter((item) => item.completed).map((item) => item.size));
}

export function countValidImages(
  items: readonly Pick<BatchItemSizeInput, "valid">[],
): number {
  return items.reduce((count, item) => count + (item.valid ? 1 : 0), 0);
}

/**
 * Build the batch-level size summary used by the live and completed UI.
 */
export function buildBatchSizeSummary(
  input: BatchSizeSummaryInput,
): BatchSizeSummary {
  const validItems = input.items.filter((item) => item.valid);
  const validImageCount = validItems.length;
  const allUploadedOriginalBytes = sumBytes(validItems.map((item) => item.size));
  const completedCount = validItems.filter((item) => item.completed).length;
  const failedCount = validItems.filter((item) => item.failed).length;
  const isUpdating = Boolean(input.isUpdating);

  const hasActualOutputs = completedCount > 0 && input.preferActual;

  if (hasActualOutputs) {
    const comparisonOriginalBytes = sumSuccessfulSourceBytes(validItems);
    const outputBytes = sumActualOutputBytes(validItems);
    return {
      mode: "actual",
      validImageCount,
      allUploadedOriginalBytes,
      comparisonOriginalBytes,
      outputBytes,
      outputImageCount: completedCount,
      completedCount,
      failedCount,
      isUpdating: false,
      coverageComplete: completedCount === validImageCount,
      delta: classifySizeDelta(comparisonOriginalBytes, outputBytes),
    };
  }

  const estimated = sumEstimatedBytes(validItems);
  const estimatedItems = validItems.filter(
    (item) => item.estimatedBytes != null && Number.isFinite(item.estimatedBytes),
  );
  const comparisonOriginalBytes = sumBytes(estimatedItems.map((item) => item.size));
  const outputBytes = estimated.count > 0 ? estimated.total : null;

  return {
    mode: "estimated",
    validImageCount,
    allUploadedOriginalBytes,
    comparisonOriginalBytes,
    outputBytes,
    outputImageCount: estimated.count,
    completedCount,
    failedCount,
    isUpdating,
    coverageComplete:
      validImageCount > 0 && estimated.count === validImageCount,
    delta:
      outputBytes == null
        ? null
        : classifySizeDelta(comparisonOriginalBytes, outputBytes),
  };
}

/** Stable fingerprint of settings that affect output size. */
export function settingsEstimateKey(settings: ImageCompressorSettings): string {
  return [
    settings.presetId,
    settings.width ?? "null",
    settings.height ?? "null",
    settings.fitMode,
    settings.cropFocus,
    settings.allowEnlarge ? "1" : "0",
    settings.outputFormat,
    settings.quality,
    settings.fitInsideBackground,
    settings.customBackground,
    settings.exactDimensions ? "1" : "0",
  ].join("|");
}

function formatPercent(percent: number): string {
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

export type BatchSizeCopy = {
  headline: string;
  originalLabel: string;
  outputLabel: string;
  outputValue: string;
  badge: "Estimated" | "Actual";
  deltaLine: string | null;
  coverageLine: string | null;
  uploadedLine: string | null;
  statusLine: string | null;
  tone: "savings" | "increase" | "neutral";
};

/**
 * Presentation strings for the batch size summary card.
 */
export function formatBatchSizeCopy(summary: BatchSizeSummary): BatchSizeCopy {
  const isEstimated = summary.mode === "estimated";
  const badge = isEstimated ? "Estimated" : "Actual";

  const headline =
    summary.mode === "actual"
      ? `${summary.completedCount} of ${summary.validImageCount} images processed`
      : summary.validImageCount === 1
        ? "1 image"
        : `${summary.validImageCount} images`;

  const originalLabel =
    summary.mode === "actual" ? "Successful sources" : "Original batch";
  const outputLabel =
    summary.mode === "actual" ? "Compressed batch" : "Estimated output";

  let outputValue = "—";
  if (summary.outputBytes != null) {
    // Actual mode: exact sum of processed file bytes (individual images, not ZIP).
    const formatted = isEstimated
      ? formatFileSize(summary.outputBytes)
      : formatExactFileSize(summary.outputBytes);
    outputValue = isEstimated ? `~${formatted}` : formatted;
  } else if (isEstimated && summary.validImageCount > 0) {
    outputValue = "Unavailable";
  }

  let coverageLine: string | null = null;
  if (
    isEstimated &&
    summary.outputBytes != null &&
    !summary.coverageComplete &&
    summary.outputImageCount > 0
  ) {
    coverageLine = `~${formatFileSize(summary.outputBytes)} estimated for ${summary.outputImageCount} of ${summary.validImageCount} images`;
  } else if (
    isEstimated &&
    summary.outputBytes == null &&
    summary.validImageCount > 0
  ) {
    coverageLine = "Batch estimate unavailable";
  } else if (
    !isEstimated &&
    summary.outputBytes != null &&
    summary.outputImageCount > 0
  ) {
    coverageLine = `Exact total of ${summary.outputImageCount} processed image file${summary.outputImageCount === 1 ? "" : "s"} (not the ZIP size)`;
  }

  let uploadedLine: string | null = null;
  if (
    summary.mode === "actual" &&
    summary.failedCount > 0 &&
    summary.allUploadedOriginalBytes !== summary.comparisonOriginalBytes
  ) {
    uploadedLine = `All uploaded files: ${formatFileSize(summary.allUploadedOriginalBytes)} original`;
  }

  let deltaLine: string | null = null;
  let tone: BatchSizeCopy["tone"] = "neutral";

  if (summary.outputBytes == null) {
    deltaLine = null;
  } else if (summary.delta == null) {
    deltaLine = null;
  } else if (summary.delta.kind === "unchanged") {
    deltaLine = isEstimated
      ? "About the same total size"
      : "No meaningful size change";
    tone = "neutral";
  } else if (summary.delta.kind === "smaller") {
    const amount = formatFileSize(summary.delta.absoluteBytes);
    const percent = formatPercent(summary.delta.percent);
    deltaLine = isEstimated
      ? `About ${amount} smaller · approximately ${percent}% reduction`
      : `Saved ${amount} · ${percent}% smaller`;
    tone = "savings";
  } else {
    const amount = formatFileSize(summary.delta.absoluteBytes);
    const percent = formatPercent(summary.delta.percent);
    deltaLine = isEstimated
      ? `About ${amount} larger · approximately ${percent}% increase`
      : `${amount} larger · ${percent}% increase`;
    tone = "increase";
  }

  const statusLine = summary.isUpdating ? "Updating estimate…" : null;

  return {
    headline,
    originalLabel,
    outputLabel,
    outputValue,
    badge,
    deltaLine,
    coverageLine,
    uploadedLine,
    statusLine,
    tone,
  };
}

/**
 * Replace stale actual outputs when settings change — used by tests and UI logic.
 */
export function clearStaleActualBytes<T extends { actualBytes: number | null }>(
  items: readonly T[],
): T[] {
  return items.map((item) => ({ ...item, actualBytes: null }));
}

/**
 * Merge a refreshed estimate for one image into the batch estimate list.
 */
export function replaceItemEstimate(
  items: readonly BatchItemSizeInput[],
  id: string,
  estimatedBytes: number | null,
): BatchItemSizeInput[] {
  return items.map((item) =>
    item.id === id ? { ...item, estimatedBytes } : item,
  );
}
