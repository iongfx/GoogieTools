"use client";

import { useEffect, useId, useState } from "react";
import { ColourPickerDropdown } from "@/components/colour-screen/ColourPickerDropdown";
import { CopyValueButton } from "@/components/colour-screen/CopyValueButton";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from "@/lib/colour-conversions";
import {
  formatChannelsForCopy,
  formatCmykChannels,
  formatHslChannels,
  formatHsvChannels,
  formatRgbChannels,
} from "@/lib/colour-formatting";
import { CMYK_HELPER_COPY } from "@/lib/colour-screen-config";
import type { RgbColour } from "@/lib/colour-types";
import {
  parseCmykChannels,
  parseHexInput,
  parseHslChannels,
  parseHsvChannels,
  parseNumberDraft,
  parseRgbChannels,
} from "@/lib/colour-validation";
import { cn } from "@/lib/utils";

type ColourFormatControlsProps = {
  colour: RgbColour;
  onChange: (colour: RgbColour) => void;
  className?: string;
};

type ChannelDrafts = Record<string, string>;

function ChannelRow({
  label,
  copyValue,
  copyAriaLabel,
  children,
}: {
  label: string;
  copyValue: string;
  copyAriaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-2">
      <p className="text-[0.9375rem] font-medium leading-tight text-foreground sm:text-base">
        {label}
      </p>
      {/* Always 4 columns so RGB/HSL/HSV line up with CMYK C/M/Y */}
      <div className="grid min-w-0 grid-cols-4 gap-x-2">{children}</div>
      <CopyValueButton value={copyValue} ariaLabel={copyAriaLabel} />
    </div>
  );
}

function MiniField({
  id,
  label,
  value,
  min,
  max,
  onChange,
  borderColour,
}: {
  id: string;
  label: string;
  value: string;
  min?: number;
  max?: number;
  onChange: (next: string) => void;
  /** Optional channel-representative border colour (already includes opacity). */
  borderColour?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Label
        htmlFor={id}
        className="mb-0 w-3.5 shrink-0 text-center text-[0.9375rem] font-medium text-muted sm:text-base"
      >
        {label}
      </Label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-[3.25rem] shrink-0 rounded-lg border border-border bg-surface",
          "px-1 text-center font-mono text-[0.9375rem] text-foreground shadow-soft-sm sm:text-base",
          "transition-[border-color,box-shadow] duration-200",
          "hover:border-accent/40",
          "focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/25",
          borderColour && "border-2",
        )}
        style={borderColour ? { borderColor: borderColour } : undefined}
        aria-label={label}
      />
    </div>
  );
}

/**
 * Colour picker dropdown + HEX field, kept in sync with a canonical RGB colour.
 */
export function ColourPickerAndHex({
  colour,
  onChange,
  className,
}: {
  colour: RgbColour;
  onChange: (colour: RgbColour) => void;
  className?: string;
}) {
  const baseId = useId();
  const hex = rgbToHex(colour);
  const [hexDraft, setHexDraft] = useState(hex);
  const [hexFocused, setHexFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayHex = hexFocused ? hexDraft : hex;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid items-center gap-x-4 gap-y-2 [grid-template-columns:7.75rem_9.1rem_auto]">
        <Label htmlFor={`${baseId}-picker`} className="mb-0 shrink-0">
          Colour picker
        </Label>
        <ColourPickerDropdown
          id={`${baseId}-picker`}
          colour={colour}
          onChange={(next) => {
            setError(null);
            onChange(next);
          }}
        />
        <div className="flex min-w-0 items-center gap-1.5">
          <Label htmlFor={`${baseId}-hex`} className="mb-0 w-8 shrink-0">
            HEX
          </Label>
          <Input
            id={`${baseId}-hex`}
            value={displayHex}
            spellCheck={false}
            autoComplete="off"
            className="w-[9.5rem] font-mono"
            onFocus={() => {
              setHexFocused(true);
              setHexDraft(hex);
            }}
            onBlur={() => {
              setHexFocused(false);
              const parsed = parseHexInput(hexDraft);
              if (parsed.ok) {
                setError(null);
                onChange(parsed.value);
              } else {
                setError(parsed.message);
                setHexDraft(hex);
              }
            }}
            onChange={(event) => {
              const next = event.target.value;
              setHexDraft(next);
              const parsed = parseHexInput(next);
              if (parsed.ok) {
                setError(null);
                onChange(parsed.value);
              }
            }}
          />
          <CopyValueButton value={hex} ariaLabel="Copy HEX value" />
        </div>
      </div>
      {error ? <FriendlyError message={error} /> : null}
    </div>
  );
}

/**
 * Marker colour row: “Cursor Marker” label, circular picker, then RGB values.
 */
export function MarkerColourPicker({
  colour,
  onChange,
  className,
}: {
  colour: RgbColour;
  onChange: (colour: RgbColour) => void;
  className?: string;
}) {
  const baseId = useId();
  const rgb = formatRgbChannels(colour);
  const rgbText = formatChannelsForCopy(rgb.r, rgb.g, rgb.b);
  const [rgbDraft, setRgbDraft] = useState(rgbText);
  const [rgbFocused, setRgbFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayRgb = rgbFocused ? rgbDraft : rgbText;

  useEffect(() => {
    if (!rgbFocused) setRgbDraft(rgbText);
  }, [rgbText, rgbFocused]);

  function commitRgbDraft(raw: string) {
    const parts = raw.split(",").map((part) => part.trim());
    if (parts.length !== 3) {
      setError("Enter three RGB numbers separated by commas, for example 255, 0, 0.");
      setRgbDraft(rgbText);
      return;
    }
    const numbers = parts.map((part) => Number(part));
    if (numbers.some((n) => !Number.isFinite(n))) {
      setError("RGB channels must be numbers from 0 to 255.");
      setRgbDraft(rgbText);
      return;
    }
    const parsed = parseRgbChannels({
      r: numbers[0],
      g: numbers[1],
      b: numbers[2],
    });
    if (!parsed.ok) {
      setError(parsed.message);
      setRgbDraft(rgbText);
      return;
    }
    setError(null);
    onChange(parsed.value);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid items-center gap-x-4 gap-y-2 [grid-template-columns:7.75rem_9.1rem_auto]">
        <Label htmlFor={`${baseId}-picker`} className="mb-0 shrink-0">
          Cursor Marker
        </Label>
        <ColourPickerDropdown
          id={`${baseId}-picker`}
          colour={colour}
          triggerShape="circle"
          panelPlacement="above-left"
          onChange={(next) => {
            setError(null);
            onChange(next);
          }}
        />
        <div className="flex min-w-0 items-center gap-1.5">
          <Label htmlFor={`${baseId}-rgb`} className="mb-0 w-8 shrink-0">
            RGB
          </Label>
          <Input
            id={`${baseId}-rgb`}
            value={displayRgb}
            spellCheck={false}
            autoComplete="off"
            className="w-[9.5rem] font-mono tabular-nums"
            aria-label="Marker RGB values"
            onFocus={() => {
              setRgbFocused(true);
              setRgbDraft(rgbText);
            }}
            onBlur={() => {
              setRgbFocused(false);
              commitRgbDraft(rgbDraft);
            }}
            onChange={(event) => {
              const next = event.target.value;
              setRgbDraft(next);
              const parts = next.split(",").map((part) => part.trim());
              if (parts.length !== 3) return;
              const numbers = parts.map((part) => Number(part));
              if (numbers.some((n) => !Number.isFinite(n))) return;
              const parsed = parseRgbChannels({
                r: numbers[0],
                g: numbers[1],
                b: numbers[2],
              });
              if (parsed.ok) {
                setError(null);
                onChange(parsed.value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
          <CopyValueButton value={rgbText} ariaLabel="Copy marker RGB values" />
        </div>
      </div>
      {error ? <FriendlyError message={error} /> : null}
    </div>
  );
}

/**
 * Synchronised RGB / HSL / HSV / CMYK controls around a canonical RGB.
 */
export function ColourFormatControls({
  colour,
  onChange,
  className,
}: ColourFormatControlsProps) {
  const baseId = useId();
  const rgb = formatRgbChannels(colour);
  const hsl = formatHslChannels(rgbToHsl(colour));
  const hsv = formatHsvChannels(rgbToHsv(colour));
  const cmyk = formatCmykChannels(rgbToCmyk(colour));
  const hex = rgbToHex(colour);

  const [drafts, setDrafts] = useState<ChannelDrafts>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts({});
  }, [hex]);

  function commitRgb(next: RgbColour) {
    setError(null);
    setDrafts({});
    onChange(next);
  }

  function updateDraft(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  }

  function draftOr(key: string, fallback: number): string {
    return drafts[key] ?? String(fallback);
  }

  function applyParsedNumber(
    key: string,
    raw: string,
    apply: (n: number) => void,
  ) {
    updateDraft(key, raw);
    const parsed = parseNumberDraft(raw);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (parsed.value === null) return;
    setError(null);
    apply(parsed.value);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <ChannelRow
        label="RGB"
        copyValue={formatChannelsForCopy(rgb.r, rgb.g, rgb.b)}
        copyAriaLabel="Copy RGB values"
      >
        <MiniField
          id={`${baseId}-r`}
          label="R"
          min={0}
          max={255}
          value={draftOr("r", rgb.r)}
          borderColour="rgba(255, 0, 0, 0.5)"
          onChange={(raw) =>
            applyParsedNumber("r", raw, (r) => {
              const parsed = parseRgbChannels({ r, g: rgb.g, b: rgb.b });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
        <MiniField
          id={`${baseId}-g`}
          label="G"
          min={0}
          max={255}
          value={draftOr("g", rgb.g)}
          borderColour="rgba(0, 255, 0, 0.5)"
          onChange={(raw) =>
            applyParsedNumber("g", raw, (g) => {
              const parsed = parseRgbChannels({ r: rgb.r, g, b: rgb.b });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
        <MiniField
          id={`${baseId}-b`}
          label="B"
          min={0}
          max={255}
          value={draftOr("b", rgb.b)}
          borderColour="rgba(0, 0, 255, 0.5)"
          onChange={(raw) =>
            applyParsedNumber("b", raw, (b) => {
              const parsed = parseRgbChannels({ r: rgb.r, g: rgb.g, b });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
      </ChannelRow>

      <ChannelRow
        label="HSL"
        copyValue={formatChannelsForCopy(hsl.h, hsl.s, hsl.l)}
        copyAriaLabel="Copy HSL values"
      >
        <MiniField
          id={`${baseId}-hh`}
          label="H"
          value={draftOr("hh", hsl.h)}
          onChange={(raw) =>
            applyParsedNumber("hh", raw, (h) => {
              const parsed = parseHslChannels({ h, s: hsl.s, l: hsl.l });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
        <MiniField
          id={`${baseId}-hs`}
          label="S"
          value={draftOr("hs", hsl.s)}
          onChange={(raw) =>
            applyParsedNumber("hs", raw, (s) => {
              const parsed = parseHslChannels({ h: hsl.h, s, l: hsl.l });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
        <MiniField
          id={`${baseId}-hl`}
          label="L"
          value={draftOr("hl", hsl.l)}
          onChange={(raw) =>
            applyParsedNumber("hl", raw, (l) => {
              const parsed = parseHslChannels({ h: hsl.h, s: hsl.s, l });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
      </ChannelRow>

      <ChannelRow
        label="HSV / HSB"
        copyValue={formatChannelsForCopy(hsv.h, hsv.s, hsv.v)}
        copyAriaLabel="Copy HSV values"
      >
        <MiniField
          id={`${baseId}-vh`}
          label="H"
          value={draftOr("vh", hsv.h)}
          onChange={(raw) =>
            applyParsedNumber("vh", raw, (h) => {
              const parsed = parseHsvChannels({ h, s: hsv.s, v: hsv.v });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
        <MiniField
          id={`${baseId}-vs`}
          label="S"
          value={draftOr("vs", hsv.s)}
          onChange={(raw) =>
            applyParsedNumber("vs", raw, (s) => {
              const parsed = parseHsvChannels({ h: hsv.h, s, v: hsv.v });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
        <MiniField
          id={`${baseId}-vv`}
          label="V"
          value={draftOr("vv", hsv.v)}
          onChange={(raw) =>
            applyParsedNumber("vv", raw, (v) => {
              const parsed = parseHsvChannels({ h: hsv.h, s: hsv.s, v });
              if (parsed.ok) commitRgb(parsed.value);
            })
          }
        />
      </ChannelRow>

      <div>
        <ChannelRow
          label="CMYK"
          copyValue={formatChannelsForCopy(cmyk.c, cmyk.m, cmyk.y, cmyk.k)}
          copyAriaLabel="Copy CMYK values"
        >
          <MiniField
            id={`${baseId}-c`}
            label="C"
            value={draftOr("c", cmyk.c)}
            borderColour="rgba(0, 255, 255, 0.5)"
            onChange={(raw) =>
              applyParsedNumber("c", raw, (c) => {
                const parsed = parseCmykChannels({
                  c,
                  m: cmyk.m,
                  y: cmyk.y,
                  k: cmyk.k,
                });
                if (parsed.ok) commitRgb(parsed.value);
              })
            }
          />
          <MiniField
            id={`${baseId}-m`}
            label="M"
            value={draftOr("m", cmyk.m)}
            borderColour="rgba(255, 0, 255, 0.5)"
            onChange={(raw) =>
              applyParsedNumber("m", raw, (m) => {
                const parsed = parseCmykChannels({
                  c: cmyk.c,
                  m,
                  y: cmyk.y,
                  k: cmyk.k,
                });
                if (parsed.ok) commitRgb(parsed.value);
              })
            }
          />
          <MiniField
            id={`${baseId}-y`}
            label="Y"
            value={draftOr("y", cmyk.y)}
            borderColour="rgba(255, 255, 0, 0.5)"
            onChange={(raw) =>
              applyParsedNumber("y", raw, (y) => {
                const parsed = parseCmykChannels({
                  c: cmyk.c,
                  m: cmyk.m,
                  y,
                  k: cmyk.k,
                });
                if (parsed.ok) commitRgb(parsed.value);
              })
            }
          />
          <MiniField
            id={`${baseId}-k`}
            label="K"
            value={draftOr("k", cmyk.k)}
            borderColour="rgba(0, 0, 0, 0.5)"
            onChange={(raw) =>
              applyParsedNumber("k", raw, (k) => {
                const parsed = parseCmykChannels({
                  c: cmyk.c,
                  m: cmyk.m,
                  y: cmyk.y,
                  k,
                });
                if (parsed.ok) commitRgb(parsed.value);
              })
            }
          />
        </ChannelRow>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
          {CMYK_HELPER_COPY}
        </p>
      </div>

      {error ? <FriendlyError message={error} /> : null}
    </div>
  );
}
