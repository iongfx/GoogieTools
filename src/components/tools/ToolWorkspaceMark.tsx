import { ToolIcon } from "@/components/tools/ToolIcon";
import type { ToolIconName } from "@/config/tools";
import { cn } from "@/lib/utils";

type ToolWorkspaceMarkProps = {
  icon: ToolIconName;
  className?: string;
};

/**
 * Brand tool icon — shown in ToolPageHeader, aligned with the description.
 * Matches the homepage / Related Tools card mark.
 */
export function ToolWorkspaceMark({ icon, className }: ToolWorkspaceMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none inline-flex h-[3.15rem] w-[3.15rem] items-center justify-center rounded-2xl border border-accent/15 bg-accent-tint text-accent",
        className,
      )}
    >
      <ToolIcon icon={icon} size={26} />
    </span>
  );
}
