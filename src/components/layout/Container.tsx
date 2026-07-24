import { cn } from "@/lib/utils";

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "header" | "footer" | "article";
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/**
 * Keeps page content aligned and readable on all screen sizes.
 * Use this instead of repeating max-width / padding everywhere.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6 lg:px-8",
        className,
      )}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </Tag>
  );
}
