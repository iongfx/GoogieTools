import { cn } from "@/lib/utils";

type FriendlyErrorProps = {
  id?: string;
  message: string;
  className?: string;
};

/**
 * Accessible, friendly error message for forms and tools.
 */
export function FriendlyError({ id, message, className }: FriendlyErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn("text-[0.9375rem] font-medium text-error sm:text-base", className)}
    >
      {message}
    </p>
  );
}
