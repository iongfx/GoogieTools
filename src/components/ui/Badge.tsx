import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "accent" | "neutral";
};

/**
 * Small label for status or section cues (e.g. “Coming soon”).
 */
export function Badge({
  children,
  className,
  tone = "accent",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "neutral" && "bg-border/60 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
