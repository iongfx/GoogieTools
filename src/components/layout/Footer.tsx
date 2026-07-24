import Link from "next/link";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { Container } from "@/components/layout/Container";
import {
  FOOTER_LINKS,
  SITE_NAME,
  SITE_SECONDARY_TAGLINE,
  SITE_TAGLINE,
} from "@/lib/constants";

/**
 * Simple site footer with secondary links for trust and navigation.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface/90">
      <Container className="flex flex-col gap-11 py-14 sm:py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <BrandWordmark />
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
              {SITE_TAGLINE}
            </p>
            <p className="mt-1.5 text-[0.9375rem] text-muted sm:text-base">
              {SITE_SECONDARY_TAGLINE}
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
              Explore
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-2 lg:gap-x-12">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-[0.9375rem] text-muted transition-colors duration-200 hover:text-accent sm:text-base"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="border-t border-border pt-7 text-sm text-muted sm:text-[0.9375rem]">
          © {year} {SITE_NAME}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
