"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GoogieEmptyStateIcon } from "@/components/brand/GoogieEmptyStateIcon";
import { BatchSizeSummary } from "@/components/image-compressor/BatchSizeSummary";
import { CropEditor } from "@/components/image-compressor/CropEditor";
import { ImageDropzone } from "@/components/image-compressor/ImageDropzone";
import { ImageSettings } from "@/components/image-compressor/ImageSettings";
import { ImageThumbnailStrip } from "@/components/image-compressor/ImageThumbnailStrip";
import type { BatchImageItem } from "@/components/image-compressor/batch-types";
import { ToolWorkspaceShell } from "@/components/tools/ToolWorkspaceShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import {
  buildBatchSizeSummary,
  type BatchItemSizeInput,
} from "@/lib/image-batch-summary";
import {
  DEFAULT_IMAGE_SETTINGS,
  FILENAME_NAMING_DEFAULTS,
  KEEP_ORIGINAL_PREVIEW_SIZE,
  ZIP_FILENAME,
  resolvePresetAfterEdit,
  settingsFromPreset,
  type ImageCompressorSettings,
  type PresetId,
} from "@/lib/image-compressor-config";
import {
  createAutomaticCropState,
  reconcileCropState,
  serializeCropState,
  transferNormalizedCrop,
  type ManualCropState,
} from "@/lib/image-crop-editor";
import {
  buildItemEstimateKey,
  isStaleEstimateResult,
} from "@/lib/image-estimate";
import {
  buildOutputFilename,
  settingsAreValid,
  uniquifyFilenames,
  validateBatchAddition,
  validateImageFile,
  validateOutputDimensions,
} from "@/lib/image-file-utils";
import {
  detectWebpEncodingSupport,
  kindSupportsTransparency,
} from "@/lib/image-formats";
import {
  decodeImageFile,
  estimateImageFile,
  processImageFile,
  triggerBlobDownload,
  yieldToMain,
} from "@/lib/image-processing";
import { cn } from "@/lib/utils";

function createItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function revokeUrl(url: string | null | undefined) {
  if (url) URL.revokeObjectURL(url);
}

function clearItemOutput(item: BatchImageItem): BatchImageItem {
  revokeUrl(item.output?.url);
  return { ...item, output: null, warning: null };
}

function buildEstimateKey(
  settings: ImageCompressorSettings,
  item: BatchImageItem,
): string {
  return buildItemEstimateKey(settings, item.kind, item.cropState);
}

function toSizeInputs(items: BatchImageItem[]): BatchItemSizeInput[] {
  return items.map((item) => {
    // Prefer live blob.size so the compressed total matches the real files.
    const actualBytes =
      item.output != null ? item.output.blob.size : null;
    return {
      id: item.id,
      size: item.size,
      valid:
        item.status !== "rejected" &&
        Boolean(item.sourceWidth && item.sourceHeight),
      estimatedBytes: item.estimatedBytes,
      actualBytes,
      completed: item.status === "complete" && item.output != null,
      failed: item.status === "failed" || item.status === "rejected",
    };
  });
}

function initialCropForItem(
  width: number,
  height: number,
  settings: ImageCompressorSettings,
): ManualCropState | null {
  if (
    settings.presetId === "keep-original" ||
    settings.width == null ||
    settings.height == null
  ) {
    return null;
  }
  return createAutomaticCropState(
    { width, height },
    { width: settings.width, height: settings.height },
    settings.cropFocus,
  );
}

function updateItemCropsForSettings(
  item: BatchImageItem,
  next: ImageCompressorSettings,
): BatchImageItem {
  const cleared = clearItemOutput(item);
  if (!item.sourceWidth || !item.sourceHeight || item.status === "rejected") {
    return { ...cleared, estimateKey: null };
  }

  const sizedPreset =
    next.presetId !== "keep-original" &&
    next.width != null &&
    next.height != null;

  // Keep original has no output frame — stash adjusted framing for later.
  if (!sizedPreset) {
    return {
      ...cleared,
      cropState: item.cropState?.adjusted ? item.cropState : null,
      estimateKey: null,
      status: "ready",
      error: null,
    };
  }

  const source = { width: item.sourceWidth, height: item.sourceHeight };
  const target = { width: next.width!, height: next.height! };

  // Preserve (and adapt) manual framing across every sized preset / fit mode.
  if (item.cropState?.adjusted) {
    const { state } = reconcileCropState(
      item.cropState,
      source,
      target,
      next.cropFocus,
    );
    return {
      ...cleared,
      cropState: state,
      estimateKey: null,
      status: "ready",
      error: null,
    };
  }

  return {
    ...cleared,
    cropState: createAutomaticCropState(source, target, next.cropFocus),
    estimateKey: null,
    status: "ready",
    error: null,
  };
}

/**
 * Free Batch Image Compressor — local resize, crop, convert, and compress.
 */
export function BatchImageCompressor() {
  const progressId = useId();
  const summaryId = useId();

  const [items, setItems] = useState<BatchImageItem[]>([]);
  const [settings, setSettings] = useState<ImageCompressorSettings>(
    DEFAULT_IMAGE_SETTINGS,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [zipStatus, setZipStatus] = useState<string | null>(null);
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);
  const [batchComplete, setBatchComplete] = useState(false);
  const [estimateUpdating, setEstimateUpdating] = useState(false);
  const [navAnnounce, setNavAnnounce] = useState("");
  const [sizeSparkleBurstKey, setSizeSparkleBurstKey] = useState(0);
  const [thumbDownloadSparkle, setThumbDownloadSparkle] = useState<{
    id: string;
    key: number;
  } | null>(null);
  /** After any download exists, edited cards can show a per-image Process button. */
  const [offerSingleProcess, setOfferSingleProcess] = useState(false);

  const itemsRef = useRef(items);
  const cancelRef = useRef(false);
  const estimateTimerRef = useRef<number | null>(null);
  const shouldScrollToResultsRef = useRef(false);

  function playSizeSummarySparkles() {
    setSizeSparkleBurstKey((key) => key + 1);
  }

  /** Shine sparkles on the results size summary (ZIP download). */
  function shineZipDownloadSparkles() {
    playSizeSummarySparkles();
  }

  /**
   * Wait until both staggered sparkles finish.
   * Duration matches `.sparkle-burst` (900ms) + summary/thumbnail stagger (320ms).
   */
  function waitForSparklePair(): Promise<void> {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const waitMs = reducedMotion ? 0 : 900 + 320;
    return new Promise((resolve) => {
      window.setTimeout(resolve, waitMs);
    });
  }

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      setOfferSingleProcess(false);
      return;
    }
    if (items.some((item) => item.output != null)) {
      setOfferSingleProcess(true);
    }
  }, [items]);

  // After processing finishes, center the "Your images are ready" area.
  useEffect(() => {
    if (!batchComplete || processing) return;
    if (!shouldScrollToResultsRef.current) return;
    shouldScrollToResultsRef.current = false;

    const timer = window.setTimeout(() => {
      document.getElementById(summaryId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [batchComplete, processing, summaryId]);

  useEffect(() => {
    let active = true;
    detectWebpEncodingSupport().then((supported) => {
      if (active) setWebpSupported(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (estimateTimerRef.current) {
        window.clearTimeout(estimateTimerRef.current);
      }
      for (const item of itemsRef.current) {
        revokeUrl(item.thumbnailUrl);
        revokeUrl(item.output?.url);
      }
    };
  }, []);

  const keepOriginal = settings.presetId === "keep-original";
  const dimensionCheck = validateOutputDimensions(
    settings.width,
    settings.height,
    { required: !keepOriginal },
  );
  const settingsCheck = settingsAreValid(settings);
  const processableItems = items.filter(
    (item) =>
      item.status === "ready" ||
      item.status === "queued" ||
      item.status === "complete" ||
      item.status === "failed",
  );
  const completedItems = items.filter(
    (item) => item.status === "complete" && item.output,
  );
  const failedItems = items.filter(
    (item) => item.status === "failed" || item.status === "rejected",
  );
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const selectedItem =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  const canProcess =
    !processing &&
    processableItems.length > 0 &&
    settingsCheck.ok &&
    dimensionCheck.ok &&
    !(settings.outputFormat === "webp" && webpSupported === false);

  const estimateSignature = items
    .map(
      (item) =>
        `${item.id}:${item.size}:${item.kind}:${item.cropState ? serializeCropState(item.cropState) : "none"}:${item.sourceWidth ?? 0}x${item.sourceHeight ?? 0}`,
    )
    .join("|");

  // Keep download results available whenever any processed outputs remain,
  // even if one image’s crop was edited afterward (which clears only that file).
  const showResultsPanel = completedItems.length > 0 && !processing;
  const needsReprocessCount = items.filter(
    (item) => item.status === "ready" || item.status === "queued",
  ).length;
  // True only when framing/settings changed after a finished run (batchComplete cleared).
  const resultsArePartial =
    showResultsPanel && !batchComplete && needsReprocessCount > 0;

  const liveSummary = buildBatchSizeSummary({
    items: toSizeInputs(items),
    preferActual: showResultsPanel,
    isUpdating: estimateUpdating && !showResultsPanel,
  });

  // Debounced per-image size estimation (skips unchanged estimate keys).
  useEffect(() => {
    // After a finished batch run, keep exact processed sizes — do not re-estimate.
    if (processing || batchComplete) return;
    if (!settingsCheck.ok || !dimensionCheck.ok) return;
    if (settings.outputFormat === "webp" && webpSupported === false) return;

    const estimatable = itemsRef.current.filter(
      (item) =>
        item.sourceWidth &&
        item.sourceHeight &&
        item.status !== "rejected",
    );
    if (estimatable.length === 0) {
      setEstimateUpdating(false);
      return;
    }

    const needsWork = estimatable.some((item) => {
      const key = buildEstimateKey(settings, item);
      return item.estimateKey !== key;
    });
    if (!needsWork) {
      setEstimateUpdating(false);
      return;
    }

    let cancelled = false;
    setEstimateUpdating(true);

    if (estimateTimerRef.current) {
      window.clearTimeout(estimateTimerRef.current);
    }

    estimateTimerRef.current = window.setTimeout(async () => {
      for (const item of estimatable) {
        if (cancelled) break;

        const latest = itemsRef.current.find((entry) => entry.id === item.id);
        if (!latest) continue;
        const key = buildEstimateKey(settings, latest);
        if (latest.estimateKey === key) continue;

        // Downsampled sample encode — not a full-resolution export.
        const result = await estimateImageFile({
          file: latest.file,
          sourceName: latest.name,
          settings,
          cropFocusOverride: latest.cropFocusOverride,
          manualCrop: latest.cropState,
        });
        if (cancelled) break;

        setItems((prev) =>
          prev.map((entry) => {
            if (entry.id !== latest.id) return entry;
            const currentKey = buildEstimateKey(settings, entry);
            if (isStaleEstimateResult(key, currentKey)) return entry;
            if (result.ok) {
              return {
                ...entry,
                estimatedBytes: result.estimatedBytes,
                estimateKey: key,
              };
            }
            return {
              ...entry,
              estimatedBytes: null,
              estimateKey: key,
            };
          }),
        );
        await yieldToMain();
      }

      if (!cancelled) {
        setEstimateUpdating(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      if (estimateTimerRef.current) {
        window.clearTimeout(estimateTimerRef.current);
      }
    };
  }, [
    settings,
    estimateSignature,
    processing,
    batchComplete,
    settingsCheck.ok,
    dimensionCheck.ok,
    webpSupported,
  ]);

  async function probeDimensions(file: File): Promise<{
    width: number | null;
    height: number | null;
    error: string | null;
  }> {
    try {
      // Same orientation-aware decode path as export / estimates.
      const bitmap = await decodeImageFile(file);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      return { width, height, error: null };
    } catch {
      return {
        width: null,
        height: null,
        error: "This image could not be decoded. It may be corrupted.",
      };
    }
  }

  async function handleFiles(files: File[]) {
    setUploadMessage(null);
    setBatchComplete(false);

    const existingLike = items.map((item) => ({
      name: item.name,
      type: item.mimeType,
      size: item.size,
    }));
    const batchCheck = validateBatchAddition(existingLike, files);

    const nextItems: BatchImageItem[] = [];
    const rejectNotes: string[] = [];

    for (const rejected of batchCheck.rejected) {
      rejectNotes.push(`${rejected.file.name}: ${rejected.message}`);
    }

    for (const file of batchCheck.accepted) {
      const typeResult = validateImageFile(file);
      if (!typeResult.ok) {
        rejectNotes.push(`${file.name}: ${typeResult.message}`);
        continue;
      }

      const thumbnailUrl = URL.createObjectURL(file);
      const probed = await probeDimensions(file);
      const cropState =
        probed.width && probed.height
          ? initialCropForItem(probed.width, probed.height, settings)
          : null;

      const item: BatchImageItem = {
        id: createItemId(),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        kind: typeResult.kind,
        thumbnailUrl,
        sourceWidth: probed.width,
        sourceHeight: probed.height,
        status: probed.error ? "failed" : "ready",
        error: probed.error,
        warning: null,
        cropState,
        estimatedBytes: null,
        estimateKey: null,
        output: null,
      };
      nextItems.push(item);
      await yieldToMain();
    }

    if (nextItems.length) {
      setItems((prev) => {
        const merged = [...prev, ...nextItems];
        if (!selectedId) {
          setSelectedId(merged[0]?.id ?? null);
        }
        return merged;
      });
    }

    if (rejectNotes.length) {
      setUploadMessage(
        rejectNotes.length === 1
          ? rejectNotes[0]
          : `${rejectNotes.length} files could not be added. ${rejectNotes[0]}`,
      );
    } else if (nextItems.length) {
      setUploadMessage(
        nextItems.length === 1
          ? "1 image added."
          : `${nextItems.length} images added.`,
      );
    }
  }

  function normalizeSettings(
    next: ImageCompressorSettings,
  ): ImageCompressorSettings {
    return {
      ...FILENAME_NAMING_DEFAULTS,
      ...next,
      fitMode: "fill-crop",
      filenamePrefix:
        next.filenamePrefix ?? FILENAME_NAMING_DEFAULTS.filenamePrefix,
      includeResolutionInFilename:
        next.includeResolutionInFilename ??
        FILENAME_NAMING_DEFAULTS.includeResolutionInFilename,
    };
  }

  function applySettings(next: ImageCompressorSettings) {
    // Framing is always fill-and-crop via the manual preview; ignore other fit modes.
    const normalized = normalizeSettings(next);
    setSettings(normalized);
    setBatchComplete(false);
    setItems((prev) =>
      prev.map((item) => updateItemCropsForSettings(item, normalized)),
    );
  }

  function handlePresetChange(presetId: PresetId) {
    const next = settingsFromPreset(presetId);
    // Keep download naming choices when switching size presets.
    applySettings({
      ...next,
      filenamePrefix:
        settings.filenamePrefix ?? FILENAME_NAMING_DEFAULTS.filenamePrefix,
      includeResolutionInFilename:
        settings.includeResolutionInFilename ??
        FILENAME_NAMING_DEFAULTS.includeResolutionInFilename,
    });
  }

  function isFilenameNamingPatch(
    patch: Partial<ImageCompressorSettings>,
  ): boolean {
    const keys = Object.keys(patch);
    if (keys.length === 0) return false;
    const namingKeys = new Set([
      "filenamePrefix",
      "includeResolutionInFilename",
    ]);
    return keys.every((key) => namingKeys.has(key));
  }

  function handleSettingsPatch(patch: Partial<ImageCompressorSettings>) {
    const next = normalizeSettings(resolvePresetAfterEdit(settings, patch));

    // Prefix / resolution only affect download names — do not rebuild
    // crops or re-estimate the whole batch (that can lock up the browser).
    if (isFilenameNamingPatch(patch)) {
      setSettings(next);
      setItems((prev) =>
        prev.map((item) => {
          if (!item.output) return item;
          return {
            ...item,
            output: {
              ...item.output,
              filename: buildOutputFilename({
                sourceName: item.name,
                outputKind: item.output.outputKind,
                width: item.output.width,
                height: item.output.height,
                keepOriginal: next.presetId === "keep-original",
                filenamePrefix: next.filenamePrefix,
                includeResolutionInFilename: next.includeResolutionInFilename,
              }),
            },
          };
        }),
      );
      return;
    }

    applySettings(next);
  }

  function handleRemove(id: string) {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        revokeUrl(target.thumbnailUrl);
        revokeUrl(target.output?.url);
      }
      const next = prev.filter((item) => item.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
    setBatchComplete(false);
  }

  function handleRename(id: string, nextFilename: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.name === nextFilename) return item;

        const keepOriginal = settings.presetId === "keep-original";
        const nextOutput = item.output
          ? {
              ...item.output,
              filename: buildOutputFilename({
                sourceName: nextFilename,
                outputKind: item.output.outputKind,
                width: item.output.width,
                height: item.output.height,
                keepOriginal,
                filenamePrefix: settings.filenamePrefix,
                includeResolutionInFilename:
                  settings.includeResolutionInFilename,
              }),
            }
          : item.output;

        return {
          ...item,
          name: nextFilename,
          output: nextOutput,
        };
      }),
    );
  }

  function handleClearBatch() {
    for (const item of items) {
      revokeUrl(item.thumbnailUrl);
      revokeUrl(item.output?.url);
    }
    setItems([]);
    setSelectedId(null);
    setUploadMessage(null);
    setProgress(null);
    setZipStatus(null);
    setBatchComplete(false);
  }

  async function handleDownload(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item?.output) return;
    // Sparkles stay on this card — do not scroll the page.
    setThumbDownloadSparkle((prev) => ({
      id,
      key: (prev?.key ?? 0) + 1,
    }));
    const { blob, filename } = item.output;
    await waitForSparklePair();
    triggerBlobDownload(blob, filename);
  }

  function selectImage(id: string, options?: { allowScroll?: boolean }) {
    const lockedScrollY = options?.allowScroll ? null : window.scrollY;
    setSelectedId(id);
    const item = items.find((entry) => entry.id === id);
    if (item) {
      const position = items.findIndex((entry) => entry.id === id) + 1;
      setNavAnnounce(`Selected ${item.name}, image ${position} of ${items.length}`);
    }

    // Selecting via the thumbnail card can reflow the preview above and nudge
    // the page. Keep the viewport fixed unless a caller opts into scrolling.
    if (lockedScrollY != null) {
      const restoreScroll = () => {
        if (window.scrollY !== lockedScrollY) {
          window.scrollTo({ top: lockedScrollY, left: window.scrollX });
        }
      };
      requestAnimationFrame(() => {
        restoreScroll();
        requestAnimationFrame(restoreScroll);
      });
    }
  }

  function handleCropChange(state: ManualCropState) {
    if (!selectedItem) return;
    setBatchComplete(false);
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === selectedItem.id
          ? {
              ...clearItemOutput(entry),
              cropState: state,
              estimateKey: null,
              status:
                entry.status === "complete" || entry.status === "failed"
                  ? "ready"
                  : entry.status,
              error: entry.sourceWidth ? null : entry.error,
            }
          : entry,
      ),
    );
  }

  function handleResetCrop() {
    if (!selectedItem?.sourceWidth || !selectedItem.sourceHeight) return;
    if (settings.width == null || settings.height == null) return;
    const state = createAutomaticCropState(
      { width: selectedItem.sourceWidth, height: selectedItem.sourceHeight },
      { width: settings.width, height: settings.height },
      settings.cropFocus,
    );
    handleCropChange(state);
  }

  function handleResetAllCrops() {
    if (
      !window.confirm(
        "Reset all images to the automatic framing for the current width and height? Manual zoom and position adjustments will be cleared.",
      )
    ) {
      return;
    }
    setBatchComplete(false);
    setItems((prev) =>
      prev.map((item) => {
        if (!item.sourceWidth || !item.sourceHeight) return item;
        if (settings.width == null || settings.height == null) {
          return { ...clearItemOutput(item), cropState: null, estimateKey: null };
        }
        return {
          ...clearItemOutput(item),
          cropState: createAutomaticCropState(
            { width: item.sourceWidth, height: item.sourceHeight },
            { width: settings.width, height: settings.height },
            settings.cropFocus,
          ),
          estimateKey: null,
          status: "ready",
          error: null,
        };
      }),
    );
  }

  function handleApplyCropToAll() {
    if (!selectedItem?.cropState || !selectedItem.sourceWidth) return;
    if (
      !window.confirm(
        `Apply this zoom and crop position to all ${items.length} images? Each image will be clamped to its own bounds.`,
      )
    ) {
      return;
    }
    if (settings.width == null || settings.height == null) return;
    const from = selectedItem.cropState;
    const target = { width: settings.width, height: settings.height };
    setBatchComplete(false);
    setItems((prev) =>
      prev.map((item) => {
        if (!item.sourceWidth || !item.sourceHeight) return item;
        return {
          ...clearItemOutput(item),
          cropState: transferNormalizedCrop(
            from,
            { width: item.sourceWidth, height: item.sourceHeight },
            target,
          ),
          estimateKey: null,
          status: "ready",
          error: null,
        };
      }),
    );
  }

  function goPrevious() {
    if (selectedIndex <= 0) return;
    selectImage(items[selectedIndex - 1].id);
  }

  function goNext() {
    if (selectedIndex >= items.length - 1) return;
    selectImage(items[selectedIndex + 1].id);
  }

  /** Scroll the currently edited thumbnail into the middle of the viewport. */
  function handleDoneEditing() {
    if (!selectedId) return;
    const thumbnail = document.getElementById(`batch-thumb-${selectedId}`);
    thumbnail?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /** Select a thumbnail and scroll up to the large Preview & crop window. */
  function handleEditImage(id: string) {
    selectImage(id, { allowScroll: true });
    // Wait one frame so the preview updates before scrolling.
    requestAnimationFrame(() => {
      const target = document.getElementById("batch-crop-preview");
      if (!target) return;

      // Place the tools/preview top edge 5px below the sticky site header.
      const header = document.querySelector("header");
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      const gapPx = 5;
      const nextTop =
        window.scrollY +
        target.getBoundingClientRect().top -
        headerBottom -
        gapPx;

      window.scrollTo({
        top: Math.max(0, nextTop),
        behavior: "smooth",
      });
    });
  }

  async function handleProcess() {
    if (!canProcess) return;

    cancelRef.current = false;
    setProcessing(true);
    setEstimateUpdating(false);
    setBatchComplete(false);
    setZipStatus(null);
    setUploadMessage(null);
    shouldScrollToResultsRef.current = true;
    playSizeSummarySparkles();

    const snapshot = items.filter(
      (item) =>
        Boolean(item.sourceWidth && item.sourceHeight) &&
        (item.status === "ready" ||
          item.status === "queued" ||
          item.status === "complete" ||
          item.status === "failed"),
    );

    setItems((prev) =>
      prev.map((item) => {
        const inBatch = snapshot.some((entry) => entry.id === item.id);
        if (!inBatch) return item;
        return {
          ...clearItemOutput(item),
          status: "queued",
          error: null,
        };
      }),
    );

    const total = snapshot.length;
    let current = 0;
    setProgress({ current: 0, total });

    const baseCounts = new Map<string, number>();

    for (const item of snapshot) {
      if (cancelRef.current) break;

      current += 1;
      setProgress({ current, total });
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? { ...entry, status: "processing", error: null }
            : entry,
        ),
      );

      const baseKey = item.name.replace(/\.[^.]+$/, "").toLowerCase();
      const dup = (baseCounts.get(baseKey) ?? 0) + 1;
      baseCounts.set(baseKey, dup);

      const result = await processImageFile({
        file: item.file,
        sourceName: item.name,
        settings,
        cropFocusOverride: item.cropFocusOverride,
        manualCrop: item.cropState,
        duplicateIndex: dup,
      });

      if (!result.ok) {
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? {
                  ...clearItemOutput(entry),
                  status: "failed",
                  error: result.message,
                }
              : entry,
          ),
        );
      } else {
        const url = URL.createObjectURL(result.blob);
        const estimateKey = buildEstimateKey(settings, {
          ...item,
          kind: result.sourceKind,
          cropState: item.cropState,
        });
        setItems((prev) =>
          prev.map((entry) => {
            if (entry.id !== item.id) return entry;
            revokeUrl(entry.output?.url);
            const exactBytes = result.blob.size;
            return {
              ...entry,
              status: "complete",
              error: null,
              warning: result.warning,
              sourceWidth: result.sourceWidth,
              sourceHeight: result.sourceHeight,
              estimatedBytes: exactBytes,
              estimateKey,
              output: {
                blob: result.blob,
                url,
                width: result.width,
                height: result.height,
                size: exactBytes,
                mimeType: result.mimeType,
                filename: result.filename,
                outputKind: result.outputKind,
              },
            };
          }),
        );
      }

      await yieldToMain();
    }

    setProcessing(false);
    setBatchComplete(true);
  }

  /**
   * Re-process a single image after the user changed its crop (or similar).
   * Leaves other completed downloads untouched.
   */
  async function handleProcessOne(id: string) {
    if (processing) return;
    if (!settingsCheck.ok || !dimensionCheck.ok) return;
    if (settings.outputFormat === "webp" && webpSupported === false) return;

    const item = items.find((entry) => entry.id === id);
    if (
      !item ||
      !item.sourceWidth ||
      !item.sourceHeight ||
      item.status === "rejected"
    ) {
      return;
    }

    const othersStillComplete = items
      .filter(
        (entry) =>
          entry.id !== id &&
          entry.sourceWidth &&
          entry.sourceHeight &&
          entry.status !== "rejected",
      )
      .every((entry) => entry.status === "complete" && entry.output != null);

    cancelRef.current = false;
    setProcessing(true);
    setZipStatus(null);
    setUploadMessage(null);

    setItems((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...clearItemOutput(entry),
              status: "processing",
              error: null,
            }
          : entry,
      ),
    );

    const baseKey = item.name.replace(/\.[^.]+$/, "").toLowerCase();
    let duplicateIndex = 0;
    for (const entry of items) {
      const key = entry.name.replace(/\.[^.]+$/, "").toLowerCase();
      if (key !== baseKey) continue;
      duplicateIndex += 1;
      if (entry.id === id) break;
    }

    const result = await processImageFile({
      file: item.file,
      sourceName: item.name,
      settings,
      cropFocusOverride: item.cropFocusOverride,
      manualCrop: item.cropState,
      duplicateIndex: Math.max(1, duplicateIndex),
    });

    if (!result.ok) {
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
                ...clearItemOutput(entry),
                status: "failed",
                error: result.message,
              }
            : entry,
        ),
      );
      setProcessing(false);
      return;
    }

    const url = URL.createObjectURL(result.blob);
    const estimateKey = buildEstimateKey(settings, {
      ...item,
      kind: result.sourceKind,
      cropState: item.cropState,
    });
    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        revokeUrl(entry.output?.url);
        const exactBytes = result.blob.size;
        return {
          ...entry,
          status: "complete",
          error: null,
          warning: result.warning,
          sourceWidth: result.sourceWidth,
          sourceHeight: result.sourceHeight,
          estimatedBytes: exactBytes,
          estimateKey,
          output: {
            blob: result.blob,
            url,
            width: result.width,
            height: result.height,
            size: exactBytes,
            mimeType: result.mimeType,
            filename: result.filename,
            outputKind: result.outputKind,
          },
        };
      }),
    );

    setProcessing(false);
    if (othersStillComplete) {
      setBatchComplete(true);
    }
  }

  async function handleZipDownload() {
    const ready = items.filter(
      (item) => item.status === "complete" && item.output,
    );
    if (!ready.length) return;

    setZipStatus("Preparing ZIP…");
    shineZipDownloadSparkles();
    try {
      // Build the ZIP while sparkles play; only start the download after both shine.
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const names = uniquifyFilenames(ready.map((item) => item.output!.filename));

      ready.forEach((item, index) => {
        zip.file(names[index], item.output!.blob);
      });

      const [blob] = await Promise.all([
        zip.generateAsync({ type: "blob" }),
        waitForSparklePair(),
      ]);
      triggerBlobDownload(blob, ZIP_FILENAME);
      setZipStatus("Download started");
      window.setTimeout(() => setZipStatus(null), 2500);
    } catch {
      setZipStatus(null);
      setUploadMessage(
        "Could not create the ZIP file in this browser. Try downloading images individually.",
      );
    }
  }

  const processLabel =
    processableItems.length === 1
      ? "Process 1 image"
      : `Process ${processableItems.length} images`;

  const editorTargetWidth = keepOriginal
    ? KEEP_ORIGINAL_PREVIEW_SIZE.width
    : (settings.width ?? selectedItem?.sourceWidth ?? 450);
  const editorTargetHeight = keepOriginal
    ? KEEP_ORIGINAL_PREVIEW_SIZE.height
    : (settings.height ?? selectedItem?.sourceHeight ?? 300);

  return (
    <ToolWorkspaceShell icon="image-compressor">
    <Card padding="lg">
      <div className="space-y-8">
        <p className="sr-only" role="status" aria-live="polite">
          {navAnnounce}
        </p>

        {items.length === 0 ? (
          <>
            <ImageDropzone disabled={processing} onFiles={handleFiles} />

            {uploadMessage ? (
              <p
                className={cn(
                  "text-sm",
                  uploadMessage.includes("could not") ||
                    uploadMessage.includes("not supported") ||
                    uploadMessage.includes("larger") ||
                    uploadMessage.includes("limit")
                    ? "text-error"
                    : "text-muted",
                )}
                role="status"
                aria-live="polite"
              >
                {uploadMessage}
              </p>
            ) : null}

            <div className="flex justify-center py-6">
              <EmptyState
                title="No images yet"
                description="Add JPG, PNG, or WebP files to prepare a batch for websites, email, or social posts."
              >
                <GoogieEmptyStateIcon />
              </EmptyState>
            </div>
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
            {/* Left column: compact upload + settings */}
            <div className="min-w-0 space-y-5">
              <ImageDropzone
                compact
                disabled={processing}
                onFiles={handleFiles}
              />

              {uploadMessage ? (
                <p
                  className={cn(
                    "text-sm",
                    uploadMessage.includes("could not") ||
                      uploadMessage.includes("not supported") ||
                      uploadMessage.includes("larger") ||
                      uploadMessage.includes("limit")
                      ? "text-error"
                      : "text-muted",
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {uploadMessage}
                </p>
              ) : null}

              <section aria-labelledby="settings-heading" className="space-y-5">
                <div>
                  <h2
                    id="settings-heading"
                    className="font-display text-xl font-semibold tracking-tight text-foreground"
                  >
                    Output settings
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">
                    Presets update the visible controls. Manual crop applies to
                    the selected image only.
                  </p>
                </div>
                <ImageSettings
                  settings={settings}
                  widthError={dimensionCheck.widthError}
                  heightError={dimensionCheck.heightError}
                  webpSupported={webpSupported}
                  disabled={processing}
                  exampleSourceName={items[0]?.name ?? null}
                  exampleSourceKind={items[0]?.kind ?? null}
                  exampleSourceWidth={items[0]?.sourceWidth ?? null}
                  exampleSourceHeight={items[0]?.sourceHeight ?? null}
                  onPresetChange={handlePresetChange}
                  onSettingsPatch={handleSettingsPatch}
                />

                {!showResultsPanel ? (
                  <BatchSizeSummary
                    summary={liveSummary}
                    sparkleBurstKey={sizeSparkleBurstKey}
                  />
                ) : null}

                <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                  <Button
                    type="button"
                    disabled={!canProcess}
                    onClick={() => void handleProcess()}
                  >
                    {processLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={processing || items.length === 0}
                    onClick={handleClearBatch}
                  >
                    Clear batch
                  </Button>
                </div>

                {!settingsCheck.ok ? (
                  <FriendlyError message={settingsCheck.message} />
                ) : null}

                {processing && progress ? (
                  <div
                    id={progressId}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="rounded-2xl border border-border bg-background/80 px-4 py-3"
                  >
                    <p className="font-medium text-foreground">
                      Processing {progress.current} of {progress.total} images
                    </p>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-border"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-300"
                        style={{
                          width: `${Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            {/* Right column: preview/crop/zoom + batch thumbnails */}
            <div className="min-w-0 space-y-6">
              {selectedItem?.sourceWidth && selectedItem.sourceHeight ? (
                <CropEditor
                  imageUrl={selectedItem.thumbnailUrl}
                  imageName={selectedItem.name}
                  sourceWidth={selectedItem.sourceWidth}
                  sourceHeight={selectedItem.sourceHeight}
                  targetWidth={editorTargetWidth}
                  targetHeight={editorTargetHeight}
                  keepOriginal={keepOriginal}
                  showTransparencyPattern={kindSupportsTransparency(
                    selectedItem.kind,
                  )}
                  cropFocus={settings.cropFocus}
                  cropState={
                    !keepOriginal &&
                    settings.width != null &&
                    settings.height != null
                      ? selectedItem.cropState
                      : null
                  }
                  index={selectedIndex}
                  total={items.length}
                  disabled={processing}
                  onCropChange={handleCropChange}
                  onResetCrop={handleResetCrop}
                  onPrevious={goPrevious}
                  onNext={goNext}
                  onDoneEditing={handleDoneEditing}
                  onRename={(nextFilename) => {
                    if (selectedItem) {
                      handleRename(selectedItem.id, nextFilename);
                    }
                  }}
                  onResetAllCrops={handleResetAllCrops}
                  onApplyCropToAll={handleApplyCropToAll}
                />
              ) : (
                <p className="rounded-2xl border border-border px-4 py-8 text-center text-sm text-muted">
                  Select a valid image to edit its crop.
                </p>
              )}

              <ImageThumbnailStrip
                items={items}
                selectedId={selectedItem?.id ?? null}
                processing={processing}
                targetWidth={editorTargetWidth}
                targetHeight={editorTargetHeight}
                keepOriginal={keepOriginal}
                cropFocus={settings.cropFocus}
                downloadSparkleId={thumbDownloadSparkle?.id ?? null}
                downloadSparkleKey={thumbDownloadSparkle?.key ?? 0}
                offerSingleProcess={offerSingleProcess}
                onSelect={selectImage}
                onOpenPreview={handleEditImage}
                onRemove={handleRemove}
                onDownload={handleDownload}
                onProcess={(id) => void handleProcessOne(id)}
                onRename={handleRename}
              />
            </div>
          </div>
        )}

        {showResultsPanel ? (
          <section
            id={summaryId}
            className="scroll-mt-24 rounded-2xl border border-border bg-background/80 px-4 py-6 sm:px-6"
            aria-labelledby="results-heading"
          >
            <SuccessMessage
              title={
                resultsArePartial
                  ? "Some images are ready"
                  : "Your images are ready"
              }
              description={
                resultsArePartial
                  ? `${completedItems.length} processed image${completedItems.length === 1 ? "" : "s"} can still be downloaded. ${needsReprocessCount} image${needsReprocessCount === 1 ? "" : "s"} changed after processing — process again to include ${needsReprocessCount === 1 ? "it" : "them"} in a new ZIP.`
                  : "Download them individually or save the full batch as a ZIP."
              }
            />

            <BatchSizeSummary
              className="mx-auto mt-5 max-w-xl"
              summary={liveSummary}
              compact
              sparkleBurstKey={sizeSparkleBurstKey}
            />

            {failedItems.length > 0 ? (
              <ul className="mx-auto mt-4 max-w-xl list-disc space-y-1 pl-5 text-sm text-error">
                {failedItems.map((item) => (
                  <li key={item.id}>
                    {item.name}: {item.error ?? "Could not process this image."}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 border-t border-border pt-5">
              <div className="flex justify-center">
                <Button
                  type="button"
                  disabled={completedItems.length === 0 || zipStatus != null}
                  onClick={() => void handleZipDownload()}
                >
                  {resultsArePartial
                    ? `Download ${completedItems.length} processed image${completedItems.length === 1 ? "" : "s"} as ZIP`
                    : "Download all images as ZIP"}
                </Button>
              </div>
              {zipStatus ? (
                <p
                  className="mt-3 text-center text-sm text-muted"
                  role="status"
                >
                  {zipStatus}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </Card>
    </ToolWorkspaceShell>
  );
}
