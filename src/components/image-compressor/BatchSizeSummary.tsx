"use client";

import { useMemo } from "react";
import {
  createBorderSparkleLayout,
  DEFAULT_BORDER_SPARKLE_LAYOUT,
} from "@/components/brand/border-sparkle-layout";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import {
  formatBatchSizeCopy,
  type BatchSizeSummary as BatchSizeSummaryModel,
} from "@/lib/image-batch-summary";
import {
  formatExactFileSize,
  formatFileSize,
} from "@/lib/image-file-utils";
import { cn } from "@/lib/utils";

type BatchSizeSummaryProps = {
  summary: BatchSizeSummaryModel;
  className?: string;
  /** Compact variant for the completed-results header. */
  compact?: boolean;
  /** Bump to replay sparkles on the summary box border (0 = hidden). */
  sparkleBurstKey?: number;
};

const SPARKLE_STAGGER_MS = 320;

/**
 * Prominent original → estimated/actual batch file-size comparison.
 */
export function BatchSizeSummary({
  summary,
  className,
  compact = false,
  sparkleBurstKey = 0,
}: BatchSizeSummaryProps) {
  const sparkleLayout = useMemo(
    () =>
      sparkleBurstKey > 0
        ? createBorderSparkleLayout()
        : DEFAULT_BORDER_SPARKLE_LAYOUT,
    [sparkleBurstKey],
  );

  if (summary.validImageCount === 0) return null;

  const copy = formatBatchSizeCopy(summary);
  const originalBytes =
    summary.mode === "actual"
      ? summary.comparisonOriginalBytes
      : summary.allUploadedOriginalBytes;
  const originalDisplay =
    summary.mode === "actual"
      ? formatExactFileSize(originalBytes)
      : formatFileSize(originalBytes);

  const showSparkles = sparkleBurstKey > 0;
  const leftDelay = sparkleLayout.rightFirst ? SPARKLE_STAGGER_MS : 0;
  const rightDelay = sparkleLayout.rightFirst ? 0 : SPARKLE_STAGGER_MS;

  return (
    <aside
      className={cn(
        "relative overflow-visible rounded-2xl border border-border bg-background/80 px-4 py-4 shadow-soft-sm sm:px-5",
        className,
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      {showSparkles ? (
        <>
          {/* Sparkles sit on the box border — vertical spot is randomized each play */}
          <span
            className="pointer-events-none absolute left-0 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${sparkleLayout.leftOffsetPercent}%` }}
          >
            <SparkleBurst playKey={sparkleBurstKey} delayMs={leftDelay} />
          </span>
          <span
            className="pointer-events-none absolute right-0 z-10 translate-x-1/2 -translate-y-1/2"
            style={{ top: `${sparkleLayout.rightOffsetPercent}%` }}
          >
            <SparkleBurst playKey={sparkleBurstKey} delayMs={rightDelay} />
          </span>
        </>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {copy.headline}
        </p>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            summary.mode === "estimated"
              ? "bg-accent-soft text-accent"
              : "bg-success/10 text-success",
          )}
        >
          {copy.badge}
        </span>
      </div>

      <div
        className={cn(
          "mt-4 grid items-center gap-3",
          "grid-cols-1 sm:grid-cols-[1fr_auto_1fr]",
          compact && "sm:gap-4",
        )}
      >
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {copy.originalLabel}
          </p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {originalDisplay}
          </p>
        </div>

        <p
          className="hidden text-2xl font-light text-muted sm:block"
          aria-hidden="true"
        >
          →
        </p>
        <p
          className="text-center text-xl font-light text-muted sm:hidden"
          aria-hidden="true"
        >
          ↓
        </p>

        <div className="min-w-0 text-center sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {copy.outputLabel}
          </p>
          <p
            className={cn(
              "mt-1 font-display text-xl font-semibold tabular-nums sm:text-2xl",
              summary.outputBytes == null ? "text-muted" : "text-accent",
            )}
          >
            {copy.outputValue}
          </p>
        </div>
      </div>

      {copy.deltaLine ? (
        <p
          className={cn(
            "mt-4 text-center text-sm font-medium sm:text-[0.9375rem]",
            copy.tone === "savings" && "text-success",
            copy.tone === "increase" && "text-foreground",
            copy.tone === "neutral" && "text-muted",
          )}
        >
          {copy.deltaLine}
        </p>
      ) : null}

      {copy.coverageLine ? (
        <p className="mt-2 text-center text-sm text-muted">{copy.coverageLine}</p>
      ) : null}

      {copy.uploadedLine ? (
        <p className="mt-2 text-center text-sm text-muted">{copy.uploadedLine}</p>
      ) : null}

      {summary.mode === "actual" && summary.failedCount > 0 ? (
        <p className="mt-2 text-center text-sm text-muted">
          {summary.failedCount} failed
          {summary.failedCount === 1 ? " image" : " images"} excluded from the
          compressed total
        </p>
      ) : null}

      {copy.statusLine ? (
        <p className="mt-3 text-center text-sm font-medium text-accent" role="status">
          {copy.statusLine}
        </p>
      ) : null}
    </aside>
  );
}
