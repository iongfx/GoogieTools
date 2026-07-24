"use client";

import { cn } from "@/lib/utils";

type AccordionItemProps = {
  question: string;
  answer: string;
  className?: string;
  /** Optional content shown under the answer (e.g. a free badge). */
  footer?: React.ReactNode;
};

/**
 * Accessible expand/collapse row for FAQ-style content.
 */
export function AccordionItem({
  question,
  answer,
  className,
  footer,
}: AccordionItemProps) {
  return (
    <details
      className={cn(
        "group rounded-2xl border border-border bg-surface shadow-soft-sm",
        "transition-[box-shadow,border-color] duration-200 open:border-accent/25 open:shadow-soft-md",
        className,
      )}
    >
      <summary className="min-h-11 cursor-pointer list-none px-4 py-4 marker:content-none sm:px-6 sm:py-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-3 sm:gap-4">
          <span className="min-w-0 text-left text-base font-medium leading-snug text-foreground sm:text-lg">
            {question}
          </span>
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent transition-transform duration-200 group-open:rotate-45"
          >
            +
          </span>
        </span>
      </summary>
      <div className="border-t border-border px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
        <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
          {answer}
        </p>
        {footer}
      </div>
    </details>
  );
}
