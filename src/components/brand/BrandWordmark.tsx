import Link from "next/link";
import { GoogieMark } from "@/components/brand/GoogieMark";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  onClick?: () => void;
  href?: string;
  /** Larger lockup for the site header (~15% bigger than default). */
  size?: "default" | "header";
};

/**
 * Official Googie Tools wordmark: mascot mark + “Googie Tools” lockup.
 * Only the G and T are capitalized. Colors adapt for light surfaces.
 */
export function BrandWordmark({
  className,
  onClick,
  href = "/",
  size = "default",
}: BrandWordmarkProps) {
  const isHeader = size === "header";

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={`${SITE_NAME} home`}
      className={cn(
        "group inline-flex min-w-0 shrink items-center gap-2 sm:gap-2.5 transition-opacity duration-200 hover:opacity-90",
        className,
      )}
    >
      <GoogieMark size={isHeader ? "md" : "sm"} className="shrink-0" />
      <span
        className={cn(
          "truncate font-display font-bold tracking-tight",
          isHeader
            ? "text-[1.2rem] sm:text-[1.4375rem]"
            : "text-lg sm:text-xl",
        )}
      >
        <span className="text-foreground">Googie</span>{" "}
        <span className="font-semibold text-accent">Tools</span>
      </span>
    </Link>
  );
}
