import { SparkleMark } from "@/components/brand/SparkleMark";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  headingId?: string;
  className?: string;
};

/**
 * Canonical top-of-page title for Home, tools, About, FAQ, legal, etc.
 * Keeps the h1 at the same vertical position across those pages.
 * Secondary in-page titles (like “Tools”) should not use this.
 */
export function PageHeader({
  title,
  description,
  headingId = "page-heading",
  className,
}: PageHeaderProps) {
  return (
    <Container
      as="header"
      className={cn(
        "pb-0 pt-[var(--page-title-pt)] sm:pt-[var(--page-title-pt-sm)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <SparkleMark size="lg" className="mt-[0.55em] shrink-0" />
        <div className="min-w-0 max-w-2xl">
          <h1
            id={headingId}
            className="scroll-mt-[var(--site-header-height)] font-display text-[clamp(1.875rem,5.5vw,3.375rem)] font-semibold leading-[1.15] tracking-tight text-foreground sm:scroll-mt-[var(--site-header-height-sm)]"
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-base leading-relaxed text-muted sm:mt-2.5 sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
