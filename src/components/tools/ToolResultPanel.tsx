import { cn } from "@/lib/utils";

type ToolResultPanelProps = {
  children: React.ReactNode;
  label?: string;
  className?: string;
  /** Extra classes for the dashed content box (e.g. shorter min-height). */
  contentClassName?: string;
  animate?: boolean;
  style?: React.CSSProperties;
};

/**
 * Shared result / preview panel for tool pages.
 */
export function ToolResultPanel({
  children,
  label,
  className,
  contentClassName,
  animate = false,
  style,
}: ToolResultPanelProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label ? (
        <p className="mb-3 text-[0.9375rem] font-medium text-foreground sm:text-base">
          {label}
        </p>
      ) : null}
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 sm:p-8",
          "min-h-[220px] sm:min-h-[280px] lg:min-h-[360px]",
          animate && "motion-fade-up",
          contentClassName,
        )}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
