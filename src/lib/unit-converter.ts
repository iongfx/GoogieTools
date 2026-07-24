/**
 * Unit conversion engine and display formatting.
 * All calculations run in the browser — nothing is sent to a server.
 */

import {
  ABSOLUTE_ZERO,
  getCategoryMeta,
  getUnitById,
  requireUnitById,
  type UnitCategory,
  type UnitDefinition,
} from "@/lib/unit-definitions";

export type AmountParseResult =
  | { kind: "empty" }
  | { kind: "incomplete" }
  | { kind: "invalid"; message: string }
  | { kind: "number"; value: number };

export type ConversionSuccess = {
  ok: true;
  value: number;
  fromUnit: UnitDefinition;
  toUnit: UnitDefinition;
  amount: number;
};

export type ConversionFailure = {
  ok: false;
  error: string;
  code:
    | "unknown_unit"
    | "category_mismatch"
    | "invalid_amount"
    | "below_absolute_zero";
};

export type ConversionResult = ConversionSuccess | ConversionFailure;

/** Significant figures for ordinary display (matches everyday converter precision). */
const DISPLAY_SIGNIFICANT_FIGURES = 6;
const SCIENTIFIC_ABS_MIN = 1e-6;
const SCIENTIFIC_ABS_MAX = 1e15;

/**
 * Parse a user amount string without treating partial input as zero.
 * Accepts integers, decimals, and leading minus signs.
 */
export function parseAmountInput(raw: string): AmountParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "empty" };

  // Incomplete while typing: "-", ".", "-.", "1.", etc.
  if (
    trimmed === "-" ||
    trimmed === "." ||
    trimmed === "-." ||
    /^-?\d+\.$/.test(trimmed)
  ) {
    return { kind: "incomplete" };
  }

  // Allow optional leading +/-, digits with optional decimal part.
  // Reject locale group separators and scientific notation from users.
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return {
      kind: "invalid",
      message: "Enter a valid number.",
    };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return {
      kind: "invalid",
      message: "Enter a valid number.",
    };
  }

  return { kind: "number", value };
}

function temperatureToKelvin(value: number, unitId: string): number {
  switch (unitId) {
    case "celsius":
      return value + 273.15;
    case "fahrenheit":
      return ((value - 32) * 5) / 9 + 273.15;
    case "kelvin":
      return value;
    default:
      throw new Error(`Unsupported temperature unit: ${unitId}`);
  }
}

function kelvinToTemperature(kelvin: number, unitId: string): number {
  switch (unitId) {
    case "celsius":
      return kelvin - 273.15;
    case "fahrenheit":
      return ((kelvin - 273.15) * 9) / 5 + 32;
    case "kelvin":
      return kelvin;
    default:
      throw new Error(`Unsupported temperature unit: ${unitId}`);
  }
}

/**
 * Validate absolute-zero floors for temperature inputs.
 * Returns an error message when the value is physically invalid.
 */
export function validateTemperatureAmount(
  value: number,
  unitId: string,
): string | null {
  const floor = ABSOLUTE_ZERO[unitId];
  if (floor === undefined) {
    return "Choose a valid temperature unit.";
  }

  // Tiny epsilon avoids floating-point false negatives at the floor.
  if (value < floor - 1e-12) {
    const unit = getUnitById(unitId);
    const symbol = unit?.symbol ?? unitId;
    return `Temperatures cannot be below absolute zero (${floor} ${symbol}).`;
  }

  return null;
}

function convertTemperature(
  amount: number,
  fromUnit: UnitDefinition,
  toUnit: UnitDefinition,
): ConversionResult {
  const absoluteError = validateTemperatureAmount(amount, fromUnit.id);
  if (absoluteError) {
    return {
      ok: false,
      error: absoluteError,
      code: "below_absolute_zero",
    };
  }

  const kelvin = temperatureToKelvin(amount, fromUnit.id);
  // Guard intermediate Kelvin against tiny floating underflows.
  if (kelvin < -1e-12) {
    return {
      ok: false,
      error: validateTemperatureAmount(amount, fromUnit.id) ??
        "Temperatures cannot be below absolute zero.",
      code: "below_absolute_zero",
    };
  }

  const value = kelvinToTemperature(Math.max(kelvin, 0), toUnit.id);
  return {
    ok: true,
    value,
    fromUnit,
    toUnit,
    amount,
  };
}

function convertMultiplicative(
  amount: number,
  fromUnit: UnitDefinition,
  toUnit: UnitDefinition,
): ConversionResult {
  const valueInBase = amount * fromUnit.toBase;
  const value = valueInBase / toUnit.toBase;
  return {
    ok: true,
    value,
    fromUnit,
    toUnit,
    amount,
  };
}

/**
 * Convert `amount` from `fromUnitId` to `toUnitId`.
 */
export function convertUnits(
  amount: number,
  fromUnitId: string,
  toUnitId: string,
): ConversionResult {
  if (!Number.isFinite(amount)) {
    return {
      ok: false,
      error: "Enter a valid number.",
      code: "invalid_amount",
    };
  }

  const fromUnit = getUnitById(fromUnitId);
  const toUnit = getUnitById(toUnitId);

  if (!fromUnit || !toUnit) {
    return {
      ok: false,
      error: "Choose a valid unit.",
      code: "unknown_unit",
    };
  }

  if (fromUnit.category !== toUnit.category) {
    return {
      ok: false,
      error: "Choose units from the same category.",
      code: "category_mismatch",
    };
  }

  if (fromUnit.category === "temperature") {
    return convertTemperature(amount, fromUnit, toUnit);
  }

  return convertMultiplicative(amount, fromUnit, toUnit);
}

/**
 * Format a numeric conversion result for display.
 * Rounds to a sensible significant-figure budget, trims trailing zeros,
 * and uses scientific notation only for extremely large or small magnitudes.
 */
export function formatConversionNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";

  const abs = Math.abs(value);

  if (abs >= SCIENTIFIC_ABS_MAX || (abs > 0 && abs < SCIENTIFIC_ABS_MIN)) {
    const exponential = value
      .toExponential(DISPLAY_SIGNIFICANT_FIGURES - 1)
      .replace(/(\.\d*?)0+e/i, "$1e")
      .replace(/\.e/i, "e");
    return exponential;
  }

  // Round to significant figures to avoid false precision / float noise.
  const rounded = Number(value.toPrecision(DISPLAY_SIGNIFICANT_FIGURES));
  if (Object.is(rounded, -0) || rounded === 0) return "0";

  // Prefer fixed decimal output (not scientific) for ordinary magnitudes.
  const absRounded = Math.abs(rounded);
  const decimalPlaces = Math.min(
    10,
    Math.max(
      0,
      DISPLAY_SIGNIFICANT_FIGURES - Math.floor(Math.log10(absRounded)) - 1,
    ),
  );

  const fixed = rounded.toFixed(decimalPlaces);
  const trimmed = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integerPart, fractionPart] = unsigned.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body =
    fractionPart !== undefined
      ? `${groupedInteger}.${fractionPart}`
      : groupedInteger;

  return negative ? `-${body}` : body;
}

/**
 * Singular only when the displayed absolute amount is exactly "1".
 * So 1 → singular, while 0.5, 2, and 1.5 → plural.
 */
export function usesSingularUnitLabel(amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  return formatConversionNumber(Math.abs(amount)) === "1";
}

/** Singular vs plural unit name for amount lines (e.g. "1 metre", "2 feet"). */
export function unitDisplayName(
  unit: UnitDefinition,
  amount: number,
): string {
  if (unit.category === "temperature") {
    return unit.name;
  }
  return usesSingularUnitLabel(amount)
    ? unit.name.toLowerCase()
    : unit.namePlural;
}

/**
 * Destination unit heading under the converted number.
 * Uses singular for a displayed ±1 and plural otherwise.
 * Examples: "Foot (ft)", "Feet (ft)", "Celsius (°C)"
 */
export function formatUnitHeading(
  unit: UnitDefinition,
  amount: number,
): string {
  if (unit.category === "temperature") {
    return `${unit.name} (${unit.symbol})`;
  }

  if (usesSingularUnitLabel(amount)) {
    return `${unit.name} (${unit.symbol})`;
  }

  const plural =
    unit.namePlural.charAt(0).toUpperCase() + unit.namePlural.slice(1);
  return `${plural} (${unit.symbol})`;
}

/**
 * Build a plain-text conversion statement for copy / display.
 * Example: "10 kilometres = 6.21371 miles"
 */
export function formatConversionStatement(
  amount: number,
  fromUnit: UnitDefinition,
  resultValue: number,
  toUnit: UnitDefinition,
): string {
  const fromAmount = formatConversionNumber(amount);
  const toAmount = formatConversionNumber(resultValue);
  return `${fromAmount} ${unitDisplayName(fromUnit, amount)} = ${toAmount} ${unitDisplayName(toUnit, resultValue)}`;
}

/**
 * Compact statement using symbols.
 * Example: "10 km = 6.21371 mi"
 */
export function formatConversionStatementCompact(
  amount: number,
  fromUnit: UnitDefinition,
  resultValue: number,
  toUnit: UnitDefinition,
): string {
  return `${formatConversionNumber(amount)} ${fromUnit.symbol} = ${formatConversionNumber(resultValue)} ${toUnit.symbol}`;
}

/**
 * One-unit reverse rate using symbols.
 * Example: "1 ft = 0.3048 m"
 */
export function formatReverseRate(
  fromUnit: UnitDefinition,
  toUnit: UnitDefinition,
): string | null {
  const reverse = convertUnits(1, toUnit.id, fromUnit.id);
  if (!reverse.ok) return null;

  return `1 ${toUnit.symbol} = ${formatConversionNumber(reverse.value)} ${fromUnit.symbol}`;
}

/**
 * One-unit forward rate using symbols.
 * Example: "1 m = 3.28084 ft"
 */
export function formatForwardRate(
  fromUnit: UnitDefinition,
  toUnit: UnitDefinition,
): string | null {
  const forward = convertUnits(1, fromUnit.id, toUnit.id);
  if (!forward.ok) return null;

  return `1 ${fromUnit.symbol} = ${formatConversionNumber(forward.value)} ${toUnit.symbol}`;
}

export type UnitPair = {
  fromUnitId: string;
  toUnitId: string;
};

/** Swap source and destination unit ids. */
export function swapUnitPair(pair: UnitPair): UnitPair {
  return {
    fromUnitId: pair.toUnitId,
    toUnitId: pair.fromUnitId,
  };
}

/** Defaults for a category (amount + unit pair). */
export function getCategoryDefaults(category: UnitCategory): {
  amount: string;
  fromUnitId: string;
  toUnitId: string;
} {
  const meta = getCategoryMeta(category);
  // Ensure defaults exist in the registry.
  requireUnitById(meta.defaultFromId);
  requireUnitById(meta.defaultToId);
  return {
    amount: meta.defaultAmount,
    fromUnitId: meta.defaultFromId,
    toUnitId: meta.defaultToId,
  };
}

/**
 * Resolve conversion from a raw amount string.
 * Incomplete / empty inputs return null (no result yet).
 */
export function resolveConversion(
  amountRaw: string,
  fromUnitId: string,
  toUnitId: string,
):
  | { status: "idle" }
  | { status: "error"; message: string; code: ConversionFailure["code"] | "parse" }
  | { status: "ready"; result: ConversionSuccess } {
  const parsed = parseAmountInput(amountRaw);

  if (parsed.kind === "empty" || parsed.kind === "incomplete") {
    return { status: "idle" };
  }

  if (parsed.kind === "invalid") {
    return { status: "error", message: parsed.message, code: "parse" };
  }

  const converted = convertUnits(parsed.value, fromUnitId, toUnitId);
  if (!converted.ok) {
    return {
      status: "error",
      message: converted.error,
      code: converted.code,
    };
  }

  return { status: "ready", result: converted };
}
