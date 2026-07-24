import Link from "next/link";
import { ToolIcon } from "@/components/tools/ToolIcon";
import type { ToolDefinition } from "@/config/tools";
import { cn } from "@/lib/utils";

type ToolCardProps = {
  tool: ToolDefinition;
  /** Compact cards are ~25% smaller (homepage Coming soon row). */
  size?: "default" | "compact";
};

/**
 * Canonical tool card for the whole site (homepage, Related tools, directories).
 * Available tools show “Open tool →”; coming-soon tools show the badge only.
 */
export function ToolCard({ tool, size = "default" }: ToolCardProps) {
  const available = tool.status === "available";
  const compact = size === "compact";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-2xl border",
            compact ? "h-9 w-9 rounded-xl" : "h-[3.15rem] w-[3.15rem]",
            available
              ? "border-accent/15 bg-accent-tint text-accent"
              : "border-accent/20 bg-accent-tint text-accent/85",
          )}
        >
          <ToolIcon icon={tool.icon} size={compact ? 24 : 32} />
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold",
            compact ? "text-[0.6875rem]" : "text-xs sm:text-[0.8125rem]",
            available
              ? "bg-success/10 text-success"
              : "bg-background text-muted",
          )}
        >
          {available ? "Available" : "Coming soon"}
        </span>
      </div>
      <h3
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          compact
            ? "mt-3.5 text-base sm:text-lg"
            : "mt-5 text-xl sm:text-[1.375rem]",
        )}
      >
        {tool.name}
      </h3>
      <p
        className={cn(
          "leading-relaxed text-muted",
          compact
            ? "mt-2 text-sm sm:text-[0.9375rem]"
            : "mt-2.5 text-[0.9375rem] sm:text-base",
        )}
      >
        {tool.shortDescription}
      </p>
      {available ? (
        <p
          className={cn(
            "font-semibold text-accent",
            compact
              ? "mt-3.5 text-sm sm:text-[0.9375rem]"
              : "mt-5 text-[0.9375rem] sm:text-base",
          )}
        >
          Open tool →
        </p>
      ) : null}
    </>
  );

  const shellClass = cn(
    "block h-full rounded-2xl border border-border bg-surface shadow-soft-sm",
    compact ? "rounded-xl p-4 sm:p-5" : "p-5 sm:p-8",
    available &&
      "transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-soft-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  );

  if (available) {
    return (
      <Link
        href={tool.href}
        className={shellClass}
        aria-label={`Open ${tool.name}`}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={shellClass} aria-label={`${tool.name}, coming soon`}>
      {body}
    </div>
  );
}
