/**
 * client/src/lib/generatePalettePdf.ts
 * Generates a printable PDF palette reference sheet using jsPDF
 */

import { jsPDF } from "jspdf";

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function generatePalettePdf(colorsByIndex: number[][]): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const usableWidth = pageWidth - 2 * margin;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Paint by Numbers — Color Palette", margin, margin + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`${colorsByIndex.length} colors`, margin, margin + 14);
  doc.setTextColor(0, 0, 0);

  // Grid layout
  const cols = 4;
  const swatchWidth = (usableWidth - (cols - 1) * 4) / cols;
  const swatchHeight = 18;
  const rowGap = 6;
  const colGap = 4;

  let startY = margin + 22;
  let currentY = startY;

  colorsByIndex.forEach((rgb, index) => {
    const col = index % cols;
    const x = margin + col * (swatchWidth + colGap);

    // Check if we need a new page
    if (currentY + swatchHeight + rowGap > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }

    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    const isLight = luminance(rgb[0], rgb[1], rgb[2]) > 0.55;

    // Draw swatch rectangle
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(x, currentY, swatchWidth, swatchHeight, "FD");

    // Number inside swatch
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    if (isLight) {
      doc.setTextColor(30, 30, 30);
    } else {
      doc.setTextColor(255, 255, 255);
    }
    doc.text(String(index), x + 3, currentY + swatchHeight / 2 + 2);

    // Color info below swatch
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(hex.toUpperCase(), x + 3, currentY + swatchHeight + 3.5);
    doc.text(`RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`, x + 3, currentY + swatchHeight + 7);

    // Move to next row after last column
    if (col === cols - 1) {
      currentY += swatchHeight + rowGap + 8;
    }
  });

  doc.save("pbn-palette.pdf");
}
