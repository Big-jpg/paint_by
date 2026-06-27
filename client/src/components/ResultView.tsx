/**
 * client/src/components/ResultView.tsx
 * Design: Atelier Mono - SVG preview with download actions
 * Includes: filled SVG, outline SVG, PNG, palette JSON, palette PDF
 */

import { useCallback, useRef, useState } from "react";
import {
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FileText,
  Pencil,
} from "lucide-react";
import { ColorPalette } from "./ColorPalette";
import { generatePalettePdf } from "../lib/generatePalettePdf";
import type { PbnResult } from "../hooks/usePbnWorker";

interface ResultViewProps {
  result: PbnResult;
  onReset: () => void;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

export function ResultView({ result, onReset }: ResultViewProps) {
  const [zoom, setZoom] = useState(1);
  const [isPngGenerating, setIsPngGenerating] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const activeSvg = showOutline ? result.outlineSvgText : result.svgText;

  const downloadSvg = useCallback(() => {
    const blob = new Blob([result.svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paint-by-numbers.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, [result.svgText]);

  const downloadOutlineSvg = useCallback(() => {
    const blob = new Blob([result.outlineSvgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paint-by-numbers-outline.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, [result.outlineSvgText]);

  const downloadPng = useCallback(async () => {
    setIsPngGenerating(true);
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(result.svgText, "image/svg+xml");
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
      const svgBlob = new Blob([result.svgText], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

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

      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "paint-by-numbers.png";
      a.click();
    } finally {
      setIsPngGenerating(false);
    }
  }, [result.svgText]);

  const downloadPaletteJson = useCallback(() => {
    const palette = result.colorsByIndex.map((rgb, i) => ({
      index: i,
      hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
      rgb: { r: rgb[0], g: rgb[1], b: rgb[2] },
    }));
    const json = JSON.stringify(palette, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "palette.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [result.colorsByIndex]);

  const downloadPalettePdf = useCallback(() => {
    generatePalettePdf(result.colorsByIndex);
  }, [result.colorsByIndex]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="p-2 border border-border hover:bg-muted/50 transition-colors active:scale-[0.97]"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-muted-foreground tabular-nums w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="p-2 border border-border hover:bg-muted/50 transition-colors active:scale-[0.97]"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-2" />
          {/* Toggle outline/filled preview */}
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
            onClick={downloadSvg}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
            title="Download filled SVG"
          >
            <Download className="w-3.5 h-3.5" />
            SVG
          </button>
          <button
            onClick={downloadOutlineSvg}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
            title="Download outline-only SVG (for printing)"
          >
            <Pencil className="w-3.5 h-3.5" />
            Outline
          </button>
          <button
            onClick={downloadPng}
            disabled={isPngGenerating}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            PNG
          </button>
          <button
            onClick={downloadPalettePdf}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
            title="Download printable PDF palette sheet"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            onClick={downloadPaletteJson}
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
            title="Download palette as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
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
        className="w-full overflow-auto border border-border bg-white"
        style={{ maxHeight: "60vh" }}
      >
        <div
          className="inline-block origin-top-left"
          style={{ transform: `scale(${zoom})` }}
          dangerouslySetInnerHTML={{ __html: activeSvg }}
        />
      </div>

      {/* Color palette */}
      <ColorPalette colorsByIndex={result.colorsByIndex} />
    </div>
  );
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
