import type { ReactNode } from "react";
import { SparkleMark } from "@/components/brand/SparkleMark";
import { cn } from "@/lib/utils";

type SectionTitleProps = {
  id?: string;
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  sparkleSize?: "sm" | "md" | "lg";
  /** When false, renders the title without a sparkle prefix. Default true. */
  sparkle?: boolean;
  /** When set, sits under the title text (aligned past the sparkle when shown). */
  description?: ReactNode;
};

/**
 * Section heading with an optional Googie Sparkle prefix.
 * Optional description aligns with the title text, not the sparkle.
 */
export function SectionTitle({
  id,
  children,
  as: Tag = "h2",
  className,
  sparkleSize = "md",
  sparkle = true,
  description,
}: SectionTitleProps) {
  const headingClass = cn(
    "font-display font-semibold tracking-tight text-foreground",
    Tag === "h1" && "text-[clamp(2.125rem,4vw,3.375rem)] leading-[1.15]",
    Tag === "h2" && "text-[clamp(1.625rem,3vw,2.0625rem)] leading-tight",
    Tag === "h3" && "text-[clamp(1.25rem,2vw,1.5rem)] leading-snug",
    sparkle && !description && "flex items-center gap-3",
    className,
  );

  if (!description) {
    return (
      <Tag id={id} className={headingClass}>
        {sparkle ? (
          <SparkleMark size={sparkleSize} className="translate-y-px" />
        ) : null}
        <span>{children}</span>
      </Tag>
    );
  }

  if (!sparkle) {
    return (
      <div className="min-w-0">
        <Tag id={id} className={headingClass}>
          {children}
        </Tag>
        <p className="mt-3.5 text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <SparkleMark
        size={sparkleSize}
        className="mt-[0.45em] shrink-0 translate-y-px"
      />
      <div className="min-w-0">
        <Tag id={id} className={headingClass}>
          {children}
        </Tag>
        <p className="mt-3.5 text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
      </div>
    </div>
  );
}
