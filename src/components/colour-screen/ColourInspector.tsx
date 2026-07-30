"use client";

import { Button } from "@/components/ui/Button";
import { rgbToCss } from "@/lib/colour-conversions";
import { formatHex } from "@/lib/colour-formatting";
import type { RgbColour } from "@/lib/colour-types";
import { cn } from "@/lib/utils";

type ColourInspectorProps = {
  colour: RgbColour;
  alpha?: number;
  sourceLabel?: string;
  coordinates?: { x: number; y: number } | null;
  onUseAsBackground?: () => void;
  onUseAsMarker?: () => void;
  onAddToCycle?: () => void;
  className?: string;
};

/**
 * Compact selected-colour summary (swatch + HEX + actions under the swatch).
 * Full HEX/RGB/HSL/HSV/CMYK editing lives in Colour values near the preview.
 */
export function ColourInspector({
  colour,
  alpha,
  coordinates,
  onUseAsBackground,
  onUseAsMarker,
  onAddToCycle,
  className,
}: ColourInspectorProps) {
  const hex = formatHex(colour);
  const hasActions = onUseAsBackground || onUseAsMarker || onAddToCycle;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className="h-20 w-20 shrink-0 rounded-2xl border border-border shadow-soft-sm sm:h-24 sm:w-24"
          style={{ backgroundColor: rgbToCss(colour, alpha ?? 1) }}
          role="img"
          aria-label={`Colour swatch ${hex}`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold tracking-tight text-foreground">
            Selected colour
          </p>
          <p className="mt-1 font-mono text-[0.9375rem] text-foreground sm:text-base">
            {hex}
          </p>
          {coordinates ? (
            <p className="mt-1 text-[0.9375rem] text-muted sm:text-base">
              Pixel: {coordinates.x}, {coordinates.y}
            </p>
          ) : null}
        </div>
      </div>

      {hasActions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {onAddToCycle ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAddToCycle}
            >
              Add to cycle
            </Button>
          ) : null}
          {onUseAsMarker ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onUseAsMarker}
            >
              Use as marker colour
            </Button>
          ) : null}
          {onUseAsBackground ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onUseAsBackground}
            >
              Use as background
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
