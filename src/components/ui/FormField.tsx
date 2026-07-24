import { cn } from "@/lib/utils";

type FormFieldProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Vertical spacing wrapper for a label + input pair.
 */
export function FormField({ children, className }: FormFieldProps) {
  return <div className={cn(className)}>{children}</div>;
}
