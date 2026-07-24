"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { rgbToCss } from "@/lib/colour-conversions";
import { formatHex } from "@/lib/colour-formatting";
import { MARKER_LIMITS, type MarkerSettings } from "@/lib/colour-screen-config";
import type { RgbColour } from "@/lib/colour-types";
import { cn } from "@/lib/utils";

type CursorMarkerGraphicProps = {
  settings: MarkerSettings;
  /** Position of the marker centre within its positioning context. */
  x: number;
  y: number;
  /** CSS position mode — fixed for fullscreen, absolute for previews. */
  position?: "fixed" | "absolute";
  /** Stacking order. Previews should stay below overlays like the colour picker. */
  zIndex?: number;
  className?: string;
};

/**
 * Visual marker graphic (ring, filled circle, crosshair, etc.).
 */
export function CursorMarkerGraphic({
  settings,
  x,
  y,
  position = "fixed",
  zIndex = 80,
  className,
}: CursorMarkerGraphicProps) {
  const colour = rgbToCss(settings.colour, settings.opacity);
  const size = settings.diameter;
  const thickness = MARKER_LIMITS.strokeWidth;
  const half = size / 2;

  const commonStyle: CSSProperties = {
    position,
    left: x,
    top: y,
    width: size,
    height: size,
    marginLeft: -half,
    marginTop: -half,
    pointerEvents: "none",
    zIndex,
    opacity: settings.opacity,
  };

  if (settings.style === "filled-circle") {
    return (
      <div
        aria-hidden="true"
        className={className}
        style={{
          ...commonStyle,
          borderRadius: "9999px",
          backgroundColor: colour,
        }}
      />
    );
  }

  if (settings.style === "crosshair") {
    return (
      <div aria-hidden="true" className={className} style={commonStyle}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: thickness,
            height: "100%",
            marginLeft: -thickness / 2,
            backgroundColor: colour,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            height: thickness,
            width: "100%",
            marginTop: -thickness / 2,
            backgroundColor: colour,
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        ...commonStyle,
        borderRadius: "9999px",
        border: `${thickness}px solid ${colour}`,
        boxSizing: "border-box",
      }}
    >
      {settings.style === "ring-dot" ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: Math.max(4, thickness + 2),
            height: Math.max(4, thickness + 2),
            marginLeft: -Math.max(2, (thickness + 2) / 2),
            marginTop: -Math.max(2, (thickness + 2) / 2),
            borderRadius: "9999px",
            backgroundColor: colour,
          }}
        />
      ) : null}
    </div>
  );
}

type CursorMarkerOverlayProps = {
  settings: MarkerSettings;
  x: number;
  y: number;
  visible: boolean;
};

/**
 * Fullscreen / page-level pointer marker overlay.
 */
export function CursorMarkerOverlay({
  settings,
  x,
  y,
  visible,
}: CursorMarkerOverlayProps) {
  if (!settings.enabled || !visible) return null;
  return (
    <CursorMarkerGraphic settings={settings} x={x} y={y} position="fixed" />
  );
}

type CursorMarkerPreviewProps = {
  background: RgbColour;
  marker: MarkerSettings;
  className?: string;
  /** Section title above the preview. Pass null to hide. */
  title?: string | null;
  /** Helper text under the preview. Pass null to hide. */
  helperText?: string | null;
  /** Extra classes for the preview box (height, etc.). */
  boxClassName?: string;
  /** Optional control shown inside the preview (e.g. add-to-cycle). */
  action?: ReactNode;
  /** Double-click the preview surface (not action buttons). */
  onDoubleClick?: () => void;
};

/**
 * Live preview: screen colour fill with the current marker style inside.
 * Move the pointer over the window to try the marker when it is enabled.
 */
export function CursorMarkerPreview({
  background,
  marker,
  className,
  title = "Marker preview",
  helperText = `Filled with your selected screen colour (${formatHex(background)}). Move over the preview to try the marker.`,
  boxClassName,
  action,
  onDoubleClick,
}: CursorMarkerPreviewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState({ width: 320, height: 192 });
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      setBoxSize({ width: el.clientWidth, height: el.clientHeight });
    }

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  function handlePointerLeave() {
    setPointer(null);
  }

  const markerX = pointer?.x ?? boxSize.width / 2;
  const markerY = pointer?.y ?? boxSize.height / 2;
  const showMarker = marker.enabled;

  return (
    <div className={cn("space-y-2", className)}>
      {title ? (
        <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
          {title}
        </p>
      ) : null}
      <div
        ref={boxRef}
        className={cn(
          "relative min-h-[16rem] h-full overflow-hidden rounded-2xl border border-border shadow-soft-sm sm:min-h-[20rem]",
          showMarker && marker.hideSystemCursor
            ? "cursor-none"
            : showMarker
              ? "cursor-crosshair"
              : undefined,
          boxClassName,
        )}
        style={{ backgroundColor: rgbToCss(background) }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          onDoubleClick?.();
        }}
        role="img"
        aria-label={
          showMarker
            ? `Screen colour preview ${formatHex(background)} with cursor marker. Move your pointer over this area to try the marker. Double-click to start the fullscreen colour test.`
            : `Screen colour preview ${formatHex(background)}. Double-click to start the fullscreen colour test.`
        }
      >
        {showMarker ? (
          <CursorMarkerGraphic
            settings={marker}
            x={markerX}
            y={markerY}
            position="absolute"
            zIndex={1}
          />
        ) : null}
        {action ? (
          <div className="absolute inset-x-0 bottom-3 z-[2] flex justify-center px-3">
            {action}
          </div>
        ) : null}
      </div>
      {helperText ? (
        <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
