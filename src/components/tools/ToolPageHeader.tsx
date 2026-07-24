import { ToolWorkspaceMark } from "@/components/tools/ToolWorkspaceMark";
import { SparkleMark } from "@/components/brand/SparkleMark";
import { Container } from "@/components/layout/Container";
import type { ToolIconName } from "@/config/tools";
import { cn } from "@/lib/utils";

type ToolPageHeaderProps = {
  title: string;
  description: string;
  headingId?: string;
  /** Tool brand mark — bottom-aligned with the short description. */
  icon?: ToolIconName;
  /** Optional content appended on the same line as the short description. */
  descriptionEnd?: React.ReactNode;
  className?: string;
};

/**
 * Tool-page title with optional brand mark on the right.
 * The mark’s bottom edge lines up with the description under the title.
 */
export function ToolPageHeader({
  title,
  description,
  headingId = "tool-heading",
  icon,
  descriptionEnd,
  className,
}: ToolPageHeaderProps) {
  return (
    <Container
      as="header"
      className={cn(
        "pb-0 pt-[var(--page-title-pt)] sm:pt-[var(--page-title-pt-sm)]",
        className,
      )}
    >
      <div className="flex items-end justify-between gap-4 sm:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <SparkleMark size="lg" className="mt-[0.55em] shrink-0" />
          <div className="min-w-0 max-w-2xl">
            <h1
              id={headingId}
              className="scroll-mt-[var(--site-header-height)] font-display text-[clamp(1.875rem,5.5vw,3.375rem)] font-semibold leading-[1.15] tracking-tight text-foreground sm:scroll-mt-[var(--site-header-height-sm)]"
            >
              {title}
            </h1>
            <p className="mt-2 text-base leading-relaxed text-muted sm:mt-2.5 sm:text-lg">
              {description}
              {descriptionEnd}
            </p>
          </div>
        </div>
        {icon ? (
          <ToolWorkspaceMark icon={icon} className="mb-0.5 shrink-0" />
        ) : null}
      </div>
    </Container>
  );
}
