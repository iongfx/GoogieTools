import { cn } from "@/lib/utils";

type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
};

/**
 * Consistent vertical padding for page sections.
 */
export function Section({
  children,
  className,
  id,
  "aria-labelledby": ariaLabelledBy,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn("py-12 sm:py-16 lg:py-[4.5rem]", className)}
    >
      {children}
    </section>
  );
}
