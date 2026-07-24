import Link from "next/link";
import { cn } from "@/lib/utils";

type TextLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
};

/**
 * Inline text link with accessible accent color and hover underline.
 */
export function TextLink({
  href,
  children,
  className,
  external = false,
}: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "font-medium text-accent underline-offset-2 transition-colors duration-200 hover:text-accent-hover hover:underline",
        className,
      )}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </Link>
  );
}
