import { cn } from "@/lib/utils";

type GoogieEmptyStateIconProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS = {
  sm: "h-14 w-auto",
  md: "h-16 w-auto sm:h-[4.5rem]",
  lg: "h-[4.5rem] w-auto sm:h-20",
} as const;

/**
 * Official Googie mark (face + sparkles) from the brand logo asset.
 * Decorative — keep aria-hidden when used beside visible text.
 */
export function GoogieEmptyStateIcon({
  className,
  size = "md",
}: GoogieEmptyStateIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand asset; keep exact pixels
    <img
      src="/brand/googie-mark.png"
      alt=""
      aria-hidden="true"
      width={90}
      height={55}
      className={cn(
        "mx-auto block shrink-0 object-contain",
        SIZE_CLASS[size],
        className,
      )}
      draggable={false}
    />
  );
}
