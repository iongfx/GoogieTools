"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "googie-tools-cookie-consent";

type ConsentValue = "accepted" | "rejected";

/**
 * Lightweight cookie / ads consent banner for AdSense readiness.
 * Stores a simple choice in localStorage. Replace with a full CMP before
 * serving personalized ads in the EEA/UK if required.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function save(value: ConsentValue) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore storage failures (private mode, etc.)
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-soft-lg backdrop-blur-md sm:p-5"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 max-w-2xl">
          <h2
            id="cookie-consent-title"
            className="text-sm font-semibold text-foreground sm:text-base"
          >
            Cookies &amp; ads
          </h2>
          <p
            id="cookie-consent-desc"
            className="mt-1 text-sm leading-relaxed text-muted"
          >
            We use essential cookies to run the site. If we enable Google AdSense
            or analytics later, those partners may use cookies to serve and
            measure ads. See our{" "}
            <Link
              href="/privacy"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>{" "}
            for details. You can change your browser settings anytime.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={() => save("rejected")}
            className="w-full sm:w-auto"
          >
            Reject non-essential
          </Button>
          <Button
            type="button"
            onClick={() => save("accepted")}
            className="w-full sm:w-auto"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
