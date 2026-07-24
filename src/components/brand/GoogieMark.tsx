import { SparkleMark } from "@/components/brand/SparkleMark";
import { cn } from "@/lib/utils";

type GoogieMarkProps = {
  className?: string;
  size?: "sm" | "md";
};

/**
 * Googie mascot mark: smiling face flanked by two yellow sparkles.
 */
export function GoogieMark({ className, size = "sm" }: GoogieMarkProps) {
  const faceSize = size === "md" ? "h-8 w-8" : "h-7 w-7";
  const sparkleSize = size === "md" ? "md" : "sm";

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      <SparkleMark size={sparkleSize} className="-translate-y-0.5" />
      <svg
        viewBox="0 0 40 40"
        className={cn(faceSize, "text-accent")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        <circle cx="20" cy="20" r="15.5" />
        <path d="M13.5 17.5c1.2-1.5 3-1.5 4.2 0" />
        <path d="M22.3 17.5c1.2-1.5 3-1.5 4.2 0" />
        <path d="M13.8 24.2c2.2 2.6 5.5 3.4 8.5 2.8 1.7-.35 3.3-1.2 4.5-2.5" />
      </svg>
      <SparkleMark size={sparkleSize} className="translate-y-0.5" />
    </span>
  );
}
