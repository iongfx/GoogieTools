"use client";

import { useEffect, useRef, useState } from "react";
import { CursorMarkerOverlay } from "@/components/colour-screen/CursorMarkerOverlay";
import { Button } from "@/components/ui/Button";
import { rgbToCss } from "@/lib/colour-conversions";
import type { MarkerSettings } from "@/lib/colour-screen-config";
import { SHORTCUT_GUIDE } from "@/lib/colour-screen-shortcuts";
import type { RgbColour } from "@/lib/colour-types";
import {
  formatHex,
  formatRgbChannels,
} from "@/lib/colour-formatting";
import { cn } from "@/lib/utils";

type FullscreenTestModeProps = {
  active: boolean;
  background: RgbColour;
  marker: MarkerSettings;
  cycleLabel?: string | null;
  paused?: boolean;
  /** True when Delay is not Manual — auto-cycle can run, so Pause is useful. */
  autoCycleEnabled?: boolean;
  onExit: () => void;
  onAdvance: () => void;
  onPrevious: () => void;
  onTogglePause: () => void;
  reducedMotion?: boolean;
};

const TOP_CONTROL_BUTTON_CLASS =
  "border-white/40 !bg-white/95 !text-black shadow-soft-md hover:!bg-white hover:!text-black";

const BOTTOM_CONTROL_BUTTON_CLASS = "!bg-white/95 !text-black hover:!text-black";

/**
 * Minimal fullscreen / full-browser colour test surface.
 * Covers the site chrome so only the test colour remains visible.
 */
export function FullscreenTestMode({
  active,
  background,
  marker,
  cycleLabel,
  paused = false,
  autoCycleEnabled = false,
  onExit,
  onAdvance,
  onPrevious,
  onTogglePause,
  reducedMotion = false,
}: FullscreenTestModeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<number | null>(null);
  const touchActiveRef = useRef(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0, visible: false });
  const [showHelp, setShowHelp] = useState(false);
  const [showIntroControls, setShowIntroControls] = useState(true);
  const [showTopControls, setShowTopControls] = useState(false);
  const [showBottomControls, setShowBottomControls] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const TOUCH_CONTROLS_HOLD_MS = 3500;

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsCoarsePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Show all buttons for 1 second when entering fullscreen, then hide.
  useEffect(() => {
    if (!active) return;
    touchActiveRef.current = false;
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
    setShowIntroControls(true);
    setShowTopControls(false);
    setShowBottomControls(false);
    const timer = window.setTimeout(() => {
      setShowIntroControls(false);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function clearHideTimer() {
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }
    }

    function showTouchControls() {
      setShowIntroControls(false);
      setShowTopControls(true);
      setShowBottomControls(true);
    }

    function scheduleHideTouchControls() {
      clearHideTimer();
      hideControlsTimerRef.current = window.setTimeout(() => {
        if (touchActiveRef.current) return;
        setShowTopControls(false);
        setShowBottomControls(false);
        hideControlsTimerRef.current = null;
      }, TOUCH_CONTROLS_HOLD_MS);
    }

    function isTouchLike(event: PointerEvent) {
      return event.pointerType === "touch" || isCoarsePointer;
    }

    function updateEdgeControls(clientY: number) {
      const topRect = topBarRef.current?.getBoundingClientRect();
      const bottomRect = bottomBarRef.current?.getBoundingClientRect();
      const topLimit = (topRect?.bottom ?? 64) + 15;
      const bottomLimit = (bottomRect?.top ?? window.innerHeight - 64) - 15;
      setShowTopControls(clientY <= topLimit);
      setShowBottomControls(clientY >= bottomLimit);
    }

    function onPointerDown(event: PointerEvent) {
      setPointer({ x: event.clientX, y: event.clientY, visible: true });

      if (isTouchLike(event)) {
        touchActiveRef.current = true;
        clearHideTimer();
        showTouchControls();
        return;
      }

      updateEdgeControls(event.clientY);
    }

    function onPointerMove(event: PointerEvent) {
      setPointer({ x: event.clientX, y: event.clientY, visible: true });

      if (isTouchLike(event) || touchActiveRef.current) {
        if (touchActiveRef.current) {
          clearHideTimer();
          showTouchControls();
        }
        return;
      }

      updateEdgeControls(event.clientY);
    }

    function onPointerUp(event: PointerEvent) {
      if (!isTouchLike(event) && !touchActiveRef.current) return;
      touchActiveRef.current = false;
      showTouchControls();
      scheduleHideTouchControls();
    }

    function onPointerCancel() {
      if (!touchActiveRef.current) return;
      touchActiveRef.current = false;
      showTouchControls();
      scheduleHideTouchControls();
    }

    function onPointerLeave() {
      if (touchActiveRef.current) return;
      setPointer((prev) => ({ ...prev, visible: false }));
      if (!isCoarsePointer) {
        setShowTopControls(false);
        setShowBottomControls(false);
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      clearHideTimer();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [active, isCoarsePointer]);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setShowHelp((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (!active) return null;

  const bg = rgbToCss(background);
  const topVisible = showIntroControls || showTopControls;
  const bottomVisible = showIntroControls || showBottomControls;
  const controlsVisible = topVisible || bottomVisible || showHelp;
  // Show the system cursor whenever on-screen controls are visible.
  const hideCursor = marker.hideSystemCursor && !controlsVisible;
  // Show colour info whenever the bottom bar is visible (incl. touch / intro).
  const showColourCodes = bottomVisible;
  const rgb = formatRgbChannels(background);
  const hex = formatHex(background);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen colour test"
      className={cn(
        "fixed inset-0 z-[100] overflow-hidden overscroll-none",
        hideCursor && "cursor-none",
      )}
      style={{ backgroundColor: bg }}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        onExit();
      }}
    >
      <CursorMarkerOverlay
        settings={marker}
        x={pointer.x}
        y={pointer.y}
        visible={pointer.visible}
      />

      <div
        ref={topBarRef}
        className={cn(
          "absolute inset-x-0 top-0 z-[90] flex justify-center p-3 sm:p-4",
          "transition-opacity duration-200",
          topVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0",
          reducedMotion && "transition-none",
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={TOP_CONTROL_BUTTON_CLASS}
            onClick={onExit}
          >
            Exit test
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={TOP_CONTROL_BUTTON_CLASS}
            onClick={() => setShowHelp((open) => !open)}
            aria-label="Show keyboard shortcuts"
          >
            ?
          </Button>
          {(cycleLabel || paused) && (
            <p className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[0.9375rem] text-white backdrop-blur-sm sm:text-base">
              {cycleLabel ? cycleLabel : null}
              {cycleLabel && paused ? " · " : null}
              {paused ? "Paused" : null}
            </p>
          )}
        </div>
      </div>

      <div
        ref={bottomBarRef}
        className={cn(
          "absolute inset-x-0 bottom-0 z-[90] flex justify-center p-4",
          "transition-opacity duration-200",
          bottomVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0",
          reducedMotion && "transition-none",
        )}
      >
        <div className="grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div aria-hidden="true" />
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={BOTTOM_CONTROL_BUTTON_CLASS}
              onClick={onPrevious}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={BOTTOM_CONTROL_BUTTON_CLASS}
              onClick={onAdvance}
            >
              Next colour
            </Button>
            {autoCycleEnabled ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={cn(BOTTOM_CONTROL_BUTTON_CLASS, "min-w-[5.75rem]")}
                onClick={onTogglePause}
              >
                {paused ? "Resume" : "Pause"}
              </Button>
            ) : null}
          </div>
          <div className="min-w-0 justify-self-start">
            {showColourCodes ? (
              <p className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 font-mono text-[0.9375rem] text-white backdrop-blur-sm sm:text-base">
                RGB: {rgb.r}, {rgb.g}, {rgb.b}
                <span className="mx-2 text-white/50" aria-hidden="true">
                  ·
                </span>
                HEX: {hex}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {showHelp ? (
        <div
          className="absolute inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowHelp(false)}
          role="presentation"
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-auto rounded-2xl border border-border bg-surface p-5 shadow-soft-lg"
            role="document"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Shortcut help
                </h2>
                <p className="mt-1 text-[0.9375rem] text-muted sm:text-base">
                  Current background: {hex}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-2xl font-semibold leading-none text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowHelp(false)}
                aria-label="Close help"
              >
                ×
              </button>
            </div>
            <ul className="mt-4 list-none space-y-2 p-0">
              {SHORTCUT_GUIDE.map((item) => (
                <li
                  key={item.keys}
                  className="flex gap-3 rounded-xl border border-border/80 px-3 py-2 text-[0.9375rem] sm:text-base"
                >
                  <span className="w-24 shrink-0 font-mono font-semibold text-accent">
                    {item.keys}
                  </span>
                  <span className="text-muted">{item.description}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onExit}>
                Exit test
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowHelp(false)}
              >
                Back to test
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <span className="sr-only">
        Fullscreen colour test active. Press Escape or double-click to exit. Press question mark
        for shortcuts. Current colour RGB {rgb.r}, {rgb.g}, {rgb.b}, HEX {hex}.
      </span>
    </div>
  );
}
