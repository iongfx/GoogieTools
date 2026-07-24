import { ToolCard } from "@/components/tools/ToolCard";
import type { ToolDefinition } from "@/config/tools";
import { cn } from "@/lib/utils";

type ToolCardGridProps = {
  tools: readonly ToolDefinition[];
  className?: string;
  /** Forwarded to each card (homepage Coming soon uses compact). */
  cardSize?: "default" | "compact";
};

/**
 * Shared tool-card grid for homepage, Related tools, and future directories.
 * Always renders `ToolCard` so cards stay visually consistent sitewide.
 */
export function ToolCardGrid({
  tools,
  className,
  cardSize = "default",
}: ToolCardGridProps) {
  return (
    <ul
      className={cn(
        "grid list-none gap-5 p-0 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3",
        cardSize === "compact" && "gap-4 sm:gap-5",
        className,
      )}
    >
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} size={cardSize} />
        </li>
      ))}
    </ul>
  );
}
