"use client";

import { useEffect, useRef, useState } from "react";
import type { CropFocus } from "@/lib/image-compressor-config";
import {
  createAutomaticCropState,
  previewLayoutContain,
  previewLayoutFromCrop,
  type ManualCropState,
} from "@/lib/image-crop-editor";
import { cn } from "@/lib/utils";

type CropAwareThumbnailProps = {
  imageUrl: string | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  targetWidth: number;
  targetHeight: number;
  keepOriginal: boolean;
  cropFocus: CropFocus;
  cropState: ManualCropState | null;
  showTransparencyPattern?: boolean;
  className?: string;
};

/**
 * Thumbnail frame matching the preset aspect ratio, with live crop framing
 * (or best-fit letterboxing for Keep original).
 */
export function CropAwareThumbnail({
  imageUrl,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  keepOriginal,
  cropFocus,
  cropState,
  showTransparencyPattern = false,
  className,
}: CropAwareThumbnailProps) {
  const frameRef = useRef<HTMLSpanElement | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 120, height: 120 });

  const aspect = targetWidth / targetHeight;
  const isLandscapeOrSquare = aspect >= 1;

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const update = () => {
      setFrameSize({
        width: Math.max(1, node.clientWidth),
        height: Math.max(1, node.clientHeight),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [targetWidth, targetHeight]);

  const hasSource =
    sourceWidth != null &&
    sourceHeight != null &&
    sourceWidth > 0 &&
    sourceHeight > 0;

  const source = hasSource
    ? { width: sourceWidth, height: sourceHeight }
    : null;
  const target = { width: targetWidth, height: targetHeight };

  const state =
    source == null
      ? null
      : (cropState ?? createAutomaticCropState(source, target, cropFocus));

  const layout =
    source == null || state == null
      ? null
      : keepOriginal
        ? previewLayoutContain(source, frameSize.width, frameSize.height)
        : previewLayoutFromCrop(
            source,
            target,
            state,
            frameSize.width,
            frameSize.height,
          );

  return (
    <span
      ref={frameRef}
      className={cn(
        "relative mx-auto block overflow-hidden rounded-xl border border-border",
        keepOriginal ? "bg-accent-soft" : "bg-surface",
        isLandscapeOrSquare
          ? "w-full max-w-[7.5rem] sm:max-w-[8.5rem]"
          : "h-[7.5rem] w-auto max-w-full sm:h-[8.5rem]",
        className,
      )}
      style={{ aspectRatio: `${targetWidth} / ${targetHeight}` }}
    >
      {imageUrl && layout ? (
        <>
          {showTransparencyPattern ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bg-transparency-checker"
              style={{
                width: layout.imageWidth,
                height: layout.imageHeight,
                left: layout.offsetX,
                top: layout.offsetY,
              }}
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={{
              width: layout.imageWidth,
              height: layout.imageHeight,
              left: layout.offsetX,
              top: layout.offsetY,
            }}
          />
        </>
      ) : (
        <span className="flex size-full items-center justify-center text-xs text-muted">
          —
        </span>
      )}
    </span>
  );
}
