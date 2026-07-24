/**
 * Central unit definitions for the Unit Converter.
 *
 * Multiplicative categories convert via a single base unit:
 * - Length → metre (m)
 * - Weight → kilogram (kg)  [UI label: Weight; quantities are mass]
 * - Volume → litre (L)
 * - Area → square metre (m²)
 * - Speed → metre per second (m/s)
 *
 * Temperature uses explicit formulas in `unit-converter.ts` (via Kelvin).
 */

export type UnitCategory =
  | "length"
  | "weight"
  | "temperature"
  | "volume"
  | "area"
  | "speed";

export type MultiplicativeCategory = Exclude<UnitCategory, "temperature">;

export type UnitDefinition = {
  id: string;
  category: UnitCategory;
  name: string;
  /** Plural form used in conversion statements (e.g. "metres"). */
  namePlural: string;
  symbol: string;
  /**
   * How many base units equal one of this unit.
   * Unused for temperature (formulas handle conversion).
   */
  toBase: number;
  aliases?: readonly string[];
};

export type CategoryMeta = {
  id: UnitCategory;
  label: string;
  description: string;
  defaultFromId: string;
  defaultToId: string;
  /** Default amount shown when the tool loads / resets. */
  defaultAmount: string;
};

export const CATEGORY_META: readonly CategoryMeta[] = [
  {
    id: "length",
    label: "Length",
    description: "Metres, feet, miles, and more",
    defaultFromId: "m",
    defaultToId: "ft",
    defaultAmount: "1",
  },
  {
    id: "weight",
    label: "Weight",
    description: "Kilograms, pounds, ounces, and more",
    defaultFromId: "kg",
    defaultToId: "lb",
    defaultAmount: "1",
  },
  {
    id: "temperature",
    label: "Temperature",
    description: "Celsius, Fahrenheit, and Kelvin",
    defaultFromId: "celsius",
    defaultToId: "fahrenheit",
    defaultAmount: "0",
  },
  {
    id: "volume",
    label: "Volume",
    description: "Litres, US gallons, Imperial pints, and more",
    defaultFromId: "L",
    defaultToId: "us_gal",
    defaultAmount: "1",
  },
  {
    id: "area",
    label: "Area",
    description: "Square metres, square feet, acres, and more",
    defaultFromId: "m2",
    defaultToId: "ft2",
    defaultAmount: "1",
  },
  {
    id: "speed",
    label: "Speed",
    description: "Kilometres per hour, miles per hour, and more",
    defaultFromId: "kmh",
    defaultToId: "mph",
    defaultAmount: "100",
  },
] as const;

/** Absolute-zero floors by temperature unit id. */
export const ABSOLUTE_ZERO: Readonly<Record<string, number>> = {
  celsius: -273.15,
  fahrenheit: -459.67,
  kelvin: 0,
};

/**
 * All supported units. Factors are exact SI-derived constants where possible.
 * Temperature units use `toBase: 1` as a placeholder (formulas are separate).
 */
export const UNITS: readonly UnitDefinition[] = [
  // Length (base: metre)
  {
    id: "mm",
    category: "length",
    name: "Millimetre",
    namePlural: "millimetres",
    symbol: "mm",
    toBase: 0.001,
  },
  {
    id: "cm",
    category: "length",
    name: "Centimetre",
    namePlural: "centimetres",
    symbol: "cm",
    toBase: 0.01,
  },
  {
    id: "m",
    category: "length",
    name: "Metre",
    namePlural: "metres",
    symbol: "m",
    toBase: 1,
  },
  {
    id: "km",
    category: "length",
    name: "Kilometre",
    namePlural: "kilometres",
    symbol: "km",
    toBase: 1000,
  },
  {
    id: "in",
    category: "length",
    name: "Inch",
    namePlural: "inches",
    symbol: "in",
    toBase: 0.0254,
  },
  {
    id: "ft",
    category: "length",
    name: "Foot",
    namePlural: "feet",
    symbol: "ft",
    toBase: 0.3048,
  },
  {
    id: "yd",
    category: "length",
    name: "Yard",
    namePlural: "yards",
    symbol: "yd",
    toBase: 0.9144,
  },
  {
    id: "mi",
    category: "length",
    name: "Mile",
    namePlural: "miles",
    symbol: "mi",
    toBase: 1609.344,
  },

  // Weight / mass (base: kilogram)
  {
    id: "mg",
    category: "weight",
    name: "Milligram",
    namePlural: "milligrams",
    symbol: "mg",
    toBase: 0.000001,
  },
  {
    id: "g",
    category: "weight",
    name: "Gram",
    namePlural: "grams",
    symbol: "g",
    toBase: 0.001,
  },
  {
    id: "kg",
    category: "weight",
    name: "Kilogram",
    namePlural: "kilograms",
    symbol: "kg",
    toBase: 1,
  },
  {
    id: "t",
    category: "weight",
    name: "Metric tonne",
    namePlural: "metric tonnes",
    symbol: "t",
    toBase: 1000,
  },
  {
    id: "oz",
    category: "weight",
    name: "Ounce",
    namePlural: "ounces",
    symbol: "oz",
    toBase: 0.028349523125,
  },
  {
    id: "lb",
    category: "weight",
    name: "Pound",
    namePlural: "pounds",
    symbol: "lb",
    toBase: 0.45359237,
  },
  {
    id: "st",
    category: "weight",
    name: "Stone",
    namePlural: "stones",
    symbol: "st",
    toBase: 6.35029318,
  },

  // Temperature (formulas in unit-converter.ts)
  {
    id: "celsius",
    category: "temperature",
    name: "Celsius",
    namePlural: "Celsius",
    symbol: "°C",
    toBase: 1,
  },
  {
    id: "fahrenheit",
    category: "temperature",
    name: "Fahrenheit",
    namePlural: "Fahrenheit",
    symbol: "°F",
    toBase: 1,
  },
  {
    id: "kelvin",
    category: "temperature",
    name: "Kelvin",
    namePlural: "Kelvin",
    symbol: "K",
    toBase: 1,
  },

  // Volume (base: litre)
  {
    id: "mL",
    category: "volume",
    name: "Millilitre",
    namePlural: "millilitres",
    symbol: "mL",
    toBase: 0.001,
  },
  {
    id: "L",
    category: "volume",
    name: "Litre",
    namePlural: "litres",
    symbol: "L",
    toBase: 1,
  },
  {
    id: "cm3",
    category: "volume",
    name: "Cubic centimetre",
    namePlural: "cubic centimetres",
    symbol: "cm³",
    toBase: 0.001,
  },
  {
    id: "m3",
    category: "volume",
    name: "Cubic metre",
    namePlural: "cubic metres",
    symbol: "m³",
    toBase: 1000,
  },
  {
    id: "us_tsp",
    category: "volume",
    name: "US teaspoon",
    namePlural: "US teaspoons",
    symbol: "US tsp",
    toBase: 0.00492892159375,
  },
  {
    id: "us_tbsp",
    category: "volume",
    name: "US tablespoon",
    namePlural: "US tablespoons",
    symbol: "US tbsp",
    toBase: 0.01478676478125,
  },
  {
    id: "us_floz",
    category: "volume",
    name: "US fluid ounce",
    namePlural: "US fluid ounces",
    symbol: "US fl oz",
    toBase: 0.0295735295625,
  },
  {
    id: "us_cup",
    category: "volume",
    name: "US cup",
    namePlural: "US cups",
    symbol: "US cup",
    toBase: 0.2365882365,
  },
  {
    id: "us_pt",
    category: "volume",
    name: "US pint",
    namePlural: "US pints",
    symbol: "US pt",
    toBase: 0.473176473,
  },
  {
    id: "us_qt",
    category: "volume",
    name: "US quart",
    namePlural: "US quarts",
    symbol: "US qt",
    toBase: 0.946352946,
  },
  {
    id: "us_gal",
    category: "volume",
    name: "US gallon",
    namePlural: "US gallons",
    symbol: "US gal",
    toBase: 3.785411784,
  },
  {
    id: "imp_floz",
    category: "volume",
    name: "Imperial fluid ounce",
    namePlural: "Imperial fluid ounces",
    symbol: "Imp fl oz",
    toBase: 0.0284130625,
  },
  {
    id: "imp_pt",
    category: "volume",
    name: "Imperial pint",
    namePlural: "Imperial pints",
    symbol: "Imp pt",
    toBase: 0.56826125,
  },
  {
    id: "imp_gal",
    category: "volume",
    name: "Imperial gallon",
    namePlural: "Imperial gallons",
    symbol: "Imp gal",
    toBase: 4.54609,
  },

  // Area (base: square metre)
  {
    id: "mm2",
    category: "area",
    name: "Square millimetre",
    namePlural: "square millimetres",
    symbol: "mm²",
    toBase: 0.000001,
  },
  {
    id: "cm2",
    category: "area",
    name: "Square centimetre",
    namePlural: "square centimetres",
    symbol: "cm²",
    toBase: 0.0001,
  },
  {
    id: "m2",
    category: "area",
    name: "Square metre",
    namePlural: "square metres",
    symbol: "m²",
    toBase: 1,
  },
  {
    id: "km2",
    category: "area",
    name: "Square kilometre",
    namePlural: "square kilometres",
    symbol: "km²",
    toBase: 1_000_000,
  },
  {
    id: "in2",
    category: "area",
    name: "Square inch",
    namePlural: "square inches",
    symbol: "in²",
    toBase: 0.00064516,
  },
  {
    id: "ft2",
    category: "area",
    name: "Square foot",
    namePlural: "square feet",
    symbol: "ft²",
    toBase: 0.09290304,
  },
  {
    id: "yd2",
    category: "area",
    name: "Square yard",
    namePlural: "square yards",
    symbol: "yd²",
    toBase: 0.83612736,
  },
  {
    id: "ac",
    category: "area",
    name: "Acre",
    namePlural: "acres",
    symbol: "ac",
    toBase: 4046.8564224,
  },
  {
    id: "ha",
    category: "area",
    name: "Hectare",
    namePlural: "hectares",
    symbol: "ha",
    toBase: 10_000,
  },
  {
    id: "mi2",
    category: "area",
    name: "Square mile",
    namePlural: "square miles",
    symbol: "mi²",
    toBase: 2_589_988.110336,
  },

  // Speed (base: metre per second)
  {
    id: "mps",
    category: "speed",
    name: "Metre per second",
    namePlural: "metres per second",
    symbol: "m/s",
    toBase: 1,
  },
  {
    id: "kmh",
    category: "speed",
    name: "Kilometre per hour",
    namePlural: "kilometres per hour",
    symbol: "km/h",
    toBase: 1 / 3.6,
  },
  {
    id: "mph",
    category: "speed",
    name: "Mile per hour",
    namePlural: "miles per hour",
    symbol: "mph",
    toBase: 0.44704,
  },
  {
    id: "fps",
    category: "speed",
    name: "Foot per second",
    namePlural: "feet per second",
    symbol: "ft/s",
    toBase: 0.3048,
  },
  {
    id: "kn",
    category: "speed",
    name: "Knot",
    namePlural: "knots",
    symbol: "kn",
    toBase: 0.5144444444444445,
  },
] as const;

const UNIT_BY_ID = new Map(UNITS.map((unit) => [unit.id, unit]));

export function getCategoryMeta(category: UnitCategory): CategoryMeta {
  const meta = CATEGORY_META.find((item) => item.id === category);
  if (!meta) {
    throw new Error(`Unknown category: ${category}`);
  }
  return meta;
}

export function getUnitsForCategory(category: UnitCategory): UnitDefinition[] {
  return UNITS.filter((unit) => unit.category === category);
}

export function getUnitById(id: string): UnitDefinition | undefined {
  return UNIT_BY_ID.get(id);
}

export function requireUnitById(id: string): UnitDefinition {
  const unit = getUnitById(id);
  if (!unit) {
    throw new Error(`Unknown unit id: ${id}`);
  }
  return unit;
}

export function isTemperatureCategory(
  category: UnitCategory,
): category is "temperature" {
  return category === "temperature";
}

/** Option label for selects — full name plus symbol. */
export function formatUnitOptionLabel(unit: UnitDefinition): string {
  return `${unit.name} (${unit.symbol})`;
}
