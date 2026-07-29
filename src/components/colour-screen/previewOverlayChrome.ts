import { cn } from "@/lib/utils";

/**
 * Shared chrome for labels/buttons drawn on top of colour & image previews.
 * Resting look matches the “Colour cycle delay” banner; buttons animate on hover.
 */
export const PREVIEW_OVERLAY_LABEL_CLASS =
  "rounded-md bg-black/45 px-3 py-1.5 text-center text-sm font-medium text-white shadow-soft-sm";

export const PREVIEW_OVERLAY_BUTTON_CLASS = cn(
  PREVIEW_OVERLAY_LABEL_CLASS,
  "inline-flex min-h-0 items-center justify-center border-0",
  "transition-[transform,background-color,box-shadow] duration-200 ease-out",
  "hover:scale-105 hover:bg-black/60 hover:shadow-soft-md",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  "disabled:pointer-events-none disabled:opacity-40",
);
