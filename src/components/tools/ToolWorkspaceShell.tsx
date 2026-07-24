import { cn } from "@/lib/utils";

type ToolWorkspaceShellProps = {
  /** @deprecated Icon now lives in ToolPageHeader; kept for call-site compatibility. */
  icon?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Thin wrapper around a tool’s working card.
 * The brand mark sits in ToolPageHeader so it can align with the description.
 */
export function ToolWorkspaceShell({
  children,
  className,
}: ToolWorkspaceShellProps) {
  return <div className={cn(className)}>{children}</div>;
}
