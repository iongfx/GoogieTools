"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Always open a new page at the top. Prevents sticky-header overlap when
 * navigating from a scrolled page (smooth scroll can stop mid-way).
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
