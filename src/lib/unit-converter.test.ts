import { describe, expect, it } from "vitest";
import {
  convertUnits,
  formatConversionNumber,
  formatConversionStatement,
  formatForwardRate,
  formatReverseRate,
  formatUnitHeading,
  getCategoryDefaults,
  parseAmountInput,
  resolveConversion,
  swapUnitPair,
  unitDisplayName,
  usesSingularUnitLabel,
  validateTemperatureAmount,
} from "@/lib/unit-converter";
import {
  ABSOLUTE_ZERO,
  CATEGORY_META,
  getUnitById,
  getUnitsForCategory,
  UNITS,
} from "@/lib/unit-definitions";

function expectOk(
  result: ReturnType<typeof convertUnits>,
): asserts result is Extract<ReturnType<typeof convertUnits>, { ok: true }> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
}

describe("unit definitions", () => {
  it("registers every default unit id", () => {
    for (const meta of CATEGORY_META) {
      expect(getUnitById(meta.defaultFromId)?.category).toBe(meta.id);
      expect(getUnitById(meta.defaultToId)?.category).toBe(meta.id);
    }
  });

  it("keeps unique unit ids", () => {
    const ids = UNITS.map((unit) => unit.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists units per category", () => {
    expect(getUnitsForCategory("length").length).toBeGreaterThanOrEqual(8);
    expect(getUnitsForCategory("temperature").map((u) => u.id)).toEqual([
      "celsius",
      "fahrenheit",
      "kelvin",
    ]);
  });
});

describe("parseAmountInput", () => {
  it("treats empty and incomplete drafts as non-numeric", () => {
    expect(parseAmountInput("")).toEqual({ kind: "empty" });
    expect(parseAmountInput("   ")).toEqual({ kind: "empty" });
    expect(parseAmountInput("-")).toEqual({ kind: "incomplete" });
    expect(parseAmountInput(".")).toEqual({ kind: "incomplete" });
    expect(parseAmountInput("-.")).toEqual({ kind: "incomplete" });
    expect(parseAmountInput("12.")).toEqual({ kind: "incomplete" });
  });

  it("parses integers, decimals, zero, and negatives", () => {
    expect(parseAmountInput("0")).toEqual({ kind: "number", value: 0 });
    expect(parseAmountInput("12")).toEqual({ kind: "number", value: 12 });
    expect(parseAmountInput("3.5")).toEqual({ kind: "number", value: 3.5 });
    expect(parseAmountInput("-40")).toEqual({ kind: "number", value: -40 });
    expect(parseAmountInput(".5")).toEqual({ kind: "number", value: 0.5 });
  });

  it("rejects non-numeric input", () => {
    expect(parseAmountInput("abc").kind).toBe("invalid");
    expect(parseAmountInput("1e3").kind).toBe("invalid");
    expect(parseAmountInput("1,000").kind).toBe("invalid");
  });
});

describe("length conversions", () => {
  it("converts metres to centimetres", () => {
    const result = convertUnits(1, "m", "cm");
    expectOk(result);
    expect(result.value).toBeCloseTo(100, 10);
  });

  it("converts kilometres to metres", () => {
    const result = convertUnits(1, "km", "m");
    expectOk(result);
    expect(result.value).toBeCloseTo(1000, 10);
  });

  it("converts inches to centimetres", () => {
    const result = convertUnits(1, "in", "cm");
    expectOk(result);
    expect(result.value).toBeCloseTo(2.54, 10);
  });

  it("converts miles to kilometres", () => {
    const result = convertUnits(1, "mi", "km");
    expectOk(result);
    expect(result.value).toBeCloseTo(1.609344, 10);
  });

  it("round-trips length approximately", () => {
    const forward = convertUnits(12.5, "m", "ft");
    expectOk(forward);
    const back = convertUnits(forward.value, "ft", "m");
    expectOk(back);
    expect(back.value).toBeCloseTo(12.5, 10);
  });
});

describe("weight conversions", () => {
  it("converts kilograms to grams", () => {
    const result = convertUnits(1, "kg", "g");
    expectOk(result);
    expect(result.value).toBeCloseTo(1000, 10);
  });

  it("converts pounds to kilograms", () => {
    const result = convertUnits(1, "lb", "kg");
    expectOk(result);
    expect(result.value).toBeCloseTo(0.45359237, 10);
  });

  it("converts stones to pounds", () => {
    const result = convertUnits(1, "st", "lb");
    expectOk(result);
    expect(result.value).toBeCloseTo(14, 8);
  });

  it("round-trips weight approximately", () => {
    const forward = convertUnits(5, "kg", "lb");
    expectOk(forward);
    const back = convertUnits(forward.value, "lb", "kg");
    expectOk(back);
    expect(back.value).toBeCloseTo(5, 10);
  });
});

describe("temperature conversions", () => {
  it("converts 0 °C to 32 °F", () => {
    const result = convertUnits(0, "celsius", "fahrenheit");
    expectOk(result);
    expect(result.value).toBeCloseTo(32, 10);
  });

  it("converts 100 °C to 212 °F", () => {
    const result = convertUnits(100, "celsius", "fahrenheit");
    expectOk(result);
    expect(result.value).toBeCloseTo(212, 10);
  });

  it("converts 32 °F to 0 °C", () => {
    const result = convertUnits(32, "fahrenheit", "celsius");
    expectOk(result);
    expect(result.value).toBeCloseTo(0, 10);
  });

  it("converts 0 K to -273.15 °C", () => {
    const result = convertUnits(0, "kelvin", "celsius");
    expectOk(result);
    expect(result.value).toBeCloseTo(-273.15, 10);
  });

  it("rejects values below absolute zero", () => {
    expect(validateTemperatureAmount(-273.16, "celsius")).not.toBeNull();
    expect(validateTemperatureAmount(-459.68, "fahrenheit")).not.toBeNull();
    expect(validateTemperatureAmount(-0.001, "kelvin")).not.toBeNull();

    const belowC = convertUnits(-273.16, "celsius", "fahrenheit");
    expect(belowC.ok).toBe(false);
    if (!belowC.ok) {
      expect(belowC.code).toBe("below_absolute_zero");
    }

    expect(ABSOLUTE_ZERO.celsius).toBe(-273.15);
    expect(ABSOLUTE_ZERO.fahrenheit).toBe(-459.67);
    expect(ABSOLUTE_ZERO.kelvin).toBe(0);
  });

  it("accepts absolute zero exactly", () => {
    expect(validateTemperatureAmount(-273.15, "celsius")).toBeNull();
    expect(validateTemperatureAmount(-459.67, "fahrenheit")).toBeNull();
    expect(validateTemperatureAmount(0, "kelvin")).toBeNull();

    const result = convertUnits(-273.15, "celsius", "kelvin");
    expectOk(result);
    expect(result.value).toBeCloseTo(0, 10);
  });

  it("round-trips temperature within tolerance", () => {
    const forward = convertUnits(37, "celsius", "fahrenheit");
    expectOk(forward);
    const back = convertUnits(forward.value, "fahrenheit", "celsius");
    expectOk(back);
    expect(back.value).toBeCloseTo(37, 8);
  });
});

describe("volume conversions", () => {
  it("converts litres to millilitres", () => {
    const result = convertUnits(1, "L", "mL");
    expectOk(result);
    expect(result.value).toBeCloseTo(1000, 10);
  });

  it("converts US gallons to litres", () => {
    const result = convertUnits(1, "us_gal", "L");
    expectOk(result);
    expect(result.value).toBeCloseTo(3.785411784, 10);
  });

  it("converts Imperial gallons to litres", () => {
    const result = convertUnits(1, "imp_gal", "L");
    expectOk(result);
    expect(result.value).toBeCloseTo(4.54609, 10);
  });

  it("keeps US and Imperial gallons distinct", () => {
    const us = convertUnits(1, "us_gal", "L");
    const imp = convertUnits(1, "imp_gal", "L");
    expectOk(us);
    expectOk(imp);
    expect(us.value).not.toBeCloseTo(imp.value, 3);
  });

  it("round-trips volume approximately", () => {
    const forward = convertUnits(2, "L", "us_gal");
    expectOk(forward);
    const back = convertUnits(forward.value, "us_gal", "L");
    expectOk(back);
    expect(back.value).toBeCloseTo(2, 10);
  });
});

describe("area conversions", () => {
  it("converts square metres to square feet", () => {
    const result = convertUnits(1, "m2", "ft2");
    expectOk(result);
    expect(result.value).toBeCloseTo(10.7639104167, 8);
  });

  it("converts hectares to square metres", () => {
    const result = convertUnits(1, "ha", "m2");
    expectOk(result);
    expect(result.value).toBeCloseTo(10_000, 10);
  });

  it("converts acres to square metres", () => {
    const result = convertUnits(1, "ac", "m2");
    expectOk(result);
    expect(result.value).toBeCloseTo(4046.8564224, 8);
  });

  it("round-trips area approximately", () => {
    const forward = convertUnits(25, "m2", "ft2");
    expectOk(forward);
    const back = convertUnits(forward.value, "ft2", "m2");
    expectOk(back);
    expect(back.value).toBeCloseTo(25, 8);
  });
});

describe("speed conversions", () => {
  it("converts 100 km/h to mph", () => {
    const result = convertUnits(100, "kmh", "mph");
    expectOk(result);
    expect(result.value).toBeCloseTo(62.1371, 4);
  });

  it("converts metres per second to kilometres per hour", () => {
    const result = convertUnits(1, "mps", "kmh");
    expectOk(result);
    expect(result.value).toBeCloseTo(3.6, 10);
  });

  it("converts knots to kilometres per hour", () => {
    const result = convertUnits(1, "kn", "kmh");
    expectOk(result);
    expect(result.value).toBeCloseTo(1.852, 8);
  });

  it("round-trips speed approximately", () => {
    const forward = convertUnits(50, "kmh", "mph");
    expectOk(forward);
    const back = convertUnits(forward.value, "mph", "kmh");
    expectOk(back);
    expect(back.value).toBeCloseTo(50, 8);
  });
});

describe("formatConversionNumber", () => {
  it("trims trailing zeros", () => {
    expect(formatConversionNumber(1)).toBe("1");
    expect(formatConversionNumber(1.5)).toBe("1.5");
    expect(formatConversionNumber(100)).toBe("100");
  });

  it("avoids floating-point display noise", () => {
    const noisy = 0.1 + 0.2;
    expect(formatConversionNumber(noisy)).toBe("0.3");
  });

  it("displays zero cleanly", () => {
    expect(formatConversionNumber(0)).toBe("0");
    expect(formatConversionNumber(-0)).toBe("0");
  });

  it("displays negative temperatures correctly", () => {
    expect(formatConversionNumber(-40)).toBe("-40");
    expect(formatConversionNumber(-273.15)).toBe("-273.15");
  });

  it("formats very large and very small values sensibly", () => {
    expect(formatConversionNumber(1e16)).toMatch(/e/i);
    expect(formatConversionNumber(1e-8)).toMatch(/e/i);
  });

  it("groups large ordinary integers", () => {
    expect(formatConversionNumber(10000)).toBe("10,000");
  });
});

describe("validation and helpers", () => {
  it("rejects unsupported unit ids", () => {
    const result = convertUnits(1, "m", "not-a-unit");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unknown_unit");
  });

  it("rejects mixed categories", () => {
    const result = convertUnits(1, "m", "kg");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("category_mismatch");
  });

  it("handles non-finite amounts safely", () => {
    expect(convertUnits(Number.NaN, "m", "ft").ok).toBe(false);
    expect(convertUnits(Number.POSITIVE_INFINITY, "m", "ft").ok).toBe(false);
  });

  it("swapping twice restores the original pair", () => {
    const original = { fromUnitId: "m", toUnitId: "ft" };
    const swapped = swapUnitPair(original);
    expect(swapped).toEqual({ fromUnitId: "ft", toUnitId: "m" });
    expect(swapUnitPair(swapped)).toEqual(original);
  });

  it("provides category defaults", () => {
    expect(getCategoryDefaults("length")).toEqual({
      amount: "1",
      fromUnitId: "m",
      toUnitId: "ft",
    });
    expect(getCategoryDefaults("temperature")).toEqual({
      amount: "0",
      fromUnitId: "celsius",
      toUnitId: "fahrenheit",
    });
  });

  it("builds copy-friendly statements", () => {
    const result = convertUnits(1, "m", "ft");
    expectOk(result);
    const statement = formatConversionStatement(
      1,
      result.fromUnit,
      result.value,
      result.toUnit,
    );
    expect(statement).toContain("metre");
    expect(statement).toContain("feet");
    expect(statement).toContain("3.28084");
  });

  it("builds symbol rates both ways", () => {
    const from = getUnitById("m");
    const to = getUnitById("ft");
    expect(from).toBeDefined();
    expect(to).toBeDefined();
    if (!from || !to) return;

    expect(formatForwardRate(from, to)).toBe("1 m = 3.28084 ft");
    expect(formatReverseRate(from, to)).toBe("1 ft = 0.3048 m");
    expect(formatUnitHeading(to, 1)).toBe("Foot (ft)");
    expect(formatUnitHeading(to, 3.28084)).toBe("Feet (ft)");
  });

  it("uses singular and plural unit labels by amount", () => {
    const metre = getUnitById("m");
    const foot = getUnitById("ft");
    const pound = getUnitById("lb");
    const usGallon = getUnitById("us_gal");
    expect(metre).toBeDefined();
    expect(foot).toBeDefined();
    expect(pound).toBeDefined();
    expect(usGallon).toBeDefined();
    if (!metre || !foot || !pound || !usGallon) return;

    // Requested examples for the amount line
    expect(unitDisplayName(foot, 1)).toBe("foot");
    expect(unitDisplayName(foot, 2)).toBe("feet");
    expect(unitDisplayName(metre, 1)).toBe("metre");
    expect(unitDisplayName(metre, 0.5)).toBe("metres");

    // Destination headings follow the same singular/plural rule
    expect(formatUnitHeading(foot, 1)).toBe("Foot (ft)");
    expect(formatUnitHeading(foot, 2)).toBe("Feet (ft)");
    expect(formatUnitHeading(metre, 1)).toBe("Metre (m)");
    expect(formatUnitHeading(metre, 0.5)).toBe("Metres (m)");
    expect(formatUnitHeading(pound, 1)).toBe("Pound (lb)");
    expect(formatUnitHeading(pound, 2)).toBe("Pounds (lb)");
    expect(formatUnitHeading(usGallon, 1)).toBe("US gallon (US gal)");
    expect(formatUnitHeading(usGallon, 2)).toBe("US gallons (US gal)");

    expect(usesSingularUnitLabel(1)).toBe(true);
    expect(usesSingularUnitLabel(-1)).toBe(true);
    expect(usesSingularUnitLabel(0.5)).toBe(false);
    expect(usesSingularUnitLabel(2)).toBe(false);

    // Exact foot ↔ metre round trip still lands on singular "1"
    const oneFootInMetres = convertUnits(1, "ft", "m");
    expect(oneFootInMetres.ok).toBe(true);
    if (oneFootInMetres.ok) {
      expect(formatConversionNumber(oneFootInMetres.value)).toBe("0.3048");
      expect(formatUnitHeading(metre, oneFootInMetres.value)).toBe(
        "Metres (m)",
      );
    }

    const oneMetreInFeet = convertUnits(1, "m", "ft");
    expect(oneMetreInFeet.ok).toBe(true);
    if (oneMetreInFeet.ok) {
      expect(unitDisplayName(metre, 1)).toBe("metre");
      expect(formatUnitHeading(foot, oneMetreInFeet.value)).toBe("Feet (ft)");
    }
  });

  it("resolveConversion stays idle for incomplete input", () => {
    expect(resolveConversion("", "m", "ft").status).toBe("idle");
    expect(resolveConversion("-", "m", "ft").status).toBe("idle");
    expect(resolveConversion("1.", "m", "ft").status).toBe("idle");
  });

  it("resolveConversion returns a ready result for valid input", () => {
    const resolved = resolveConversion("1", "L", "us_gal");
    expect(resolved.status).toBe("ready");
    if (resolved.status === "ready") {
      expect(resolved.result.value).toBeCloseTo(0.264172, 5);
    }
  });
});
