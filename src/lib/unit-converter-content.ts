import type { FaqItem } from "@/types";

/** Content for the Unit Converter tool page. */

export const UNIT_TOOL_HOW_TO = [
  {
    title: "Choose a category",
    description:
      "Select length, weight, temperature, volume, area, or speed.",
  },
  {
    title: "Enter the amount and units",
    description:
      "Choose what you are converting from and what you want to convert to.",
  },
  {
    title: "View and copy the result",
    description:
      "See the conversion instantly, swap the units, or copy the result.",
  },
] as const;

export const UNIT_TOOL_USE_CASES = [
  {
    title: "Cooking and recipes",
    description:
      "Convert litres, millilitres, cups, tablespoons, and other common volume units.",
  },
  {
    title: "Travel and everyday measurements",
    description:
      "Switch between kilometres and miles, Celsius and Fahrenheit, or kilograms and pounds.",
  },
  {
    title: "Home and project planning",
    description:
      "Convert area, length, and measurement units for rooms, materials, and layouts.",
  },
] as const;

export const UNIT_TOOL_FAQ: FaqItem[] = [
  {
    question: "Is this unit converter free?",
    answer:
      "Yes. You can convert common everyday units without paying or creating an account.",
    showFreeBadge: true,
  },
  {
    question: "Are my conversions stored or uploaded?",
    answer:
      "No. Conversions are calculated in your browser on your device. We do not upload your amounts or selected units to our servers. See our Privacy Policy for full details.",
  },
  {
    question: "How accurate are the conversion results?",
    answer:
      "Results use widely accepted conversion constants and are suitable for everyday use. Displayed values are rounded to reduce floating-point noise. This tool is not intended to replace professional engineering, legal, medical, or laboratory software.",
  },
  {
    question: "What is the difference between US and Imperial gallons?",
    answer:
      "US and Imperial volume units are different systems. One US gallon is about 3.785 litres, while one Imperial gallon is about 4.546 litres. This converter labels them clearly so you can tell them apart.",
  },
  {
    question: "Can I convert Celsius, Fahrenheit, and Kelvin?",
    answer:
      "Yes. Temperature uses its own conversion formulas (via Kelvin) rather than a simple multiply-and-divide factor. Values below absolute zero are rejected with a clear message.",
  },
  {
    question: "Why do some results have several decimal places?",
    answer:
      "Many unit relationships are not neat whole numbers. The converter keeps useful precision and trims unnecessary trailing zeros so results stay readable without claiming false exactness.",
  },
  {
    question: "Can I enter negative numbers?",
    answer:
      "Yes for temperature, where negative values are common. Other categories also accept signed numbers for technical contexts. Temperature values cannot go below absolute zero.",
  },
  {
    question: "Can I use this converter on a phone?",
    answer:
      "Yes. The Unit Converter is built to work on phones, tablets, and desktops in modern browsers.",
  },
];
