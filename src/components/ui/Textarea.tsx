import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Styled multiline input matching the Input component.
 */
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "control-field min-h-[8.5rem] w-full resize-y text-foreground",
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
}
