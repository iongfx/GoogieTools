"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { GoogieEmptyStateIcon } from "@/components/brand/GoogieEmptyStateIcon";
import { ToolResultPanel } from "@/components/tools/ToolResultPanel";
import { ToolWorkspaceShell } from "@/components/tools/ToolWorkspaceShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { UNIT_TOOL } from "@/config/tools";
import {
  formatConversionNumber,
  formatConversionStatement,
  formatForwardRate,
  formatReverseRate,
  formatUnitHeading,
  getCategoryDefaults,
  resolveConversion,
  swapUnitPair,
  unitDisplayName,
} from "@/lib/unit-converter";
import {
  CATEGORY_META,
  formatUnitOptionLabel,
  getUnitsForCategory,
  type UnitCategory,
} from "@/lib/unit-definitions";
import { cn } from "@/lib/utils";

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  );
}

const LENGTH_DEFAULTS = getCategoryDefaults("length");

/**
 * Main Unit Converter tool.
 * Category + amount + units on the left; result panel on the right.
 */
export function UnitConverter() {
  const categoryGroupId = useId();
  const amountId = useId();
  const fromId = useId();
  const toId = useId();
  const errorId = useId();
  const resultRef = useRef<HTMLDivElement>(null);
  const actionTimeoutRef = useRef<number | null>(null);
  const announceTimeoutRef = useRef<number | null>(null);
  const hadResultRef = useRef(false);

  const [category, setCategory] = useState<UnitCategory>("length");
  const [amount, setAmount] = useState(LENGTH_DEFAULTS.amount);
  const [fromUnitId, setFromUnitId] = useState(LENGTH_DEFAULTS.fromUnitId);
  const [toUnitId, setToUnitId] = useState(LENGTH_DEFAULTS.toUnitId);
  const [swapPulse, setSwapPulse] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionIsError, setActionIsError] = useState(false);
  const [announceMessage, setAnnounceMessage] = useState(
    "Enter an amount and choose the units you want to convert.",
  );

  const categoryUnits = getUnitsForCategory(category);
  const resolved = resolveConversion(amount, fromUnitId, toUnitId);
  const hasResult = resolved.status === "ready";
  const errorMessage =
    resolved.status === "error" ? resolved.message : null;

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        window.clearTimeout(actionTimeoutRef.current);
      }
      if (announceTimeoutRef.current) {
        window.clearTimeout(announceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasResult && !hadResultRef.current) {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1023px)").matches
      ) {
        window.requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
    }
    hadResultRef.current = hasResult;
  }, [hasResult]);

  // Announce a stable conversion result after typing settles (not every keystroke).
  useEffect(() => {
    if (announceTimeoutRef.current) {
      window.clearTimeout(announceTimeoutRef.current);
      announceTimeoutRef.current = null;
    }

    const next = resolveConversion(amount, fromUnitId, toUnitId);

    if (next.status === "error") {
      setAnnounceMessage(next.message);
      return;
    }

    if (next.status !== "ready") {
      return;
    }

    const statement = formatConversionStatement(
      next.result.amount,
      next.result.fromUnit,
      next.result.value,
      next.result.toUnit,
    );

    announceTimeoutRef.current = window.setTimeout(() => {
      setAnnounceMessage(statement);
    }, 600);

    return () => {
      if (announceTimeoutRef.current) {
        window.clearTimeout(announceTimeoutRef.current);
      }
    };
  }, [amount, fromUnitId, toUnitId]);

  function showActionStatus(
    message: string,
    { isError = false, clearAfterMs = 2000 } = {},
  ) {
    setActionStatus(message);
    setActionIsError(isError);
    if (actionTimeoutRef.current) window.clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = window.setTimeout(() => {
      setActionStatus(null);
      setActionIsError(false);
    }, clearAfterMs);
  }

  function handleCategoryChange(next: UnitCategory) {
    const defaults = getCategoryDefaults(next);
    setCategory(next);
    setFromUnitId(defaults.fromUnitId);
    setToUnitId(defaults.toUnitId);
    // Keep a typed amount when it is still usable; otherwise use the category default.
    setAmount((current) => {
      const parsed = current.trim();
      if (parsed === "" || parsed === "-" || parsed === "." || parsed === "-.") {
        return defaults.amount;
      }
      return current;
    });
    setActionStatus(null);
    setActionIsError(false);
  }

  function handleSwap() {
    const next = swapUnitPair({ fromUnitId, toUnitId });
    setFromUnitId(next.fromUnitId);
    setToUnitId(next.toUnitId);
    setSwapPulse(true);
    window.setTimeout(() => setSwapPulse(false), 280);
  }

  function handleClear() {
    const defaults = getCategoryDefaults(category);
    setAmount("");
    setFromUnitId(defaults.fromUnitId);
    setToUnitId(defaults.toUnitId);
    setActionStatus(null);
    setActionIsError(false);
    setAnnounceMessage(
      "Enter an amount and choose the units you want to convert.",
    );
  }

  function handleSubmit(event: FormEvent) {
    // Conversion is live — Enter should not reload anything.
    event.preventDefault();
  }

  async function handleCopy() {
    if (resolved.status !== "ready") return;

    const text = formatConversionNumber(resolved.result.value);

    if (!navigator.clipboard?.writeText) {
      showActionStatus(
        "Copy isn’t supported here — select the result and copy it manually.",
        { isError: true, clearAfterMs: 4000 },
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showActionStatus("Copied to clipboard");
      setAnnounceMessage("Copied to clipboard.");
    } catch {
      showActionStatus(
        "Couldn’t copy automatically — select the result and copy it manually.",
        { isError: true, clearAfterMs: 4000 },
      );
    }
  }

  const readyResult = resolved.status === "ready" ? resolved.result : null;
  const forwardRate =
    readyResult &&
    formatForwardRate(readyResult.fromUnit, readyResult.toUnit);
  const reverseRate =
    readyResult &&
    formatReverseRate(readyResult.fromUnit, readyResult.toUnit);

  return (
    <ToolWorkspaceShell icon={UNIT_TOOL.icon}>
    <Card
      padding="lg"
      className="border-border shadow-soft-md"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)] lg:items-start lg:gap-x-12 lg:gap-y-8">
        {/* Setup */}
        <div className="order-1 min-w-0">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6" noValidate>
            <div>
              <p
                id={categoryGroupId}
                className="mb-2.5 text-[0.9375rem] font-medium text-foreground sm:text-base"
              >
                Category
              </p>
              <div
                className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-background p-1.5 sm:grid-cols-3"
                role="radiogroup"
                aria-labelledby={categoryGroupId}
              >
                {CATEGORY_META.map((item) => {
                  const selected = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleCategoryChange(item.id)}
                      className={cn(
                        "min-h-11 rounded-lg px-2.5 py-2.5 text-center text-[0.9375rem] font-semibold transition-colors duration-200 sm:px-4 sm:text-base",
                        selected
                          ? "bg-surface text-accent shadow-soft-sm"
                          : "text-muted hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-auto w-1/2 min-w-[9rem] max-w-[14rem]">
              <Label htmlFor={amountId} className="text-center">
                Amount
              </Label>
              <Input
                id={amountId}
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter an amount"
                value={amount}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? errorId : undefined}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setActionStatus(null);
                  setActionIsError(false);
                }}
                className="text-center tabular-nums"
              />
              {errorMessage ? (
                <FriendlyError
                  id={errorId}
                  message={errorMessage}
                  className="mt-2 text-center"
                />
              ) : (
                <p className="mt-2 text-center text-[0.8125rem] text-muted sm:text-sm">
                  {category === "temperature"
                    ? "Negative values are allowed. Absolute zero is the lower limit."
                    : "Decimals and signed values are supported."}
                </p>
              )}
            </div>

            {/*
              Below sm: stacked form — From / To (right-aligned labels, aligned selects), then Swap.
              sm+: From | Swap | To in one row (Swap always shows icon + text).
            */}
            <div className="mx-auto w-full max-w-md sm:mx-0 sm:max-w-none">
              <div
                className={cn(
                  "grid items-center gap-x-3 gap-y-3",
                  "grid-cols-[auto_minmax(0,1fr)]",
                  "sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end sm:gap-3",
                )}
              >
                <Label
                  htmlFor={fromId}
                  className="mb-0 whitespace-nowrap text-right sm:col-start-1 sm:row-start-1 sm:mb-2 sm:text-center"
                >
                  From<span className="sm:hidden">:</span>
                </Label>
                <Select
                  id={fromId}
                  name="fromUnit"
                  value={fromUnitId}
                  aria-label="Source unit"
                  onChange={(event) => setFromUnitId(event.target.value)}
                  className="min-w-0 w-full text-center sm:col-start-1 sm:row-start-2"
                >
                  {categoryUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {formatUnitOptionLabel(unit)}
                    </option>
                  ))}
                </Select>

                <Label
                  htmlFor={toId}
                  className="mb-0 whitespace-nowrap text-right sm:col-start-3 sm:row-start-1 sm:mb-2 sm:text-center"
                >
                  To<span className="sm:hidden">:</span>
                </Label>
                <Select
                  id={toId}
                  name="toUnit"
                  value={toUnitId}
                  aria-label="Destination unit"
                  onChange={(event) => setToUnitId(event.target.value)}
                  className="min-w-0 w-full text-center sm:col-start-3 sm:row-start-2"
                >
                  {categoryUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {formatUnitOptionLabel(unit)}
                    </option>
                  ))}
                </Select>

                <div className="col-span-2 flex justify-center pt-1 sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={handleSwap}
                    aria-label="Swap units"
                    className={cn(
                      "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 text-[0.9375rem] font-semibold text-foreground transition-[border-color,background-color,color] duration-200",
                      "hover:border-accent/40 hover:text-accent",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                  >
                    <SwapIcon
                      className={cn(
                        "transition-transform duration-200 motion-reduce:transition-none",
                        swapPulse && "rotate-180",
                      )}
                    />
                    <span>Swap</span>
                  </button>
                </div>
              </div>
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {announceMessage}
            </p>
          </form>
        </div>

        {/* Result */}
        <div
          ref={resultRef}
          className="order-2 scroll-mt-28 lg:sticky lg:top-24"
        >
          <ToolResultPanel
            label="Converted result"
            animate={hasResult}
            className="[&>p:first-child]:pr-16"
          >
            {readyResult ? (
              <div className="flex w-full flex-col items-center text-center">
                <SuccessMessage
                  title="Your conversion is ready"
                  description="Copy the result or swap the units to convert it back."
                  className="mb-4 sm:mb-5"
                />

                <div className="w-full max-w-md px-1 sm:px-2">
                  <p className="text-[0.9375rem] text-muted sm:text-base">
                    {formatConversionNumber(readyResult.amount)}{" "}
                    {unitDisplayName(
                      readyResult.fromUnit,
                      readyResult.amount,
                    )}
                  </p>

                  <p
                    className={cn(
                      "mt-2 max-w-full break-words font-display text-[clamp(1.5rem,5vw,2.375rem)] font-semibold leading-tight tracking-tight text-foreground",
                      "tabular-nums [overflow-wrap:anywhere]",
                    )}
                  >
                    {formatConversionNumber(readyResult.value)}
                  </p>
                  <p className="mt-1.5 text-base font-medium text-foreground sm:text-lg">
                    {formatUnitHeading(
                      readyResult.toUnit,
                      readyResult.value,
                    )}
                  </p>

                  {(forwardRate || reverseRate) && (
                    <div className="mt-4 space-y-1 text-sm text-muted sm:text-[0.9375rem]">
                      {forwardRate ? <p>{forwardRate}</p> : null}
                      {reverseRate ? <p>{reverseRate}</p> : null}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Ready when you are"
                description="Enter an amount and choose the units you want to convert."
              >
                <GoogieEmptyStateIcon size="md" />
              </EmptyState>
            )}
          </ToolResultPanel>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClear}
            className="w-full sm:w-auto"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleCopy()}
            disabled={!hasResult}
            aria-disabled={!hasResult}
            className={cn(
              "w-full sm:w-auto",
              !hasResult &&
                "border-border bg-surface text-muted shadow-none disabled:opacity-50",
            )}
          >
            Copy result
          </Button>
        </div>
        <p
          className={cn(
            "mt-3 min-h-6 text-center text-[0.9375rem] font-medium",
            actionIsError ? "text-error" : "text-success",
          )}
          role="status"
          aria-live="polite"
        >
          {actionStatus ?? ""}
        </p>
      </div>
    </Card>
    </ToolWorkspaceShell>
  );
}
