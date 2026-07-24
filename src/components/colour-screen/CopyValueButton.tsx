"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CopyValueButtonProps = {
  value: string;
  ariaLabel: string;
  className?: string;
};

/**
 * Two overlapping pages — the common “copy” metaphor.
 */
export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <rect x="9" y="9" width="12" height="12" rx="2.25" ry="2.25" />
      <path d="M5 15H4.25A2.25 2.25 0 0 1 2 12.75V4.25A2.25 2.25 0 0 1 4.25 2h8.5A2.25 2.25 0 0 1 15 4.25V5" />
    </svg>
  );
}

async function writeClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compact icon button that copies a value and briefly confirms success.
 */
export function CopyValueButton({
  value,
  ariaLabel,
  className,
}: CopyValueButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    const ok = await writeClipboard(value);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={copied ? "Copied" : ariaLabel}
      title={copied ? "Copied" : ariaLabel}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
        "text-muted transition-colors",
        "hover:bg-accent-soft/70 hover:text-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        copied && "text-accent",
        className,
      )}
    >
      {copied ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="1.15rem"
          height="1.15rem"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M5 13.5 9.5 18 19 7" />
        </svg>
      ) : (
        <CopyIcon className="h-[1.15rem] w-[1.15rem]" />
      )}
    </button>
  );
}
