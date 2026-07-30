"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { rgbToCss } from "@/lib/colour-conversions";
import { formatHex } from "@/lib/colour-formatting";
import type { RgbColour } from "@/lib/colour-types";
import { cn } from "@/lib/utils";

const FEEDBACK_MS = 2200;

type ColourInspectorProps = {
  colour: RgbColour;
  alpha?: number;
  /** Left-side label in the full-width strip (e.g. "Image preview"). */
  title?: string;
  onUseAsBackground?: () => void;
  onUseAsMarker?: () => void;
  onAddToCycle?: () => void;
  className?: string;
};

/**
 * Low-profile full-width strip: title on the left, swatch + HEX + actions on the right.
 * Full HEX/RGB/HSL/HSV/CMYK editing lives in Colour values near the preview.
 */
export function ColourInspector({
  colour,
  alpha,
  title,
  onUseAsBackground,
  onUseAsMarker,
  onAddToCycle,
  className,
}: ColourInspectorProps) {
  const hex = formatHex(colour);
  const hasActions = onUseAsBackground || onUseAsMarker || onAddToCycle;
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function showFeedback(message: string) {
    setFeedback(message);
  }

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-surface/80 px-3 py-2 sm:gap-3",
        className,
      )}
    >
      {title ? (
        <p className="shrink-0 text-[0.9375rem] font-medium text-foreground sm:text-base">
          {title}
        </p>
      ) : null}
      <div className="min-w-[6rem] flex-1 px-2 text-center">
        {feedback ? (
          <p
            className="text-sm font-semibold"
            style={{ color: "#3b82f6" }}
            role="status"
            aria-live="polite"
          >
            {feedback}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div
          className="h-8 w-8 shrink-0 rounded-md border border-border"
          style={{ backgroundColor: rgbToCss(colour, alpha ?? 1) }}
          role="img"
          aria-label={`Colour swatch ${hex}`}
        />
        <p className="shrink-0 font-mono text-sm tracking-tight text-foreground">
          {hex}
        </p>
        {hasActions ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:ml-1">
            {onAddToCycle ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-8 px-2.5 py-1 text-xs font-medium shadow-none hover:translate-y-0"
                onClick={() => {
                  onAddToCycle();
                  showFeedback("Added to cycle");
                }}
              >
                Add to cycle
              </Button>
            ) : null}
            {onUseAsMarker ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-8 px-2.5 py-1 text-xs font-medium shadow-none hover:translate-y-0"
                onClick={() => {
                  onUseAsMarker();
                  showFeedback("Set as marker colour");
                }}
              >
                Use as marker
              </Button>
            ) : null}
            {onUseAsBackground ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-8 px-2.5 py-1 text-xs font-medium shadow-none hover:translate-y-0"
                onClick={() => {
                  onUseAsBackground();
                  showFeedback("Set as background");
                }}
              >
                Use as background
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
