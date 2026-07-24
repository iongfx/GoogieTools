import { SparkleMark } from "@/components/brand/SparkleMark";
import { cn } from "@/lib/utils";

type GoogieSuccessMarkProps = {
  className?: string;
};

/**
 * Compact decorative success accent: tiny face between two sparkles.
 * Keep beside success copy — much smaller than the empty-state illustration.
 */
export function GoogieSuccessMark({ className }: GoogieSuccessMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center gap-0.5", className)}
    >
      <SparkleMark size="sm" className="h-3 w-3" />
      <svg
        viewBox="0 0 40 40"
        className="h-5 w-5 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      >
        <circle cx="20" cy="20" r="15.5" />
        <path d="M13.5 17.5c1.2-1.5 3-1.5 4.2 0" />
        <path d="M22.3 17.5c1.2-1.5 3-1.5 4.2 0" />
        <path d="M13.8 24.2c2.2 2.6 5.5 3.4 8.5 2.8 1.7-.35 3.3-1.2 4.5-2.5" />
      </svg>
      <SparkleMark size="sm" className="h-3 w-3" />
    </span>
  );
}
