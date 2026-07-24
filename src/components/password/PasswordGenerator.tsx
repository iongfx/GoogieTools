"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { GoogieEmptyStateIcon } from "@/components/brand/GoogieEmptyStateIcon";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { SparkleMark } from "@/components/brand/SparkleMark";
import { ToolResultPanel } from "@/components/tools/ToolResultPanel";
import { ToolWorkspaceShell } from "@/components/tools/ToolWorkspaceShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendlyError } from "@/components/ui/FriendlyError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SuccessMessage } from "@/components/ui/SuccessMessage";
import { PASSWORD_TOOL } from "@/config/tools";
import {
  clampPasswordLength,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  PASSWORD_LENGTH,
  wouldDisableLastCategory,
  type CharacterCategory,
  type PasswordOptions,
} from "@/lib/password-generator";
import { estimatePasswordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: {
  id: CharacterCategory;
  label: string;
  hint: string;
}[] = [
  { id: "uppercase", label: "Uppercase letters", hint: "A–Z" },
  { id: "lowercase", label: "Lowercase letters", hint: "a–z" },
  { id: "numbers", label: "Numbers", hint: "0–9" },
  { id: "symbols", label: "Symbols", hint: "!@#$…" },
];

const STRENGTH_BAR_CLASS: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-muted",
  1: "bg-accent/70",
  2: "bg-accent",
  3: "bg-success",
};

/** Brighter green once length hits the 4-star Very strong band (46+). */
const STRENGTH_BAR_BRIGHT_GREEN = "bg-[#22c55e]";

const SPARKLE_STAGGER_MS = 420;

type SparkleLayout = {
  /** Vertical position on the password box (0 = top, 100 = bottom). */
  rightOffsetPercent: number;
  leftOffsetPercent: number;
  /** When true, the right sparkle starts first. */
  rightFirst: boolean;
};

/** Stable default — never randomize during the first server/client render. */
const DEFAULT_SPARKLE_LAYOUT: SparkleLayout = {
  rightOffsetPercent: 45,
  leftOffsetPercent: 55,
  rightFirst: true,
};

function createSparkleLayout(): SparkleLayout {
  return {
    rightOffsetPercent: 25 + Math.round(Math.random() * 50),
    leftOffsetPercent: 25 + Math.round(Math.random() * 50),
    rightFirst: Math.random() < 0.5,
  };
}

/**
 * Main Password Generator tool.
 * Options on the left; result panel on the right (stacked on small screens).
 */
export function PasswordGenerator() {
  const lengthSliderId = useId();
  const lengthInputId = useId();
  const optionsErrorId = useId();
  const passwordId = useId();
  const strengthId = useId();
  const resultRef = useRef<HTMLDivElement>(null);
  const actionTimeoutRef = useRef<number | null>(null);

  const [length, setLength] = useState<number>(PASSWORD_LENGTH.default);
  /** Draft string so the number field can be cleared while typing. */
  const [lengthDraft, setLengthDraft] = useState(String(PASSWORD_LENGTH.default));
  const [options, setOptions] = useState<PasswordOptions>(
    DEFAULT_PASSWORD_OPTIONS,
  );
  const [password, setPassword] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionIsError, setActionIsError] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Choose your options, then generate a secure password.",
  );
  const [sparkleBurstKey, setSparkleBurstKey] = useState(0);
  const [sparkleLayout, setSparkleLayout] = useState<SparkleLayout>(
    DEFAULT_SPARKLE_LAYOUT,
  );
  const hadPasswordRef = useRef(false);

  function playSparkles() {
    setSparkleLayout(createSparkleLayout());
    setSparkleBurstKey((key) => key + 1);
  }

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        window.clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const hasResult = Boolean(password);
    if (hasResult && !hadPasswordRef.current) {
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
    hadPasswordRef.current = hasResult;
  }, [password]);

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

  function updateLength(next: number) {
    const clamped = clampPasswordLength(next);
    setLength(clamped);
    setLengthDraft(String(clamped));
  }

  function handleLengthInputChange(raw: string) {
    setLengthDraft(raw);
    if (raw === "") return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setLength(clampPasswordLength(parsed));
  }

  function handleLengthBlur() {
    if (lengthDraft === "" || !Number.isFinite(Number(lengthDraft))) {
      updateLength(PASSWORD_LENGTH.default);
      return;
    }
    updateLength(Number(lengthDraft));
  }

  function handleCategoryToggle(category: CharacterCategory) {
    setOptions((prev) => {
      if (prev[category] && wouldDisableLastCategory(prev, category)) {
        setOptionsError(
          "Keep at least one character type turned on.",
        );
        return prev;
      }

      setOptionsError(null);
      return { ...prev, [category]: !prev[category] };
    });
  }

  function runGenerate() {
    const result = generatePassword(length, options);
    if (!result.ok) {
      setOptionsError(result.error);
      setStatusMessage("Could not generate a password with these options.");
      return;
    }

    setOptionsError(null);
    setPassword(result.password);
    setPasswordVisible(true);
    setActionStatus(null);
    setActionIsError(false);
    setStatusMessage("Password ready.");
    playSparkles();
  }

  function handleGenerate(event: FormEvent) {
    event.preventDefault();
    runGenerate();
  }

  async function handleCopy() {
    if (!password) return;

    if (!navigator.clipboard?.writeText) {
      showActionStatus(
        "Copy isn’t supported here — select the password and copy it manually.",
        { isError: true, clearAfterMs: 4000 },
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      setStatusMessage("Copied to clipboard.");
      showActionStatus("Copied to clipboard");
    } catch {
      showActionStatus(
        "Couldn’t copy automatically — select the password and copy it manually.",
        { isError: true, clearAfterMs: 4000 },
      );
    }
  }

  const hasPassword = Boolean(password);
  const strength = estimatePasswordStrength(length, options);

  return (
    <ToolWorkspaceShell icon={PASSWORD_TOOL.icon}>
    <Card
      padding="lg"
      className="border-border shadow-soft-md"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)] lg:items-start lg:gap-x-12 lg:gap-y-8">
        {/* Configuration */}
        <div className="order-1 min-w-0">
          <form onSubmit={handleGenerate} className="space-y-6" noValidate>
            <div>
              <div className="mb-2 flex items-end justify-between gap-3">
                <Label htmlFor={lengthSliderId} className="mb-0">
                  Password length
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={lengthInputId}
                    name="length"
                    type="number"
                    inputMode="numeric"
                    min={PASSWORD_LENGTH.min}
                    max={PASSWORD_LENGTH.max}
                    step={1}
                    value={lengthDraft}
                    aria-label="Password length value"
                    onChange={(event) =>
                      handleLengthInputChange(event.target.value)
                    }
                    onBlur={handleLengthBlur}
                    className="w-[4.5rem] px-2 text-center tabular-nums"
                  />
                  <span className="text-sm text-muted" aria-hidden="true">
                    chars
                  </span>
                </div>
              </div>
              <input
                id={lengthSliderId}
                type="range"
                min={PASSWORD_LENGTH.min}
                max={PASSWORD_LENGTH.max}
                step={1}
                value={length}
                aria-valuemin={PASSWORD_LENGTH.min}
                aria-valuemax={PASSWORD_LENGTH.max}
                aria-valuenow={length}
                aria-valuetext={`${length} characters`}
                aria-describedby={`${lengthSliderId}-hint`}
                onChange={(event) => updateLength(Number(event.target.value))}
                className={cn(
                  "password-length-slider mt-1 w-full cursor-pointer appearance-none rounded-full",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              />
              <p
                id={`${lengthSliderId}-hint`}
                className="mt-2 text-[0.8125rem] text-muted sm:text-sm"
              >
                {PASSWORD_LENGTH.min}–{PASSWORD_LENGTH.max} characters
              </p>
            </div>

            <fieldset>
              <legend className="mb-2.5 text-[0.9375rem] font-medium text-foreground sm:text-base">
                Character types
              </legend>
              <ul className="grid list-none gap-2.5 p-0 sm:grid-cols-2">
                {CATEGORY_OPTIONS.map((item) => {
                  const checked = options[item.id];
                  const isLastEnabled =
                    checked && wouldDisableLastCategory(options, item.id);

                  return (
                    <li key={item.id}>
                      <label
                        className={cn(
                          "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[0.9375rem] text-foreground transition-colors sm:text-base",
                          "hover:border-accent/40",
                          checked && "border-accent/30 bg-accent-soft/40",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-accent focus:ring-ring"
                          checked={checked}
                          aria-describedby={
                            isLastEnabled ? optionsErrorId : undefined
                          }
                          onChange={() => handleCategoryToggle(item.id)}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium leading-snug">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">
                            {item.hint}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[0.9375rem] text-foreground transition-colors sm:text-base",
                "hover:border-accent/40",
                options.avoidAmbiguous && "border-accent/30 bg-accent-soft/40",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-accent focus:ring-ring"
                checked={options.avoidAmbiguous}
                onChange={(event) =>
                  setOptions((prev) => ({
                    ...prev,
                    avoidAmbiguous: event.target.checked,
                  }))
                }
              />
              <span className="min-w-0">
                <span className="block font-medium leading-snug">
                  Avoid ambiguous characters
                </span>
                <span className="mt-0.5 block text-sm text-muted">
                  Excludes I, l, 1, O, o, and 0
                </span>
              </span>
            </label>

            {optionsError ? (
              <FriendlyError id={optionsErrorId} message={optionsError} />
            ) : (
              <p className="text-[0.9375rem] leading-relaxed text-muted">
                Tip: keep several character types on for stronger passwords.
              </p>
            )}

            {/* Hidden submit so Enter in the form still generates a password. */}
            <button type="submit" className="sr-only">
              Generate password
            </button>
          </form>

          <p className="sr-only" aria-live="polite">
            {statusMessage}
          </p>
        </div>

        {/* Result */}
        <div
          ref={resultRef}
          className="order-2 scroll-mt-28 lg:sticky lg:top-24"
        >
          <ToolResultPanel
            label="Generated password"
            animate={hasPassword}
            className="[&>p:first-child]:pr-16"
          >
            {hasPassword && password ? (
              <div className="flex w-full flex-col items-center">
                <SuccessMessage
                  title="Your password is ready"
                  description="Copy it now or generate another one."
                  className="mb-4 sm:mb-5"
                />

                {/* Side padding keeps both sparkles inside the panel (not clipped). */}
                <div className="w-full max-w-md px-6 sm:px-8">
                  <div className="relative overflow-visible">
                    {/* Wrappers hold edge position; animation transforms stay on SparkleBurst */}
                    <span
                      className="pointer-events-none absolute left-0 z-10 -translate-x-1/2 -translate-y-1/2"
                      style={{ top: `${sparkleLayout.leftOffsetPercent}%` }}
                    >
                      <SparkleBurst
                        playKey={sparkleBurstKey}
                        delayMs={
                          sparkleLayout.rightFirst ? SPARKLE_STAGGER_MS : 0
                        }
                        size="sm"
                      />
                    </span>
                    <span
                      className="pointer-events-none absolute right-0 z-10 translate-x-1/2 -translate-y-1/2"
                      style={{ top: `${sparkleLayout.rightOffsetPercent}%` }}
                    >
                      <SparkleBurst
                        playKey={sparkleBurstKey}
                        delayMs={
                          sparkleLayout.rightFirst ? 0 : SPARKLE_STAGGER_MS
                        }
                      />
                    </span>
                    <div
                      id={passwordId}
                      className={cn(
                        "min-w-0 break-all rounded-xl border border-border bg-background px-5 py-3.5 sm:px-6",
                        "font-mono text-[1.0625rem] leading-relaxed tracking-wide text-foreground sm:text-lg",
                        "select-all",
                      )}
                    >
                      {passwordVisible ? (
                        <p className="m-0">{password}</p>
                      ) : (
                        <p
                          className="m-0"
                          aria-label="Generated password is hidden"
                        >
                          <span aria-hidden="true">
                            {"•".repeat(Math.min(password.length, 24))}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 pt-3">
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((prev) => !prev)}
                      className="min-h-11 rounded-lg px-0.5 text-[0.9375rem] font-semibold leading-none text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-pressed={passwordVisible}
                      aria-controls={passwordId}
                    >
                      {passwordVisible ? "Hide password" : "Show password"}
                    </button>
                    <p className="text-[0.9375rem] font-medium leading-none text-muted tabular-nums">
                      {password.length} characters
                    </p>
                  </div>

                  <div className="mt-5" aria-labelledby={strengthId}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                      <p
                        id={strengthId}
                        className="text-[0.9375rem] font-medium text-foreground sm:text-base"
                      >
                        Estimated strength
                      </p>
                      <p
                        className="inline-flex min-w-0 items-center gap-0.5 text-[0.9375rem] font-semibold text-foreground sm:text-base"
                        aria-label={
                          strength.level === 3
                            ? `${strength.label}, ${strength.sparkleCount} of 5`
                            : strength.label
                        }
                      >
                        {/*
                          Fixed-width star row (room for 5 sparkles) so
                          changing count does not shift the password panel.
                        */}
                        <span
                          className="inline-flex h-5 w-[4.75rem] shrink-0 items-center justify-end -space-x-1.5"
                          aria-hidden="true"
                        >
                          {Array.from(
                            { length: strength.sparkleCount },
                            (_, index) => (
                              <SparkleMark
                                key={index}
                                pixelSize={strength.sparkleSizePx}
                              />
                            ),
                          )}
                        </span>
                        <span className="whitespace-nowrap">{strength.label}</span>
                      </p>
                    </div>
                    <div
                      className="mt-2.5 h-2 overflow-hidden rounded-full bg-border"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={strength.meterPercent}
                      aria-valuetext={`${strength.label}, ${strength.meterPercent} percent`}
                      aria-labelledby={strengthId}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width,background-color] duration-300 ease-out",
                          strength.level === 3 && length >= 46
                            ? STRENGTH_BAR_BRIGHT_GREEN
                            : STRENGTH_BAR_CLASS[strength.level],
                        )}
                        style={{ width: `${strength.meterPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      Based on length and character variety — not a guarantee.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Ready when you are"
                description="Choose your options, then generate a secure password."
              >
                <GoogieEmptyStateIcon size="md" />
              </EmptyState>
            )}
          </ToolResultPanel>
        </div>
      </div>

      {/*
        Shared action row — same place before and after generation.
        Copy stays invisible until a password exists so Generate does not jump.
      */}
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <Button
            type="button"
            variant={hasPassword ? "secondary" : "primary"}
            onClick={runGenerate}
            className="w-full sm:w-auto"
          >
            {hasPassword ? "Generate another" : "Generate password"}
          </Button>
          <Button
            type="button"
            variant={hasPassword ? "primary" : "secondary"}
            onClick={() => void handleCopy()}
            disabled={!hasPassword}
            aria-disabled={!hasPassword}
            className={cn(
              "w-full sm:w-auto",
              !hasPassword &&
                "border-border bg-surface text-muted shadow-none disabled:opacity-50",
            )}
          >
            Copy password
          </Button>
        </div>
        {/*
          Reserve a fixed-height status line so “Copied to clipboard”
          does not shift the buttons when it appears.
        */}
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
