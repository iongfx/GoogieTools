/**
 * Curated color styles that keep strong contrast for reliable scanning.
 */

export type QrColorStyleId =
  | "classic"
  | "ocean"
  | "forest"
  | "slate"
  | "ink";

export type QrColorStyle = {
  id: QrColorStyleId;
  label: string;
  dark: string;
  light: string;
};

export const QR_COLOR_STYLES: QrColorStyle[] = [
  {
    id: "classic",
    label: "Classic",
    dark: "#0f172a",
    light: "#ffffff",
  },
  {
    id: "ocean",
    label: "Ocean",
    dark: "#1e3a8a",
    light: "#eff6ff",
  },
  {
    id: "forest",
    label: "Forest",
    dark: "#14532d",
    light: "#f0fdf4",
  },
  {
    id: "slate",
    label: "Slate",
    dark: "#334155",
    light: "#f8fafc",
  },
  {
    id: "ink",
    label: "Ink",
    dark: "#000000",
    light: "#ffffff",
  },
];

export const DEFAULT_COLOR_STYLE_ID: QrColorStyleId = "classic";

export function isColorStyleId(value: string): value is QrColorStyleId {
  return QR_COLOR_STYLES.some((style) => style.id === value);
}

export function getColorStyle(id: string): QrColorStyle {
  return (
    QR_COLOR_STYLES.find((style) => style.id === id) ?? QR_COLOR_STYLES[0]
  );
}
