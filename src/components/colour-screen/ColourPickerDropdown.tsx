"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  coloursNearlyEqual,
  hsvToRgb,
  rgbToCss,
  rgbToHex,
  rgbToHsv,
} from "@/lib/colour-conversions";
import { COLOUR_PRESETS } from "@/lib/colour-presets";
import type { RgbColour } from "@/lib/colour-types";
import { parseHexInput } from "@/lib/colour-validation";
import { cn } from "@/lib/utils";
import { EyedropperIcon } from "@/components/colour-screen/EyedropperIcon";

type ColourPickerDropdownProps = {
  colour: RgbColour;
  onChange: (colour: RgbColour) => void;
  id?: string;
  className?: string;
  /** Swatch shape. Marker colour uses a fixed circle to match the default marker. */
  triggerShape?: "rect" | "circle";
  /**
   * Where the panel opens relative to the swatch.
   * - auto: prefers above / right-aligned (background colour)
   * - above-left: opens up and left from the swatch’s top-left corner (cursor marker)
   */
  panelPlacement?: "auto" | "above-left";
  /** Fires when the dropdown opens or closes. */
  onOpenChange?: (open: boolean) => void;
};

declare global {
  interface Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }
}

/** Typical compact picker ~256×200 SV area → 30% larger, then 15% smaller. */
const PICKER_PANEL_CLASS = "w-[17.956rem]"; // 21.125rem * 0.85
const SV_AREA_CLASS = "h-[13.813rem]"; // 16.25rem * 0.85
const VIEWPORT_GAP_PX = 8;

/**
 * Custom colour picker: presets on top (labels on hover), then HSV gradient.
 * Replaces the native colour input so presets can live inside the dropdown.
 */
export function ColourPickerDropdown({
  colour,
  onChange,
  id,
  className,
  triggerShape = "rect",
  panelPlacement = "auto",
  onOpenChange,
}: ColourPickerDropdownProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const panelId = `${triggerId}-panel`;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    visibility: "hidden",
  });
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);
  const hsv = rgbToHsv(colour);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);
  const dragging = useRef<"sv" | "hue" | null>(null);

  useEffect(() => {
    setEyeDropperSupported(
      typeof window !== "undefined" && "EyeDropper" in window,
    );
  }, []);

  // Sync local HSV when colour changes from outside (HEX / RGB fields, etc.).
  useEffect(() => {
    if (dragging.current) return;
    const next = rgbToHsv(colour);
    setHue(next.h);
    setSat(next.s);
    setVal(next.v);
  }, [colour]);

  const updatePanelPosition = useCallback(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;

    const trigger = root.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const panelWidth = panel.offsetWidth;

    let top: number;
    let left: number;

    if (panelPlacement === "above-left") {
      // Panel’s bottom-right corner sits on the circle (north-west edge).
      const radius = Math.min(trigger.width, trigger.height) / 2;
      const touchX =
        trigger.left + trigger.width / 2 - radius * Math.SQRT1_2;
      const touchY =
        trigger.top + trigger.height / 2 - radius * Math.SQRT1_2;
      top = touchY - panelHeight;
      left = touchX - panelWidth;
    } else {
      const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_GAP_PX;
      const spaceAbove = trigger.top - VIEWPORT_GAP_PX;

      // Prefer opening over the preview (above) so the left Colour values stay clear.
      const openAbove =
        spaceAbove >= panelHeight ||
        (spaceAbove >= spaceBelow && spaceAbove >= panelHeight * 0.6);

      top = openAbove
        ? trigger.top - panelHeight - VIEWPORT_GAP_PX
        : trigger.bottom + VIEWPORT_GAP_PX;

      // Keep the panel over the right column when opened from the background swatch.
      // When opened from inside Colour values (marker colour), don't force that shift —
      // just keep the full panel on screen near the colour box.
      left = trigger.left;
      const valuesPanel = document.querySelector("[data-colour-values-panel]");
      const openedFromValuesPanel =
        Boolean(valuesPanel) && valuesPanel!.contains(root);

      if (!openedFromValuesPanel) {
        left = trigger.right - panelWidth;
        if (valuesPanel) {
          const valuesRight =
            valuesPanel.getBoundingClientRect().right + VIEWPORT_GAP_PX;
          left = Math.max(left, valuesRight);
        }
      }

      // Prefer opening below when the trigger is in the left column (more room).
      if (openedFromValuesPanel) {
        const openBelow =
          spaceBelow >= panelHeight || spaceBelow >= spaceAbove;
        top = openBelow
          ? trigger.bottom + VIEWPORT_GAP_PX
          : trigger.top - panelHeight - VIEWPORT_GAP_PX;
      }
    }

    // Keep the full panel on screen when possible.
    top = Math.min(
      Math.max(VIEWPORT_GAP_PX, top),
      window.innerHeight - panelHeight - VIEWPORT_GAP_PX,
    );
    left = Math.min(
      Math.max(VIEWPORT_GAP_PX, left),
      window.innerWidth - panelWidth - VIEWPORT_GAP_PX,
    );

    setPanelStyle({
      position: "fixed",
      top,
      left,
      visibility: "visible",
    });
  }, [panelPlacement]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle({ visibility: "hidden" });
      return;
    }
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        onOpenChange?.(false);
      }
    }

    // Mobile browsers treat drag as page scroll unless we block touchmove.
    function handleTouchMove(event: TouchEvent) {
      if (!dragging.current) return;
      event.preventDefault();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [open, onOpenChange]);

  // Keep the page from scrolling behind the open picker on phones.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overscrollBehavior = previous.bodyOverscroll;
    };
  }, [open]);

  const commitHsv = useCallback(
    (nextH: number, nextS: number, nextV: number) => {
      setHue(nextH);
      setSat(nextS);
      setVal(nextV);
      onChange(hsvToRgb({ h: nextH, s: nextS, v: nextV }));
    },
    [onChange],
  );

  function updateSvFromPointer(clientX: number, clientY: number) {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    commitHsv(hue, x * 100, (1 - y) * 100);
  }

  function handleSvPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragging.current = "sv";
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSvFromPointer(event.clientX, event.clientY);
  }

  function handleSvPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragging.current !== "sv") return;
    event.preventDefault();
    updateSvFromPointer(event.clientX, event.clientY);
  }

  function handleSvPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragging.current !== "sv") return;
    dragging.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released.
    }
  }

  function handleHueChange(raw: string) {
    const nextH = Number(raw);
    commitHsv(nextH, sat, val);
  }

  async function handleEyeDropper() {
    if (!window.EyeDropper) return;
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const parsed = parseHexInput(result.sRGBHex);
      if (parsed.ok) onChange(parsed.value);
    } catch {
      // User cancelled the eyedropper.
    }
  }

  const hueCss = `hsl(${hue}, 100%, 50%)`;
  const hex = rgbToHex(colour);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "shrink-0 border border-border shadow-soft-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerShape === "circle"
            ? "h-11 w-11 rounded-full"
            : "colour-swatch-input w-[9.1rem]",
        )}
        style={{ backgroundColor: rgbToCss(colour) }}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            onOpenChange?.(next);
            return next;
          });
        }}
        aria-label={`Colour picker, current colour ${hex}`}
      />

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Colour picker"
          className={cn(
            "z-[200] rounded-md border border-border bg-surface p-3 shadow-soft-md",
            PICKER_PANEL_CLASS,
          )}
          style={panelStyle}
        >
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!eyeDropperSupported}
              title={
                eyeDropperSupported
                  ? "Pick colour from screen"
                  : "Screen colour picker is not supported in this browser"
              }
              aria-label="Pick colour from screen"
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                eyeDropperSupported
                  ? "hover:bg-accent-soft/70 hover:text-accent"
                  : "cursor-not-allowed opacity-45",
              )}
              onClick={() => void handleEyeDropper()}
            >
              <EyedropperIcon />
            </button>
            {COLOUR_PRESETS.map((preset) => {
              const selected = coloursNearlyEqual(colour, preset.rgb);
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={selected}
                  className={cn(
                    "group relative h-[1.625rem] w-[1.625rem] rounded-full border border-border",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "ring-2 ring-accent ring-offset-1",
                  )}
                  style={{ backgroundColor: rgbToCss(preset.rgb) }}
                  onClick={() => onChange(preset.rgb)}
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2",
                      "whitespace-nowrap rounded-md border border-border bg-surface px-1.5 py-0.5",
                      "text-xs font-semibold text-foreground shadow-soft-sm",
                      "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                    )}
                  >
                    {preset.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            ref={svRef}
            className={cn(
              "relative w-full cursor-crosshair touch-none select-none rounded-md border border-border",
              SV_AREA_CLASS,
            )}
            style={{
              backgroundImage: `
                linear-gradient(to top, #000, transparent),
                linear-gradient(to right, #fff, ${hueCss})
              `,
            }}
            onPointerDown={handleSvPointerDown}
            onPointerMove={handleSvPointerMove}
            onPointerUp={handleSvPointerUp}
            onPointerCancel={handleSvPointerUp}
            role="presentation"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-soft-sm"
              style={{
                left: `${sat}%`,
                top: `${100 - val}%`,
                backgroundColor: rgbToCss(colour),
                boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
              }}
            />
          </div>

          <label className="mt-3 flex w-full touch-none items-center">
            <span className="sr-only">Hue</span>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={Math.round(hue)}
              onChange={(event) => handleHueChange(event.target.value)}
              onPointerDown={(event) => {
                event.stopPropagation();
                dragging.current = "hue";
              }}
              onPointerUp={() => {
                dragging.current = null;
              }}
              onPointerCancel={() => {
                dragging.current = null;
              }}
              className="h-3 w-full cursor-pointer touch-none appearance-none rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
              }}
              aria-label="Hue"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
