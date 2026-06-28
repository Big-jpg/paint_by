/**
 * client/src/components/ResultView.tsx
 * Design: Atelier Mono - SVG preview with download actions
 * Includes: filled SVG, outline SVG, PNG, palette JSON, palette PDF
 */

import { useCallback, useRef, useState } from "react";
import {
  Download,
  RotateCcw,
  Pencil,
  Package,
} from "lucide-react";
import { ColorPalette } from "./ColorPalette";
import { createZipBlob } from "../lib/createZip";
import { createPalettePdfBlob } from "../lib/generatePalettePdf";
import type { PbnResult } from "../hooks/usePbnWorker";

interface ResultViewProps {
  result: PbnResult;
  onReset: () => void;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

export function ResultView({ result, onReset }: ResultViewProps) {
  const [isZipGenerating, setIsZipGenerating] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const activeSvg = showOutline ? result.outlineSvgText : result.svgText;

  const downloadZip = useCallback(async () => {
    setIsZipGenerating(true);
    try {
      const paletteJson = createPaletteJson(result.colorsByIndex);
      const zipBlob = await createZipBlob([
        {
          name: "paint-by-numbers.svg",
          blob: new Blob([result.svgText], {
            type: "image/svg+xml;charset=utf-8",
          }),
        },
        {
          name: "paint-by-numbers-outline.svg",
          blob: new Blob([result.outlineSvgText], {
            type: "image/svg+xml;charset=utf-8",
          }),
        },
        {
          name: "paint-by-numbers.png",
          blob: await createPngBlob(result.svgText),
        },
        {
          name: "pbn-palette.pdf",
          blob: createPalettePdfBlob(result.colorsByIndex),
        },
        {
          name: "palette.json",
          blob: new Blob([paletteJson], { type: "application/json" }),
        },
      ]);
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = "paint-by-numbers-output.zip";
      a.click();
      URL.revokeObjectURL(zipUrl);
    } finally {
      setIsZipGenerating(false);
    }
  }, [result.colorsByIndex, result.outlineSvgText, result.svgText]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOutline(!showOutline)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border transition-all active:scale-[0.97] ${
              showOutline
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/30"
            }`}
            title="Toggle outline-only preview"
          >
            <Pencil className="w-3.5 h-3.5" />
            Outline
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadZip}
            disabled={isZipGenerating}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97] disabled:opacity-50"
            title="Download SVG, outline, PNG, palette PDF, and palette JSON"
          >
            {isZipGenerating ? (
              <Package className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {isZipGenerating ? "Preparing ZIP" : "Download ZIP"}
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New
          </button>
        </div>
      </div>

      {/* SVG preview */}
      <div
        ref={svgContainerRef}
        className="w-full overflow-hidden border border-border bg-muted/20 p-4 sm:p-6"
      >
        <div
          className="mx-auto w-full border border-border bg-white sm:w-1/2 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: activeSvg }}
        />
      </div>

      {/* Color palette */}
      <ColorPalette colorsByIndex={result.colorsByIndex} />
    </div>
  );
}

function createPaletteJson(colorsByIndex: number[][]) {
  const palette = colorsByIndex.map((rgb, i) => ({
    index: i,
    hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
    rgb: { r: rgb[0], g: rgb[1], b: rgb[2] },
  }));

  return JSON.stringify(palette, null, 2);
}

async function createPngBlob(svgText: string): Promise<Blob> {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = svgDoc.documentElement;
  const { width, height } = getSvgPixelSize(svgEl);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create PNG canvas context");
  }

  const img = new Image();
  const svgBlob = new Blob([svgText], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not create PNG blob"));
      }
    }, "image/png");
  });
}

function getSvgPixelSize(svgEl: Element) {
  const viewBox = svgEl.getAttribute("viewBox");
  if (viewBox) {
    const [, , width, height] = viewBox.split(/\s+/).map(Number);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return { width, height };
    }
  }

  return {
    width: parseInt(svgEl.getAttribute("width") || "1024", 10),
    height: parseInt(svgEl.getAttribute("height") || "1024", 10),
  };
}
