"use client";

import { useMemo } from "react";
import {
  createBorderSparkleLayout,
  DEFAULT_BORDER_SPARKLE_LAYOUT,
} from "@/components/brand/border-sparkle-layout";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { CropAwareThumbnail } from "@/components/image-compressor/CropAwareThumbnail";
import { EditableImageFilename } from "@/components/image-compressor/EditableImageFilename";
import { Button } from "@/components/ui/Button";
import type { BatchImageItem } from "@/components/image-compressor/batch-types";
import type { CropFocus } from "@/lib/image-compressor-config";
import { formatFileSize } from "@/lib/image-file-utils";
import { kindSupportsTransparency } from "@/lib/image-formats";
import { cn } from "@/lib/utils";

type ImageThumbnailStripProps = {
  items: BatchImageItem[];
  selectedId: string | null;
  processing: boolean;
  /** Output / preview frame size from the active preset. */
  targetWidth: number;
  targetHeight: number;
  keepOriginal: boolean;
  cropFocus: CropFocus;
  /** Which card should show download sparkles (null = none). */
  downloadSparkleId?: string | null;
  /** Bump to replay sparkles on that card. */
  downloadSparkleKey?: number;
  /**
   * When true, cards without an output show a Process button (after a batch
   * has produced at least one download).
   */
  offerSingleProcess?: boolean;
  /** Select this image in the preview (no page scroll). */
  onSelect: (id: string) => void;
  /** Select and scroll up to the large preview (image click only). */
  onOpenPreview: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  /** Re-process a single image after crop/settings made its output stale. */
  onProcess: (id: string) => void;
  onRename: (id: string, nextFilename: string) => void;
};

const THUMB_SPARKLE_STAGGER_MS = 320;

function statusLabel(item: BatchImageItem): string {
  switch (item.status) {
    case "queued":
      return "Queued";
    case "ready":
      return "Ready";
    case "processing":
      return "Processing";
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    case "rejected":
      return "Rejected";
    default:
      return item.status;
  }
}

/** Shorten long filenames for card display; full name stays on hover. */
function shortFilename(name: string, max = 14): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  if (dot > 0 && name.length - dot <= 5) {
    const ext = name.slice(dot);
    const baseBudget = Math.max(4, max - ext.length - 1);
    return `${name.slice(0, baseBudget)}…${ext}`;
  }
  return `${name.slice(0, max - 1)}…`;
}

/**
 * Compact 3-column thumbnail grid under the crop / zoom controls.
 */
export function ImageThumbnailStrip({
  items,
  selectedId,
  processing,
  targetWidth,
  targetHeight,
  keepOriginal,
  cropFocus,
  downloadSparkleId = null,
  downloadSparkleKey = 0,
  offerSingleProcess = false,
  onSelect,
  onOpenPreview,
  onRemove,
  onDownload,
  onProcess,
  onRename,
}: ImageThumbnailStripProps) {
  const downloadSparkleLayout = useMemo(
    () =>
      downloadSparkleKey > 0 && downloadSparkleId
        ? createBorderSparkleLayout()
        : DEFAULT_BORDER_SPARKLE_LAYOUT,
    [downloadSparkleKey, downloadSparkleId],
  );

  if (items.length === 0) return null;

  // After a batch has produced downloads, edited cards show Process instead of Download.
  const batchHasDownloads = offerSingleProcess;

  const leftSparkleDelay = downloadSparkleLayout.rightFirst
    ? THUMB_SPARKLE_STAGGER_MS
    : 0;
  const rightSparkleDelay = downloadSparkleLayout.rightFirst
    ? 0
    : THUMB_SPARKLE_STAGGER_MS;

  return (
    <section aria-labelledby="batch-strip-heading" className="space-y-3">
      <h2
        id="batch-strip-heading"
        className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        Batch ({items.length})
      </h2>

      <ul className="grid list-none grid-cols-3 gap-2.5 p-0 sm:gap-3">
        {items.map((item) => {
          const selected = item.id === selectedId;
          const adjusted = Boolean(item.cropState?.adjusted);
          const showDownloadSparkles =
            downloadSparkleKey > 0 && downloadSparkleId === item.id;

          return (
            <li
              key={item.id}
              id={`batch-thumb-${item.id}`}
              className="min-w-0 scroll-mt-24"
            >
              <article
                onMouseDown={(event) => {
                  // Empty-card clicks should not move focus (avoids browser
                  // scroll-into-view jumps). Keep normal focus for controls.
                  const target = event.target as HTMLElement | null;
                  if (
                    target?.closest(
                      "button, a, input, textarea, select, label, [role='button']",
                    )
                  ) {
                    return;
                  }
                  event.preventDefault();
                }}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "relative flex h-full cursor-pointer flex-col items-center overflow-visible rounded-xl border px-2.5 py-3 text-center transition-colors sm:px-3 sm:py-3.5",
                  selected
                    ? "border-accent bg-accent-tint/50 shadow-soft-sm"
                    : "border-border bg-background/70",
                )}
              >
                {showDownloadSparkles ? (
                  <>
                    <span
                      className="pointer-events-none absolute left-0 z-10 -translate-x-1/2 -translate-y-1/2"
                      style={{
                        top: `${downloadSparkleLayout.leftOffsetPercent}%`,
                      }}
                    >
                      <SparkleBurst
                        playKey={downloadSparkleKey}
                        delayMs={leftSparkleDelay}
                        size="sm"
                      />
                    </span>
                    <span
                      className="pointer-events-none absolute right-0 z-10 translate-x-1/2 -translate-y-1/2"
                      style={{
                        top: `${downloadSparkleLayout.rightOffsetPercent}%`,
                      }}
                    >
                      <SparkleBurst
                        playKey={downloadSparkleKey}
                        delayMs={rightSparkleDelay}
                        size="sm"
                      />
                    </span>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenPreview(item.id);
                  }}
                  className="flex w-full min-w-0 flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open preview for ${item.name}${adjusted ? ", crop adjusted" : ""}`}
                >
                  <CropAwareThumbnail
                    imageUrl={item.thumbnailUrl}
                    sourceWidth={item.sourceWidth}
                    sourceHeight={item.sourceHeight}
                    targetWidth={targetWidth}
                    targetHeight={targetHeight}
                    keepOriginal={keepOriginal}
                    cropFocus={item.cropFocusOverride ?? cropFocus}
                    cropState={keepOriginal ? null : item.cropState}
                    showTransparencyPattern={kindSupportsTransparency(
                      item.kind,
                    )}
                  />
                </button>

                <div className="mt-2 w-full min-w-0">
                  <EditableImageFilename
                    filename={item.name}
                    displayName={shortFilename(item.name)}
                    disabled={processing}
                    align="center"
                    className="mx-auto block max-w-full text-xs font-medium text-foreground sm:text-sm"
                    onRename={(nextFilename) => onRename(item.id, nextFilename)}
                    onClickWhenIdle={() => onSelect(item.id)}
                  />
                  <span className="mt-0.5 block text-[0.65rem] text-muted sm:text-xs">
                    {item.sourceWidth && item.sourceHeight
                      ? `${item.sourceWidth}×${item.sourceHeight}`
                      : "—"}
                  </span>
                  <span className="mt-0.5 block text-[0.65rem] text-muted sm:text-xs">
                    {formatFileSize(item.size)}
                    {item.output
                      ? ` → ${formatFileSize(item.output.blob.size)}`
                      : item.estimatedBytes != null
                        ? ` → ~${formatFileSize(item.estimatedBytes)}`
                        : null}
                  </span>
                </div>

                {item.error ? (
                  <p
                    className="mt-1.5 line-clamp-2 text-center text-[0.65rem] text-error"
                    role="alert"
                  >
                    {item.error}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                      item.status === "complete" &&
                        "bg-success/10 text-success",
                      (item.status === "failed" ||
                        item.status === "rejected") &&
                        "bg-error/10 text-error",
                      item.status === "processing" &&
                        "bg-accent-soft text-accent",
                      (item.status === "ready" || item.status === "queued") &&
                        "bg-border/60 text-muted",
                    )}
                  >
                    {statusLabel(item)}
                  </span>
                  {adjusted ? (
                    <span className="inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-semibold text-accent">
                      Adjusted
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={processing}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(item.id);
                    }}
                    title="Remove"
                    aria-label={`Remove ${item.name}`}
                    className={cn(
                      "inline-flex min-h-7 min-w-7 items-center justify-center text-lg font-semibold leading-none text-error",
                      "transition-opacity hover:opacity-80",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      "disabled:pointer-events-none disabled:opacity-40",
                    )}
                  >
                    ×
                  </button>
                </div>

                {item.output ? (
                  <div className="mt-1.5 flex justify-center">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-8 px-2.5 py-1 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDownload(item.id);
                      }}
                      aria-label={`Download ${item.output.filename}`}
                    >
                      Download
                    </Button>
                  </div>
                ) : batchHasDownloads &&
                  (item.status === "ready" || item.status === "failed") &&
                  item.sourceWidth &&
                  item.sourceHeight ? (
                  <div className="mt-1.5 flex justify-center">
                    <Button
                      type="button"
                      size="sm"
                      disabled={processing}
                      className="min-h-8 border border-success/25 bg-success/10 px-2.5 py-1 text-xs text-success shadow-none hover:bg-success/20 hover:text-success"
                      onClick={(event) => {
                        event.stopPropagation();
                        onProcess(item.id);
                      }}
                      aria-label={`Process ${item.name}`}
                    >
                      Process
                    </Button>
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
