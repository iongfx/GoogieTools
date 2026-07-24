import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Friendly empty / waiting state for tool results.
 */
export function EmptyState({
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn("max-w-[18rem] text-center sm:max-w-[20rem]", className)}>
      {children ? <div className="mb-4 sm:mb-5">{children}</div> : null}
      <p className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {title}
      </p>
      {description ? (
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
