"use client";

import { useEffect, useRef, useState } from "react";
import { CopyValueButton } from "@/components/colour-screen/CopyValueButton";
import { Button } from "@/components/ui/Button";
import {
  rgbToCmyk,
  rgbToCss,
  rgbToHsl,
  rgbToHsv,
} from "@/lib/colour-conversions";
import {
  formatAllColourValues,
  formatAlpha,
  formatChannelsForCopy,
  formatCmykChannels,
  formatHex,
  formatHslChannels,
  formatHsvChannels,
  formatRgbChannels,
} from "@/lib/colour-formatting";
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

type CopyField = {
  id: string;
  label: string;
  ariaLabel: string;
  /** Text shown in the value box. */
  display: string;
  /** Clipboard payload (comma-separated channels for multi-value formats). */
  copyValue: string;
};

async function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Selected-colour inspector with per-format copy actions.
 */
export function ColourInspector({
  colour,
  alpha,
  sourceLabel,
  coordinates,
  onUseAsBackground,
  onUseAsMarker,
  onAddToCycle,
  className,
}: ColourInspectorProps) {
  const rgb = formatRgbChannels(colour);
  const hsl = formatHslChannels(rgbToHsl(colour));
  const hsv = formatHsvChannels(rgbToHsv(colour));
  const cmyk = formatCmykChannels(rgbToCmyk(colour));
  const hex = formatHex(colour);

  const [copiedAll, setCopiedAll] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const fields: CopyField[] = [
    {
      id: "hex",
      label: "HEX",
      ariaLabel: "Copy HEX value",
      display: hex,
      copyValue: hex,
    },
    {
      id: "rgb",
      label: "RGB",
      ariaLabel: "Copy RGB values",
      display: formatChannelsForCopy(rgb.r, rgb.g, rgb.b),
      copyValue: formatChannelsForCopy(rgb.r, rgb.g, rgb.b),
    },
    {
      id: "hsl",
      label: "HSL",
      ariaLabel: "Copy HSL values",
      display: formatChannelsForCopy(hsl.h, hsl.s, hsl.l),
      copyValue: formatChannelsForCopy(hsl.h, hsl.s, hsl.l),
    },
    {
      id: "hsv",
      label: "HSV",
      ariaLabel: "Copy HSV values",
      display: formatChannelsForCopy(hsv.h, hsv.s, hsv.v),
      copyValue: formatChannelsForCopy(hsv.h, hsv.s, hsv.v),
    },
    {
      id: "cmyk",
      label: "CMYK",
      ariaLabel: "Copy CMYK values",
      display: formatChannelsForCopy(cmyk.c, cmyk.m, cmyk.y, cmyk.k),
      copyValue: formatChannelsForCopy(cmyk.c, cmyk.m, cmyk.y, cmyk.k),
    },
  ];

  if (alpha !== undefined && alpha < 1 - Number.EPSILON) {
    const alphaText = formatAlpha(alpha);
    fields.push({
      id: "alpha",
      label: "Alpha",
      ariaLabel: "Copy alpha value",
      display: alphaText,
      copyValue: alphaText,
    });
  }

  async function handleCopyAll() {
    const ok = await copyText(formatAllColourValues(colour, { alpha }));
    if (!ok) return;
    setCopiedAll(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopiedAll(false), 1600);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="mx-auto h-24 w-24 shrink-0 rounded-2xl border border-border shadow-soft-sm sm:mx-0 sm:h-28 sm:w-28"
          style={{ backgroundColor: rgbToCss(colour, alpha ?? 1) }}
          role="img"
          aria-label={`Colour swatch ${hex}`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold tracking-tight text-foreground">
            Selected colour
          </p>
          {sourceLabel ? (
            <p className="mt-1 text-[0.9375rem] text-muted sm:text-base">
              Source: {sourceLabel}
            </p>
          ) : null}
          {coordinates ? (
            <p className="mt-1 text-[0.9375rem] text-muted sm:text-base">
              Pixel: {coordinates.x}, {coordinates.y}
            </p>
          ) : null}

          <ul className="mt-3 grid list-none gap-2 p-0">
            {fields.map((field) => (
              <li
                key={field.id}
                className="flex min-w-0 flex-wrap items-center gap-2"
              >
                <span
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center rounded-md border border-border bg-surface",
                    "px-3 text-[0.9375rem] font-semibold text-foreground sm:text-base",
                  )}
                >
                  {field.label}
                </span>
                <div
                  className={cn(
                    "inline-flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-md border border-border bg-surface",
                    "pl-3 pr-1",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[0.9375rem] text-foreground sm:text-base">
                    {field.display}
                  </span>
                  <CopyValueButton
                    value={field.copyValue}
                    ariaLabel={field.ariaLabel}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Copy all values"
              onClick={() => void handleCopyAll()}
            >
              {copiedAll ? "Copied all" : "Copy all values"}
            </Button>
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
            {onAddToCycle ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onAddToCycle}
              >
                Add to colour cycle
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
