"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/Button";
import {
  IMAGE_CROP_LIMITS,
  type CropFocus,
} from "@/lib/image-compressor-config";
import {
  applyZoomKeepingCentre,
  createAutomaticCropState,
  isSignificantlyEnlarged,
  manualCropIsActive,
  nudgePan,
  panDeltaFromPointerDrag,
  previewLayoutContain,
  previewLayoutFromCrop,
  serializeCropState,
  type ManualCropState,
} from "@/lib/image-crop-editor";
import { EditableImageFilename } from "@/components/image-compressor/EditableImageFilename";
import { cn } from "@/lib/utils";

type CropEditorProps = {
  imageUrl: string | null;
  imageName: string;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  keepOriginal: boolean;
  /** Show a checkered pattern behind formats that can be transparent (PNG/WebP). */
  showTransparencyPattern?: boolean;
  cropFocus: CropFocus;
  cropState: ManualCropState | null;
  index: number;
  total: number;
  disabled?: boolean;
  onCropChange: (state: ManualCropState) => void;
  onResetCrop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDoneEditing: () => void;
  onRename: (nextFilename: string) => void;
  onResetAllCrops?: () => void;
  onApplyCropToAll?: () => void;
  /** Batch process / clear actions shown under the crop tools. */
  processLabel?: string;
  canProcess?: boolean;
  onProcess?: () => void;
  onClearBatch?: () => void;
  clearDisabled?: boolean;
};

function DownArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

const DONE_EDITING_BUTTON_CLASS =
  "!min-w-11 !w-11 !border-accent/30 !bg-accent-soft !px-0 !text-accent shadow-soft-sm hover:!border-accent/50 hover:!bg-[#cfe3ff] hover:!text-accent";

/**
 * Large interactive Fill-and-crop preview with drag, zoom, and keyboard support.
 */
export function CropEditor({
  imageUrl,
  imageName,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  keepOriginal,
  showTransparencyPattern = false,
  cropFocus,
  cropState,
  index,
  total,
  disabled = false,
  onCropChange,
  onResetCrop,
  onPrevious,
  onNext,
  onDoneEditing,
  onRename,
  onResetAllCrops,
  onApplyCropToAll,
  processLabel,
  canProcess = false,
  onProcess,
  onClearBatch,
  clearDisabled = false,
}: CropEditorProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameNode, setFrameNode] = useState<HTMLDivElement | null>(null);
  const pointersRef = useRef(
    new Map<number, { x: number; y: number }>(),
  );
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const pinchRef = useRef<{
    startDistance: number;
    startZoom: number;
  } | null>(null);
  const instructionsId = useId();
  const [frameSize, setFrameSize] = useState({ width: 750, height: 500 });
  /** Live framing while wheel/drag updates ahead of parent state. */
  const [liveState, setLiveState] = useState<ManualCropState | null>(null);

  const editable = manualCropIsActive(
    keepOriginal,
    targetWidth,
    targetHeight,
  );
  const source = { width: sourceWidth, height: sourceHeight };
  const target = { width: targetWidth, height: targetHeight };
  const targetAspect = targetWidth / targetHeight;

  const state =
    liveState ??
    cropState ??
    createAutomaticCropState(source, target, cropFocus);
  const authoredState = liveState ?? cropState;
  const stateKey = authoredState
    ? serializeCropState(authoredState)
    : `auto:${sourceWidth}x${sourceHeight}:${targetWidth}x${targetHeight}:${cropFocus}`;

  // Drop ephemeral framing once the parent has caught up (or the image changes).
  useEffect(() => {
    setLiveState(null);
  }, [cropState, imageUrl, targetWidth, targetHeight]);

  const stateRef = useRef(state);
  const stateKeyRef = useRef(stateKey);
  const sourceRef = useRef(source);
  const targetRef = useRef(target);
  const frameSizeRef = useRef(frameSize);
  const editableRef = useRef(editable);
  const disabledRef = useRef(disabled);

  const commit = useCallback(
    (next: ManualCropState) => {
      stateRef.current = next;
      stateKeyRef.current = serializeCropState(next);
      setLiveState(next);
      onCropChange(next);
    },
    [onCropChange],
  );
  const commitRef = useRef(commit);

  // Sync from props only when the crop identity changes — avoid resetting
  // zoom to 1 on every parent re-render while cropState is still null.
  if (stateKeyRef.current !== stateKey) {
    stateKeyRef.current = stateKey;
    stateRef.current = state;
  }

  sourceRef.current = source;
  targetRef.current = target;
  frameSizeRef.current = frameSize;
  commitRef.current = commit;
  editableRef.current = editable;
  disabledRef.current = disabled;

  const setFrameRef = useCallback((node: HTMLDivElement | null) => {
    frameRef.current = node;
    setFrameNode(node);
  }, []);

  useEffect(() => {
    const node = frameNode;
    if (!node) return;

    const update = () => {
      const width = node.clientWidth;
      const height = width / targetAspect;
      setFrameSize({ width, height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [frameNode, targetAspect]);

  // Wheel zoom only when the crop frame is focused (click/tap first).
  // Hover-only scroll must not zoom — that accidentally invalidates processed results.
  useEffect(() => {
    const node = frameNode;
    if (!node || !editable) return;

    const onWheel = (event: WheelEvent) => {
      if (!editableRef.current || disabledRef.current) return;
      if (document.activeElement !== node) return;
      event.preventDefault();
      event.stopPropagation();

      const direction = event.deltaY > 0 ? -1 : 1;
      const current = stateRef.current;
      commitRef.current(
        applyZoomKeepingCentre(
          current,
          current.zoom + direction * IMAGE_CROP_LIMITS.wheelZoomStep,
          sourceRef.current,
          targetRef.current,
        ),
      );
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [frameNode, editable]);

  const layout = keepOriginal
    ? previewLayoutContain(source, frameSize.width, frameSize.height)
    : previewLayoutFromCrop(
        source,
        target,
        state,
        frameSize.width,
        frameSize.height,
      );

  const enlarged =
    editable && isSignificantlyEnlarged(source, target, state);

  function pointerDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function beginPinchIfNeeded() {
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
      return;
    }
    const points = [...pointersRef.current.values()];
    const distance = pointerDistance(points[0], points[1]);
    if (distance < 8) return;
    dragRef.current = null;
    pinchRef.current = {
      startDistance: distance,
      startZoom: stateRef.current.zoom,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || disabled || !imageUrl) return;
    // Focus so later wheel zoom works; preventScroll keeps the page from jumping.
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2) {
      beginPinchIfNeeded();
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || disabled) return;
    if (!pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      event.preventDefault();
      const points = [...pointersRef.current.values()];
      const distance = pointerDistance(points[0], points[1]);
      if (distance < 8 || pinchRef.current.startDistance < 8) return;
      const ratio = distance / pinchRef.current.startDistance;
      commit(
        applyZoomKeepingCentre(
          stateRef.current,
          pinchRef.current.startZoom * ratio,
          source,
          target,
        ),
      );
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();

    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;

    const pan = panDeltaFromPointerDrag(
      deltaX,
      deltaY,
      source,
      target,
      stateRef.current,
      frameSizeRef.current.width,
      frameSizeRef.current.height,
    );
    commit({
      ...stateRef.current,
      panX: pan.panX,
      panY: pan.panY,
      adjusted: true,
      needsReview: false,
      reviewMessage: null,
    });
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    // Resume single-finger pan if one touch remains.
    if (pointersRef.current.size === 1) {
      const [pointerId, point] = [...pointersRef.current.entries()][0];
      dragRef.current = {
        pointerId,
        lastX: point.x,
        lastY: point.y,
      };
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!editable || disabled) return;

    const key = event.key;
    const step = event.shiftKey
      ? IMAGE_CROP_LIMITS.keyboardPanStepLarge
      : IMAGE_CROP_LIMITS.keyboardPanStep;

    if (key === "ArrowLeft") {
      event.preventDefault();
      commit(nudgePan(state, -step, 0, source, target));
      return;
    }
    if (key === "ArrowRight") {
      event.preventDefault();
      commit(nudgePan(state, step, 0, source, target));
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      commit(nudgePan(state, 0, -step, source, target));
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      commit(nudgePan(state, 0, step, source, target));
      return;
    }
    if (key === "+" || key === "=") {
      event.preventDefault();
      commit(
        applyZoomKeepingCentre(
          state,
          state.zoom + IMAGE_CROP_LIMITS.keyboardZoomStep,
          source,
          target,
        ),
      );
      return;
    }
    if (key === "-" || key === "_") {
      event.preventDefault();
      commit(
        applyZoomKeepingCentre(
          state,
          state.zoom - IMAGE_CROP_LIMITS.keyboardZoomStep,
          source,
          target,
        ),
      );
    }
  }

  const modeMessage = keepOriginal
    ? "Keep original dimensions — the image is shown best-fit inside a fixed preview frame. Light blue areas are not part of the image."
    : null;

  return (
    <section
      id="batch-crop-preview"
      className="scroll-mt-[calc(var(--site-header-height)+5px)] space-y-2 sm:scroll-mt-[calc(var(--site-header-height-sm)+5px)]"
      aria-label="Crop and preview editor"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <h2 className="min-w-0 font-display text-xl font-semibold tracking-tight text-foreground">
          Preview • Edit • Crop
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={onDoneEditing}
          className={DONE_EDITING_BUTTON_CLASS}
          aria-label="Done editing"
          title="Done editing"
        >
          <DownArrowIcon />
        </Button>
        <EditableImageFilename
          filename={imageName}
          disabled={disabled}
          align="right"
          className="min-w-0 text-sm text-muted"
          onRename={onRename}
        />
      </div>

      <div
        ref={setFrameRef}
        role="application"
        tabIndex={editable && !disabled ? 0 : -1}
        aria-label={
          keepOriginal
            ? `Preview for ${imageName}. Original dimensions kept; image fitted inside a ${targetWidth} by ${targetHeight} frame. Light blue areas are not part of the image.`
            : `Crop preview for ${imageName}. Output frame ${targetWidth} by ${targetHeight} pixels.`
        }
        aria-describedby={editable ? instructionsId : undefined}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-border shadow-soft-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          keepOriginal ? "bg-accent-soft" : "bg-background",
          editable && !disabled
            ? "cursor-grab touch-none active:cursor-grabbing"
            : "cursor-default",
        )}
        style={{ aspectRatio: `${targetWidth} / ${targetHeight}` }}
      >
        {imageUrl ? (
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
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
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
          <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted">
            No preview available
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent/30"
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-3 items-center gap-2">
        <div className="justify-self-start">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || total <= 1}
            onClick={onPrevious}
          >
            Previous
          </Button>
        </div>
        <div className="justify-self-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onDoneEditing}
            className={DONE_EDITING_BUTTON_CLASS}
            aria-label="Done editing"
            title="Done editing"
          >
            <DownArrowIcon />
          </Button>
        </div>
        <div className="flex w-full min-w-0 items-center justify-self-stretch">
          <div className="min-w-0 flex-1" aria-hidden="true" />
          <span
            className="shrink-0 whitespace-nowrap text-sm text-muted"
            aria-live="polite"
          >
            {index + 1} of {total}
          </span>
          <div className="min-w-0 flex-[3]" aria-hidden="true" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || total <= 1}
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </div>

      {editable ? (
        <p id={instructionsId} className="sr-only">
          Click or tap the preview to focus it, then drag to reposition. With the
          preview focused, scroll to zoom, or pinch with two fingers on touch
          devices. Arrow keys move the image; plus and minus also zoom.
        </p>
      ) : modeMessage ? (
        <p className="text-sm text-muted">{modeMessage}</p>
      ) : null}

      {state.reviewMessage ? (
        <p className="text-sm font-medium text-foreground" role="status">
          {state.reviewMessage}
        </p>
      ) : null}

      {enlarged ? (
        <p className="text-sm font-medium text-foreground" role="status">
          This crop is enlarged and may look softer.
        </p>
      ) : null}

      {editable ? (
        <div className="mt-[22px] rounded-2xl border border-border bg-background/70 px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={onResetCrop}
            >
              Reset this crop
            </Button>
            {onResetAllCrops ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={onResetAllCrops}
              >
                Reset all crops
              </Button>
            ) : null}
            {onApplyCropToAll ? (
              <>
                <span className="px-1 text-sm text-muted" aria-hidden="true">
                  |
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || !state.adjusted}
                  onClick={onApplyCropToAll}
                >
                  Apply this crop position to all
                </Button>
              </>
            ) : null}
          </div>
          {onProcess || onClearBatch ? (
            <div className="mt-4 flex flex-row flex-wrap items-center justify-center gap-3 border-t border-border/70 pt-4">
              {onProcess && processLabel ? (
                <Button
                  type="button"
                  disabled={!canProcess || disabled}
                  onClick={onProcess}
                  className="min-w-0 flex-1 sm:flex-none"
                >
                  {processLabel}
                </Button>
              ) : null}
              {onClearBatch ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={clearDisabled || disabled}
                  onClick={onClearBatch}
                  className="min-w-0 flex-1 sm:flex-none"
                >
                  Clear batch
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : onProcess || onClearBatch ? (
        <div className="mt-[22px] flex flex-row flex-wrap items-center justify-center gap-3">
          {onProcess && processLabel ? (
            <Button
              type="button"
              disabled={!canProcess || disabled}
              onClick={onProcess}
              className="min-w-0 flex-1 sm:flex-none"
            >
              {processLabel}
            </Button>
          ) : null}
          {onClearBatch ? (
            <Button
              type="button"
              variant="secondary"
              disabled={clearDisabled || disabled}
              onClick={onClearBatch}
              className="min-w-0 flex-1 sm:flex-none"
            >
              Clear batch
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
