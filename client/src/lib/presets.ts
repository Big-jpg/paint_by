export type ImageTreatment = "color" | "grayscale" | "sepia" | "sunset";
export type PaletteSize = 7 | 14 | 21 | 28;
export type PaperSize = "A4" | "A3" | "A2" | "A1";
export type PageOrientation = "landscape" | "portrait";

export const TREATMENT_LABELS: Record<ImageTreatment, string> = {
  color: "Colour",
  grayscale: "Grayscale",
  sepia: "Sepia",
  sunset: "Sunset",
};

export const TREATMENT_PALETTES: Record<ImageTreatment, string[]> = {
  color: [
    "#1f5fbf",
    "#65b5d8",
    "#f7f7f2",
    "#d9ad5d",
    "#98150c",
    "#556856",
    "#151b1a",
  ],
  grayscale: [
    "#0f0f0f",
    "#333333",
    "#5c5c5c",
    "#858585",
    "#adadad",
    "#d6d6d6",
    "#f7f7f7",
  ],
  sepia: [
    "#22170e",
    "#4b3321",
    "#7a5636",
    "#a77a4d",
    "#c99f6d",
    "#e5c999",
    "#f7ead0",
  ],
  sunset: [
    "#17162d",
    "#2d3d78",
    "#1967a6",
    "#e15f3f",
    "#f19a3e",
    "#f4c35f",
    "#f8ead2",
  ],
};

export const PALETTE_SIZES: PaletteSize[] = [7, 14, 21, 28];
export const PAPER_SIZES: PaperSize[] = ["A4", "A3", "A2", "A1"];
export const PAGE_ORIENTATIONS: PageOrientation[] = ["landscape", "portrait"];

export const PAPER_DIMENSIONS_MM: Record<
  PaperSize,
  { width: number; height: number }
> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
};

export function getPageSizeMm(
  paperSize: PaperSize,
  orientation: PageOrientation
) {
  const size = PAPER_DIMENSIONS_MM[paperSize];

  if (orientation === "landscape") {
    return {
      widthMm: Math.max(size.width, size.height),
      heightMm: Math.min(size.width, size.height),
    };
  }

  return {
    widthMm: Math.min(size.width, size.height),
    heightMm: Math.max(size.width, size.height),
  };
}
