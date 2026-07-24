"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { Container } from "@/components/layout/Container";
import { NAV_LINKS, SITE_SECONDARY_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/" || href.startsWith("/#")) {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Site header with desktop links and an accessible mobile menu.
 */
export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    firstLinkRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/90 shadow-soft-sm backdrop-blur-md">
      <Container className="flex h-[4.25rem] items-center justify-between gap-4 sm:h-[4.5rem]">
        <div className="flex min-w-0 items-center gap-10 sm:gap-12 md:gap-14">
          <BrandWordmark onClick={() => setIsOpen(false)} size="header" />
          <p className="hidden min-w-0 truncate text-[0.9375rem] text-muted md:block md:text-base">
            {SITE_SECONDARY_TAGLINE}
          </p>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-[0.9375rem] font-medium transition-[color,background-color,transform] duration-200",
                  "hover:-translate-y-px",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-accent-soft/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-soft-sm md:hidden",
            "transition-[transform,box-shadow,border-color] duration-200",
            "hover:border-accent/30 hover:shadow-soft-md active:scale-[0.98]",
          )}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isOpen ? (
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </Container>

      {isOpen ? (
        <nav
          id="mobile-nav"
          className="border-t border-border bg-surface md:hidden"
          aria-label="Mobile primary"
        >
          <Container className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link, index) => {
              const isActive = isLinkActive(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors duration-200",
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-accent-soft/60 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
