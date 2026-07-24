import { GoogieMark } from "@/components/brand/GoogieMark";
import { cn } from "@/lib/utils";

type GoogieFreeBadgeProps = {
  className?: string;
};

/**
 * Friendly “100% Free” lockup with the Googie face + sparkles mark.
 */
export function GoogieFreeBadge({ className }: GoogieFreeBadgeProps) {
  return (
    <p
      className={cn(
        "mt-4 inline-flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-foreground sm:text-base",
        className,
      )}
    >
      <span>100% Free</span>
      <GoogieMark size="sm" />
      <span className="sr-only">Googie Tools</span>
    </p>
  );
}
