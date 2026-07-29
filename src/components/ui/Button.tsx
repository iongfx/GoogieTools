import Link from "next/link";
import { cn } from "@/lib/utils";

type SharedProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
};

type ButtonAsLink = SharedProps & {
  href: string;
};

type ButtonAsButton = SharedProps &
  Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    keyof SharedProps
  > & {
    href?: undefined;
  };

type ButtonProps = ButtonAsLink | ButtonAsButton;

const sizeMap = {
  sm: "min-h-10 rounded-sm px-4 py-2 text-sm",
  md: "min-h-11 rounded-md px-5 py-2.5 text-[0.9375rem] sm:text-base",
  lg: "min-h-12 rounded-md px-6 py-3 text-base sm:text-lg",
} as const;

const variantMap = {
  primary:
    "bg-accent text-accent-foreground shadow-soft-sm hover:bg-accent-hover hover:shadow-soft-md",
  secondary:
    "border border-border bg-surface text-foreground shadow-soft-sm hover:border-accent/40 hover:text-accent hover:shadow-soft-md",
  ghost: "text-muted hover:bg-accent-soft/70 hover:text-accent",
} as const;

function buttonClasses(
  variant: SharedProps["variant"],
  size: SharedProps["size"],
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold",
    "transition-[transform,background-color,box-shadow,border-color,color,opacity] duration-200 ease-out",
    "hover:-translate-y-px active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none",
    sizeMap[size ?? "md"],
    variantMap[variant ?? "primary"],
    className,
  );
}

/**
 * Polished button for links and form actions.
 * Supports both <Link> (href) and native <button> (type/onClick).
 */
export function Button(props: ButtonProps) {
  if ("href" in props && props.href) {
    const { href, children, variant, size, className } = props;
    return (
      <Link href={href} className={buttonClasses(variant, size, className)}>
        {children}
      </Link>
    );
  }

  const { children, variant, size, className, ...buttonProps } = props;
  const resolvedType =
    "type" in props && props.type != null ? props.type : "button";

  return (
    <button
      className={buttonClasses(variant, size, className)}
      {...buttonProps}
      type={resolvedType}
    >
      {children}
    </button>
  );
}
