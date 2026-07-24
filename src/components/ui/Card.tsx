import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
};

const paddingMap = {
  sm: "p-4 sm:p-6",
  md: "p-5 sm:p-7",
  lg: "p-5 sm:p-8 lg:p-9",
} as const;

/**
 * Rounded surface with a soft shadow.
 * Use for forms, FAQ items, feature blocks, and other content containers.
 */
export function Card({
  children,
  className,
  as: Tag = "div",
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-soft-md",
        paddingMap[padding],
        hover &&
          "transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-soft-lg",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
