/**
 * client/src/components/ColorPalette.tsx
 * Design: Atelier Mono — horizontal Pantone-chip-style numbered swatches
 */

interface ColorPaletteProps {
  colorsByIndex: number[][];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function ColorPalette({ colorsByIndex }: ColorPaletteProps) {
  return (
    <div className="w-full">
      <h3 className="font-mono text-xs text-muted-foreground tracking-wide uppercase mb-3">
        Palette — {colorsByIndex.length} colors
      </h3>
      <div className="flex flex-wrap gap-1">
        {colorsByIndex.map((rgb, index) => {
          const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
          const isLight = luminance(rgb[0], rgb[1], rgb[2]) > 0.55;
          return (
            <div
              key={index}
              className="flex flex-col items-center"
              title={`${index}: ${hex}`}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 border border-border/50 flex items-center justify-center"
                style={{ backgroundColor: hex }}
              >
                <span
                  className={`font-mono text-[10px] font-medium ${isLight ? "text-black/70" : "text-white/80"}`}
                >
                  {index}
                </span>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground mt-0.5">
                {hex}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
