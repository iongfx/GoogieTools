import { cn } from "@/lib/utils";

type TrustNoteProps = {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Short privacy / trust note shown near interactive tools.
 */
export function TrustNote({ className, children }: TrustNoteProps) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-border bg-surface px-5 py-4 text-[0.9375rem] leading-relaxed text-muted sm:px-6 sm:py-5 sm:text-base",
        className,
      )}
    >
      {children ?? (
        <p>
          This tool runs in your browser. Your content is processed locally on
          your device to create the result — we do not upload it to our servers
          for generation.
        </p>
      )}
    </aside>
  );
}
