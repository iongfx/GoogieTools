import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Styled text input with accessible focus styles.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "control-field w-full text-foreground",
          "placeholder:text-muted/75",
          "transition-[border-color,box-shadow] duration-200",
          "hover:border-accent/40",
          "focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/25",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
