import { cn } from "@/lib/utils";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/**
 * Form label with consistent weight and spacing.
 */
export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "mb-2 block text-[0.9375rem] font-medium text-foreground sm:text-base",
        className,
      )}
      {...props}
    />
  );
}
