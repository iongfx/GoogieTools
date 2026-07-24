import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Styled native select matching Input focus and hover behavior.
 */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "control-field w-full text-foreground",
        "transition-[border-color,box-shadow] duration-200",
        "hover:border-accent/40",
        "focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
