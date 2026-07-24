import type { ReactNode } from "react";
import type { ToolIconName } from "@/config/tools";
import { cn } from "@/lib/utils";

type ToolIconProps = {
  icon: ToolIconName;
  className?: string;
  /** Pixel size for the SVG; defaults to 26 to fit the ~50px card container. */
  size?: number;
};

const STROKE = 1.85;

/**
 * Tiny Googie sparkle accent — yellow fill, used sparingly on tool icons.
 */
function SparkleAccent({
  cx,
  cy,
  scale = 0.22,
}: {
  cx: number;
  cy: number;
  scale?: number;
}) {
  return (
    <g
      className="text-sparkle"
      transform={`translate(${cx}, ${cy}) scale(${scale}) translate(-16, -16)`}
    >
      <path
        d="M16 3c.9 7.5 3.5 10.5 11 11.5C19.5 15.5 16.9 18.5 16 26c-.9-7.5-3.5-10.5-11-11.5C12.5 13.5 15.1 10.5 16 3z"
        fill="currentColor"
      />
    </g>
  );
}

function IconFrame({
  className,
  size,
  children,
}: {
  className?: string;
  size: number;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      {children}
    </svg>
  );
}

function QrCodeToolIcon({ className, size }: { className?: string; size: number }) {
  return (
    <IconFrame className={className} size={size}>
      {/* Three finder-pattern corners — simplified, not a real QR */}
      <rect x="3.25" y="3.25" width="6.5" height="6.5" rx="1.4" />
      <rect x="5.15" y="5.15" width="2.7" height="2.7" rx="0.55" />
      <rect x="14.25" y="3.25" width="6.5" height="6.5" rx="1.4" />
      <rect x="16.15" y="5.15" width="2.7" height="2.7" rx="0.55" />
      <rect x="3.25" y="14.25" width="6.5" height="6.5" rx="1.4" />
      <rect x="5.15" y="16.15" width="2.7" height="2.7" rx="0.55" />
      {/* Soft data hint + sparkle */}
      <path d="M14.5 14.5h2.2M18.8 14.5v2.2M14.5 18.8h2.2" />
      <SparkleAccent cx={20.2} cy={20.2} scale={0.18} />
    </IconFrame>
  );
}

function PasswordToolIcon({ className, size }: { className?: string; size: number }) {
  return (
    <IconFrame className={className} size={size}>
      {/* Rounded key */}
      <circle cx="8.25" cy="12" r="3.6" />
      <circle cx="8.25" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <path d="M11.7 12h8.1" />
      <path d="M17.2 12v2.35M19.85 12v2.85" />
      <SparkleAccent cx={19.6} cy={6.4} scale={0.2} />
    </IconFrame>
  );
}

function UnitConverterToolIcon({
  className,
  size,
}: {
  className?: string;
  size: number;
}) {
  return (
    <IconFrame className={className} size={size}>
      {/* Compact ruler */}
      <rect x="3.5" y="8.25" width="17" height="4.1" rx="1.2" />
      <path d="M7 8.25v2.05M10.5 8.25v1.35M14 8.25v2.05M17.5 8.25v1.35" />
      {/* Opposing conversion arrows */}
      <path d="M7.25 16.75h9.5" />
      <path d="M7.25 16.75l2-1.7M7.25 16.75l2 1.7" />
      <path d="M16.75 16.75l-2-1.7M16.75 16.75l-2 1.7" />
      <SparkleAccent cx={19.8} cy={5.6} scale={0.17} />
    </IconFrame>
  );
}

function ImageCompressorToolIcon({
  className,
  size,
}: {
  className?: string;
  size: number;
}) {
  return (
    <IconFrame className={className} size={size}>
      {/* Simple image frame */}
      <rect x="5.5" y="6" width="13" height="11" rx="2" />
      <circle cx="9.1" cy="9.7" r="1.15" />
      <path d="M6.1 14.7l3.1-2.7 2.4 1.9 2.2-1.7 4.2 3.1" />
      {/* Inward arrows — compress, not crop */}
      <path d="M3.4 11.5h3.1M6.5 11.5l-1.35-1.35M6.5 11.5l-1.35 1.35" />
      <path d="M20.6 11.5h-3.1M17.5 11.5l1.35-1.35M17.5 11.5l1.35 1.35" />
      <SparkleAccent cx={18.8} cy={5.4} scale={0.17} />
    </IconFrame>
  );
}

function ColourScreenToolIcon({
  className,
  size,
}: {
  className?: string;
  size: number;
}) {
  return (
    <IconFrame className={className} size={size}>
      {/* Display rectangle */}
      <rect x="3.5" y="5.25" width="17" height="11.5" rx="1.75" />
      {/* RGB dots */}
      <circle cx="8" cy="11" r="1.15" fill="currentColor" stroke="none" opacity="0.9" />
      <circle cx="12" cy="11" r="1.15" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="16" cy="11" r="1.15" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Stand */}
      <path d="M9.5 16.75h5M12 16.75v2" />
      {/* Target / cursor ring hint */}
      <circle cx="18.4" cy="7.1" r="1.55" />
      <SparkleAccent cx={6.2} cy={6.4} scale={0.16} />
    </IconFrame>
  );
}

function InvoiceToolIcon({ className, size }: { className?: string; size: number }) {
  return (
    <IconFrame className={className} size={size}>
      <path d="M7.25 3.75h9.5a1.5 1.5 0 011.5 1.5v13.4l-2.1-1.15-2.15 1.15-2.15-1.15-2.15 1.15-2.15-1.15-2.1 1.15V5.25a1.5 1.5 0 011.5-1.5z" />
      <path d="M9.25 8.5h5.5M9.25 11.5h5.5M9.25 14.5h3.25" />
      <SparkleAccent cx={18.6} cy={6.2} scale={0.17} />
    </IconFrame>
  );
}

function MortgageToolIcon({ className, size }: { className?: string; size: number }) {
  return (
    <IconFrame className={className} size={size}>
      {/* House */}
      <path d="M4.5 11.25L12 5.25l7.5 6" />
      <path d="M6.5 10.5V18.5h11V10.5" />
      <path d="M10.25 18.5v-4.25h3.5V18.5" />
      {/* Percentage detail */}
      <circle cx="8.35" cy="7.35" r="0.85" fill="currentColor" stroke="none" />
      <path d="M9.6 6.1l1.85 1.85" />
      <SparkleAccent cx={19.2} cy={8.2} scale={0.17} />
    </IconFrame>
  );
}

/**
 * Shared Googie Tools icon family for tool cards.
 * Add new icons by extending `ToolIconName` in config/tools.ts and a case here.
 */
export function ToolIcon({ icon, className, size = 26 }: ToolIconProps) {
  switch (icon) {
    case "qr-code":
      return <QrCodeToolIcon className={className} size={size} />;
    case "password":
      return <PasswordToolIcon className={className} size={size} />;
    case "unit-converter":
      return <UnitConverterToolIcon className={className} size={size} />;
    case "image-compressor":
      return <ImageCompressorToolIcon className={className} size={size} />;
    case "colour-screen":
      return <ColourScreenToolIcon className={className} size={size} />;
    case "invoice":
      return <InvoiceToolIcon className={className} size={size} />;
    case "mortgage":
      return <MortgageToolIcon className={className} size={size} />;
    default: {
      const _exhaustive: never = icon;
      return _exhaustive;
    }
  }
}
