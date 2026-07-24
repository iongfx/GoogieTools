/**
 * Client-side PDF export for colour-cycle swatches and values.
 */

import { jsPDF } from "jspdf";
import { BRAND, SITE_URL } from "@/config/brand";
import { COLOUR_TOOL } from "@/config/tools";
import {
  formatColourExport,
  type ColourExportChoice,
} from "@/lib/colour-formatting";
import { downloadBlob } from "@/lib/qr";
import type { RgbColour } from "@/lib/colour-types";

export type ColourCyclePdfItem = {
  label: string;
  rgb: RgbColour;
};

const TOOL_TITLE = "Free Colour Screen & Pixel Tester";
const TOOL_PAGE_URL = `${SITE_URL}${COLOUR_TOOL.href}`;
const LOGO_PATH = "/brand/googie-tools-logo.png";

function choiceLabel(choice: ColourExportChoice): string {
  if (choice === "all") return "All colour values";
  if (choice === "hsv") return "HSV/HSB";
  return choice.toUpperCase();
}

async function loadBrandLogoDataUrl(): Promise<string> {
  const response = await fetch(LOGO_PATH);
  if (!response.ok) {
    throw new Error("Could not load the Googie Tools logo for the PDF.");
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the logo image."));
    reader.readAsDataURL(blob);
  });
}

function measureColourBlockHeight(
  lines: string[],
  swatchSize: number,
): number {
  const textBlockHeight = 6 + lines.length * 4.6;
  return Math.max(swatchSize, textBlockHeight) + 10;
}

function drawColourBlock(
  doc: jsPDF,
  item: ColourCyclePdfItem,
  index: number,
  choice: ColourExportChoice,
  x: number,
  y: number,
  columnWidth: number,
  swatchSize: number,
): number {
  const lines = formatColourExport(item.rgb, choice)
    .split("\n")
    .filter(Boolean);
  const gap = 5;
  const maxTextWidth = columnWidth - swatchSize - gap;
  const blockHeight = measureColourBlockHeight(lines, swatchSize);

  const r = Math.round(item.rgb.r);
  const g = Math.round(item.rgb.g);
  const b = Math.round(item.rgb.b);

  doc.setFillColor(r, g, b);
  doc.roundedRect(x, y, swatchSize, swatchSize, 2, 2, "F");
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, swatchSize, swatchSize, 2, 2, "S");

  const textX = x + swatchSize + gap;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  const title = `Colour ${index + 1}: ${item.label}`;
  doc.text(doc.splitTextToSize(title, maxTextWidth), textX, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(45);
  lines.forEach((line, lineIndex) => {
    doc.text(
      doc.splitTextToSize(line, maxTextWidth),
      textX,
      y + 10 + lineIndex * 4.6,
    );
  });

  return blockHeight;
}

/**
 * Build and download a PDF of cycle colours with brand header,
 * swatches, and requested values in two columns.
 */
export async function downloadColourCyclePdf(
  items: readonly ColourCyclePdfItem[],
  choice: ColourExportChoice,
): Promise<void> {
  const logoDataUrl = await loadBrandLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const swatchSize = 16;
  const colGap = 8;
  const colWidth = (contentWidth - colGap) / 2;
  let y = margin;

  // Brand logo (300×58 source) — keep aspect ratio.
  const logoWidth = 62;
  const logoHeight = (58 / 300) * logoWidth;
  doc.addImage(logoDataUrl, "PNG", margin, y, logoWidth, logoHeight);
  y += logoHeight + 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(BRAND.secondaryTagline, margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text(TOOL_TITLE, margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.textWithLink(TOOL_PAGE_URL, margin, y, { url: TOOL_PAGE_URL });
  y += 7;

  doc.setDrawColor(216, 224, 234);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    `Colour cycle export · ${choiceLabel(choice)} · ${items.length} colour${items.length === 1 ? "" : "s"}`,
    margin,
    y,
  );
  y += 8;

  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    const leftLines = formatColourExport(left.rgb, choice)
      .split("\n")
      .filter(Boolean);
    const rightLines = right
      ? formatColourExport(right.rgb, choice).split("\n").filter(Boolean)
      : [];
    const rowHeight = Math.max(
      measureColourBlockHeight(leftLines, swatchSize),
      right ? measureColourBlockHeight(rightLines, swatchSize) : 0,
    );

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    drawColourBlock(
      doc,
      left,
      i,
      choice,
      margin,
      y,
      colWidth,
      swatchSize,
    );
    if (right) {
      drawColourBlock(
        doc,
        right,
        i + 1,
        choice,
        margin + colWidth + colGap,
        y,
        colWidth,
        swatchSize,
      );
    }

    y += rowHeight;
  }

  const suffix = choice === "all" ? "all" : choice;
  const blob = doc.output("blob");
  downloadBlob(`colour-cycle-${suffix}.pdf`, blob);
}
