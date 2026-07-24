"use client";

import {
  SPARKLE_PATH_ROUNDED,
  SPARKLE_PATH_SHARP,
} from "@/components/brand/SparkleMark";
import { cn } from "@/lib/utils";

type SparkleBurstProps = {
  /** Bump this value to replay the animation (e.g. generation id). */
  playKey: string | number;
  className?: string;
  /** Delay before the burst starts, in milliseconds. */
  delayMs?: number;
  size?: "sm" | "md";
};

/**
 * One-shot success sparkle: rotate, enlarge, sharpen briefly, then shrink/fade.
 * Respects prefers-reduced-motion via CSS.
 */
export function SparkleBurst({
  playKey,
  className,
  delayMs = 0,
  size = "md",
}: SparkleBurstProps) {
  // ~30% larger than the previous h-5/h-7 sizes for a clearer “shine”
  const iconClass =
    size === "sm" ? "h-[1.625rem] w-[1.625rem]" : "h-[2.275rem] w-[2.275rem]";
  const delayStyle = { animationDelay: `${delayMs}ms` };

  return (
    <span
      key={`${playKey}-${delayMs}`}
      aria-hidden="true"
      style={delayStyle}
      className={cn("sparkle-burst pointer-events-none inline-flex", className)}
    >
      <svg
        viewBox="0 0 32 32"
        className={cn(iconClass, "text-sparkle")}
        fill="currentColor"
      >
        <path
          className="sparkle-burst__rounded"
          d={SPARKLE_PATH_ROUNDED}
          style={delayStyle}
        />
        <path
          className="sparkle-burst__sharp"
          d={SPARKLE_PATH_SHARP}
          style={delayStyle}
        />
      </svg>
    </span>
  );
}
