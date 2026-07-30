"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type CollapsibleToolSectionProps = {
  id: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  /** Extra classes for the expandable body (spacing, etc.). */
  contentClassName?: string;
  /** Marks the Colour values panel for the dropdown “apply” anchor. */
  dataColourValuesPanel?: boolean;
};

const TOGGLE_BUTTON_CLASS = cn(
  "inline-flex min-h-8 shrink-0 items-center rounded-md border border-border bg-surface px-2.5 text-sm font-medium text-muted shadow-soft-sm",
  "transition-[transform,border-color,color,background-color] duration-200",
  "hover:-translate-y-px hover:border-accent/40 hover:text-accent",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

const ANIMATION_MS = 320;

/**
 * Boxed tool section with a fixed title row. Body opens downward / closes
 * upward and pushes following content. The title and Show/Hide control stay at
 * the same place on screen for the whole animation.
 */
export function CollapsibleToolSection({
  id,
  title,
  open,
  onOpenChange,
  children,
  className,
  contentClassName,
  dataColourValuesPanel = false,
}: CollapsibleToolSectionProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const lockRafRef = useRef<number | null>(null);
  const contentId = `${id}-content`;

  useEffect(() => {
    return () => {
      if (lockRafRef.current != null) {
        cancelAnimationFrame(lockRafRef.current);
      }
    };
  }, []);

  function clearHeaderLock() {
    if (lockRafRef.current != null) {
      cancelAnimationFrame(lockRafRef.current);
      lockRafRef.current = null;
    }
  }

  function keepHeaderPinned(targetTop: number, until: number) {
    const header = headerRef.current;
    if (!header) {
      clearHeaderLock();
      return;
    }

    const delta = header.getBoundingClientRect().top - targetTop;
    if (Math.abs(delta) > 0.5) {
      window.scrollBy({ top: delta, left: 0, behavior: "auto" });
    }

    if (performance.now() < until) {
      lockRafRef.current = requestAnimationFrame(() =>
        keepHeaderPinned(targetTop, until),
      );
    } else {
      // One last correction after the CSS transition finishes.
      const finalDelta = header.getBoundingClientRect().top - targetTop;
      if (Math.abs(finalDelta) > 0.5) {
        window.scrollBy({ top: finalDelta, left: 0, behavior: "auto" });
      }
      clearHeaderLock();
    }
  }

  function handleToggle() {
    const header = headerRef.current;
    const targetTop = header?.getBoundingClientRect().top ?? null;

    clearHeaderLock();
    onOpenChange(!open);

    if (targetTop == null || !header) return;

    const until = performance.now() + ANIMATION_MS;
    lockRafRef.current = requestAnimationFrame(() =>
      keepHeaderPinned(targetTop, until),
    );
  }

  return (
    <div
      id={id}
      {...(dataColourValuesPanel
        ? { "data-colour-values-panel": true }
        : {})}
      className={cn(
        "[overflow-anchor:none] rounded-2xl border border-border bg-background/60 p-4",
        className,
      )}
    >
      <div
        ref={headerRef}
        className="relative z-[1] flex items-center justify-between gap-3"
      >
        <p className="text-[0.9375rem] font-medium text-foreground sm:text-base">
          {title}
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={handleToggle}
          className={TOGGLE_BUTTON_CLASS}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      <div
        id={contentId}
        className={cn(
          "grid [overflow-anchor:none] transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden [overflow-anchor:none]">
          <div
            className={cn("pt-4", contentClassName)}
            inert={!open ? true : undefined}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
