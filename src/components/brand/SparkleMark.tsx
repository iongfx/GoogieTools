import { cn } from "@/lib/utils";

type SparkleMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  /**
   * Exact pixel size. When set, overrides the named `size` preset
   * (used for continuous strength sparkle scaling).
   */
  pixelSize?: number;
  /** Show the sharp-point variant (used during success animation peak). */
  sharp?: boolean;
};

const SIZE_MAP = {
  sm: { className: "h-3.5 w-3.5", pixels: 14 },
  md: { className: "h-5 w-5", pixels: 20 },
  lg: { className: "h-7 w-7", pixels: 28 },
} as const;

/** Rounded four-point Googie Sparkle (brand default), centered in 32×32. */
export const SPARKLE_PATH_ROUNDED =
  "M16 3c.9 7.5 3.5 10.5 11 11.5C19.5 15.5 16.9 18.5 16 26c-.9-7.5-3.5-10.5-11-11.5C12.5 13.5 15.1 10.5 16 3z";

/** Sharper points for the brief “pop” in the success animation. */
export const SPARKLE_PATH_SHARP =
  "M16 2l2.2 10.8L29 15l-10.8 2.2L16 28l-2.2-10.8L3 15l10.8-2.2L16 2z";

/**
 * Googie Sparkle mark — decorative brand accent.
 */
export function SparkleMark({
  className,
  size = "sm",
  pixelSize,
  sharp = false,
}: SparkleMarkProps) {
  const preset = SIZE_MAP[size];
  const pixels = pixelSize ?? preset.pixels;
  const sizeClass = pixelSize ? undefined : preset.className;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      width={pixels}
      height={pixels}
      className={cn(
        "shrink-0 text-sparkle",
        sizeClass,
        pixelSize != null && "transition-[width,height] duration-200 ease-out",
        className,
      )}
      fill="currentColor"
    >
      <path d={sharp ? SPARKLE_PATH_SHARP : SPARKLE_PATH_ROUNDED} />
    </svg>
  );
}
