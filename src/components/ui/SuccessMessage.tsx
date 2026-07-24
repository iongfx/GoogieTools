import { GoogieSuccessMark } from "@/components/brand/GoogieSuccessMark";
import { cn } from "@/lib/utils";

type SuccessMessageProps = {
  title: string;
  description?: string;
  className?: string;
  /** Soft entrance animation (respects prefers-reduced-motion). */
  animate?: boolean;
  /** Show the compact Googie success mark beside the title. */
  showMark?: boolean;
};

/**
 * Friendly success feedback for tool results.
 * Announces politely once when mounted or when title/description change.
 */
export function SuccessMessage({
  title,
  description,
  className,
  animate = true,
  showMark = true,
}: SuccessMessageProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "flex flex-col items-center text-center",
        animate && "motion-fade-up",
        className,
      )}
    >
      <div className="inline-flex items-center justify-center gap-2">
        {showMark ? <GoogieSuccessMark /> : null}
        <p className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </p>
      </div>
      {description ? (
        <p className="mt-1.5 max-w-xs text-[0.9375rem] leading-relaxed text-muted sm:max-w-sm">
          {description}
        </p>
      ) : null}
    </div>
  );
}
