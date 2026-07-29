"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ToolWorkspaceShell } from "@/components/tools/ToolWorkspaceShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { UNIT_TOOL } from "@/config/tools";
import {
  formatConversionNumber,
  formatConversionStatement,
  formatForwardRate,
  formatReverseRate,
  getCategoryDefaults,
  resolveConversion,
  swapUnitPair,
} from "@/lib/unit-converter";
import {
  CATEGORY_META,
  getUnitById,
  getUnitsForCategory,
  type UnitCategory,
  type UnitDefinition,
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Format a computed value for the opposite input (no thousand separators). */
function formatEditableAmount(value: number): string {
  return formatConversionNumber(value).replace(/,/g, "");
}

/** Symbol first so tight From/To selects stay readable if text is clipped. */
function formatSelectUnitLabel(unit: UnitDefinition): string {
  return `${unit.symbol} · ${unit.name}`;
}

function pairedAmount(
  raw: string,
  fromUnitId: string,
  toUnitId: string,
): { value: string; error: string | null } {
  const resolved = resolveConversion(raw, fromUnitId, toUnitId);
  if (resolved.status === "ready") {
    return {
      value: formatEditableAmount(resolved.result.value),
      error: null,
    };
  }
  if (resolved.status === "error") {
    return { value: "", error: resolved.message };
  }
  return { value: "", error: null };
}

const LENGTH_DEFAULTS = getCategoryDefaults("length");
const LENGTH_PAIRED = pairedAmount(
  LENGTH_DEFAULTS.amount,
  LENGTH_DEFAULTS.fromUnitId,
  LENGTH_DEFAULTS.toUnitId,
);

type EditSide = "from" | "to";

/**
 * Main Unit Converter tool.
 * From/To with swap in between; Amount and Result side by side (either editable).
 */
export function UnitConverter() {
  const categoryGroupId = useId();
  const fromAmountId = useId();
  const toAmountId = useId();
  const fromId = useId();
  const toId = useId();
  const errorId = useId();
  const actionTimeoutRef = useRef<number | null>(null);
  const announceTimeoutRef = useRef<number | null>(null);

  const [category, setCategory] = useState<UnitCategory>("length");
  const [fromAmount, setFromAmount] = useState(LENGTH_DEFAULTS.amount);
  const [toAmount, setToAmount] = useState(LENGTH_PAIRED.value);
  const [fromUnitId, setFromUnitId] = useState(LENGTH_DEFAULTS.fromUnitId);
  const [toUnitId, setToUnitId] = useState(LENGTH_DEFAULTS.toUnitId);
  const [editSide, setEditSide] = useState<EditSide>("from");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [swapPulse, setSwapPulse] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionIsError, setActionIsError] = useState(false);
  const [announceMessage, setAnnounceMessage] = useState(
    "Enter an amount and choose the units you want to convert.",
  );

  const categoryUnits = getUnitsForCategory(category);

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

  // Announce a stable conversion result after typing settles.
  useEffect(() => {
    if (announceTimeoutRef.current) {
      window.clearTimeout(announceTimeoutRef.current);
      announceTimeoutRef.current = null;
    }

    const sourceRaw = editSide === "from" ? fromAmount : toAmount;
    const sourceUnit = editSide === "from" ? fromUnitId : toUnitId;
    const targetUnit = editSide === "from" ? toUnitId : fromUnitId;
    const next = resolveConversion(sourceRaw, sourceUnit, targetUnit);

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
  }, [editSide, fromAmount, toAmount, fromUnitId, toUnitId]);

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
    setEditSide("from");
    setFromAmount(defaults.amount);
    const paired = pairedAmount(
      defaults.amount,
      defaults.fromUnitId,
      defaults.toUnitId,
    );
    setToAmount(paired.value);
    setErrorMessage(paired.error);
    setActionStatus(null);
    setActionIsError(false);
  }

  function handleFromAmountChange(raw: string) {
    setEditSide("from");
    setFromAmount(raw);
    setActionStatus(null);
    setActionIsError(false);
    const next = pairedAmount(raw, fromUnitId, toUnitId);
    setToAmount(next.value);
    setErrorMessage(next.error);
  }

  function handleToAmountChange(raw: string) {
    setEditSide("to");
    setToAmount(raw);
    setActionStatus(null);
    setActionIsError(false);
    const next = pairedAmount(raw, toUnitId, fromUnitId);
    setFromAmount(next.value);
    setErrorMessage(next.error);
  }

  function handleFromUnitChange(nextFromId: string) {
    setFromUnitId(nextFromId);
    setActionStatus(null);
    setActionIsError(false);
    if (editSide === "from") {
      const next = pairedAmount(fromAmount, nextFromId, toUnitId);
      setToAmount(next.value);
      setErrorMessage(next.error);
      return;
    }
    const next = pairedAmount(toAmount, toUnitId, nextFromId);
    setFromAmount(next.value);
    setErrorMessage(next.error);
  }

  function handleToUnitChange(nextToId: string) {
    setToUnitId(nextToId);
    setActionStatus(null);
    setActionIsError(false);
    if (editSide === "from") {
      const next = pairedAmount(fromAmount, fromUnitId, nextToId);
      setToAmount(next.value);
      setErrorMessage(next.error);
      return;
    }
    const next = pairedAmount(toAmount, nextToId, fromUnitId);
    setFromAmount(next.value);
    setErrorMessage(next.error);
  }

  function handleSwap() {
    const nextUnits = swapUnitPair({ fromUnitId, toUnitId });
    setFromUnitId(nextUnits.fromUnitId);
    setToUnitId(nextUnits.toUnitId);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    // Values moved with the columns; keep the same edit side.
    setSwapPulse(true);
    window.setTimeout(() => setSwapPulse(false), 280);
  }

  function handleClear() {
    const defaults = getCategoryDefaults(category);
    setEditSide("from");
    setFromAmount("");
    setToAmount("");
    setFromUnitId(defaults.fromUnitId);
    setToUnitId(defaults.toUnitId);
    setErrorMessage(null);
    setActionStatus(null);
    setActionIsError(false);
    setAnnounceMessage(
      "Enter an amount and choose the units you want to convert.",
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
  }

  const hasResult =
    resolveConversion(fromAmount, fromUnitId, toUnitId).status === "ready" ||
    resolveConversion(toAmount, toUnitId, fromUnitId).status === "ready";

  const fromUnitDef = getUnitById(fromUnitId);
  const toUnitDef = getUnitById(toUnitId);
  const forwardRate =
    fromUnitDef && toUnitDef
      ? formatForwardRate(fromUnitDef, toUnitDef)
      : null;
  const reverseRate =
    fromUnitDef && toUnitDef
      ? formatReverseRate(fromUnitDef, toUnitDef)
      : null;

  async function handleCopy(raw: string) {
    const copyText = raw.trim();
    if (!copyText) return;

    if (!navigator.clipboard?.writeText) {
      showActionStatus(
        "Copy isn’t supported here — select the number and copy it manually.",
        { isError: true, clearAfterMs: 4000 },
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      showActionStatus("Copied to clipboard");
      setAnnounceMessage("Copied to clipboard.");
    } catch {
      showActionStatus(
        "Couldn’t copy automatically — select the number and copy it manually.",
        { isError: true, clearAfterMs: 4000 },
      );
    }
  }

  return (
    <ToolWorkspaceShell icon={UNIT_TOOL.icon}>
      <Card padding="lg" className="border-border shadow-soft-md">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-xl space-y-5 sm:space-y-6"
          noValidate
        >
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

          {/* From | Swap | To, with editable values under each unit */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-2 gap-y-3 sm:gap-x-3">
            <div className="min-w-0">
              <Label htmlFor={fromId} className="text-center">
                From
              </Label>
              <Select
                id={fromId}
                name="fromUnit"
                value={fromUnitId}
                aria-label="From unit"
                onChange={(event) => handleFromUnitChange(event.target.value)}
                className="min-w-0 w-full !px-2.5 !text-left !text-sm sm:!px-3 sm:!text-[0.9375rem]"
              >
                {categoryUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {formatSelectUnitLabel(unit)}
                  </option>
                ))}
              </Select>
            </div>

            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap units"
              title="Swap units"
              className={cn(
                "mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-[border-color,background-color,color,transform] duration-200",
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
            </button>

            <div className="min-w-0">
              <Label htmlFor={toId} className="text-center">
                To
              </Label>
              <Select
                id={toId}
                name="toUnit"
                value={toUnitId}
                aria-label="To unit"
                onChange={(event) => handleToUnitChange(event.target.value)}
                className="min-w-0 w-full !px-2.5 !text-left !text-sm sm:!px-3 sm:!text-[0.9375rem]"
              >
                {categoryUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {formatSelectUnitLabel(unit)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="relative min-w-0">
              <Input
                id={fromAmountId}
                name="fromAmount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="0"
                value={fromAmount}
                aria-label={`Value in ${fromUnitDef?.name ?? "from unit"}`}
                aria-invalid={editSide === "from" && Boolean(errorMessage)}
                aria-describedby={
                  editSide === "from" && errorMessage ? errorId : undefined
                }
                onFocus={(event) => event.currentTarget.select()}
                onMouseUp={(event) => event.preventDefault()}
                onChange={(event) => handleFromAmountChange(event.target.value)}
                className="pr-10 text-center tabular-nums"
              />
              <button
                type="button"
                onClick={() => void handleCopy(fromAmount)}
                disabled={!fromAmount.trim()}
                aria-label={`Copy ${fromUnitDef?.name ?? "from"} value`}
                title="Copy number"
                className={cn(
                  "absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-200",
                  "hover:bg-surface hover:text-accent",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-40",
                )}
              >
                <CopyIcon />
              </button>
            </div>

            <div aria-hidden="true" />

            <div className="relative min-w-0">
              <Input
                id={toAmountId}
                name="toAmount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="0"
                value={toAmount}
                aria-label={`Value in ${toUnitDef?.name ?? "to unit"}`}
                aria-invalid={editSide === "to" && Boolean(errorMessage)}
                aria-describedby={
                  editSide === "to" && errorMessage ? errorId : undefined
                }
                onFocus={(event) => event.currentTarget.select()}
                onMouseUp={(event) => event.preventDefault()}
                onChange={(event) => handleToAmountChange(event.target.value)}
                className="pr-10 text-center tabular-nums"
              />
              <button
                type="button"
                onClick={() => void handleCopy(toAmount)}
                disabled={!toAmount.trim()}
                aria-label={`Copy ${toUnitDef?.name ?? "to"} value`}
                title="Copy number"
                className={cn(
                  "absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-200",
                  "hover:bg-surface hover:text-accent",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-40",
                )}
              >
                <CopyIcon />
              </button>
            </div>
          </div>

          {errorMessage ? (
            <FriendlyError
              id={errorId}
              message={errorMessage}
              className="text-center"
            />
          ) : null}

          {(forwardRate || reverseRate) && (
            <div className="space-y-1 text-center text-sm text-muted sm:text-[0.9375rem]">
              {forwardRate ? <p>{forwardRate}</p> : null}
              {reverseRate ? <p>{reverseRate}</p> : null}
            </div>
          )}

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {announceMessage}
          </p>
        </form>

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
              onClick={() => void handleCopy(toAmount)}
              disabled={!hasResult || !toAmount.trim()}
              aria-disabled={!hasResult || !toAmount.trim()}
              className={cn(
                "w-full sm:w-auto",
                (!hasResult || !toAmount.trim()) &&
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
