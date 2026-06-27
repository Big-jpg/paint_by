/**
 * client/src/components/SettingsPanel.tsx
 * User-facing artwork controls for palette, treatment, and print format.
 */

import {
  Check,
  ChevronDown,
  Image as ImageIcon,
  Layers,
  Ruler,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { PbnSettings } from "../hooks/usePbnWorker";
import {
  PAGE_ORIENTATIONS,
  PALETTE_SIZES,
  PAPER_SIZES,
  TREATMENT_LABELS,
  TREATMENT_PALETTES,
  type ImageTreatment,
} from "../lib/presets";

interface SettingsPanelProps {
  settings: PbnSettings;
  onChange: (settings: PbnSettings) => void;
  disabled?: boolean;
}

const TREATMENTS: ImageTreatment[] = ["color", "grayscale", "sepia", "sunset"];

export function SettingsPanel({
  settings,
  onChange,
  disabled,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full border border-border">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="font-mono text-xs tracking-wide uppercase text-muted-foreground">
          Artwork setup
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="flex flex-col gap-3">
              <SettingHeader
                icon={<ImageIcon className="w-4 h-4" />}
                title="Image treatment"
              />
              <div className="grid grid-cols-2 gap-2">
                {TREATMENTS.map(treatment => (
                  <button
                    key={treatment}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange({ ...settings, imageTreatment: treatment })
                    }
                    className={`border p-3 text-left transition-all active:scale-[0.98] ${
                      settings.imageTreatment === treatment
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">
                        {TREATMENT_LABELS[treatment]}
                      </span>
                      {settings.imageTreatment === treatment && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <PaletteWheel
                      colors={TREATMENT_PALETTES[treatment]}
                      active={settings.imageTreatment === treatment}
                    />
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <SettingHeader
                icon={<Layers className="w-4 h-4" />}
                title="Palette detail"
              />
              <div className="grid grid-cols-2 gap-2">
                {PALETTE_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...settings, paletteSize: size })}
                    className={`border p-3 transition-all active:scale-[0.98] ${
                      settings.paletteSize === size
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <span className="block font-mono text-lg tabular-nums">
                      {size}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide opacity-70">
                      colours
                    </span>
                    <PaletteStrip
                      colors={TREATMENT_PALETTES[settings.imageTreatment]}
                      count={size}
                    />
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-5 flex flex-col gap-3">
            <SettingHeader
              icon={<Ruler className="w-4 h-4" />}
              title="Print format"
            />
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="grid grid-cols-4 gap-2">
                {PAPER_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...settings, paperSize: size })}
                    className={`border px-3 py-2 font-mono text-xs transition-all active:scale-[0.98] ${
                      settings.paperSize === size
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:w-56">
                {PAGE_ORIENTATIONS.map(orientation => (
                  <button
                    key={orientation}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...settings, orientation })}
                    className={`border px-3 py-2 font-mono text-xs capitalize transition-all active:scale-[0.98] ${
                      settings.orientation === orientation
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    {orientation}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SettingHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <h3 className="font-mono text-xs uppercase tracking-wide">{title}</h3>
    </div>
  );
}

function PaletteWheel({
  colors,
  active,
}: {
  colors: string[];
  active: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5 w-20">
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className={`block h-5 w-5 border ${active ? "border-background/30" : "border-border/60"} ${
            index === 1 || index === 4 ? "translate-y-3" : ""
          }`}
          style={{
            backgroundColor: color,
            clipPath:
              "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)",
          }}
        />
      ))}
    </div>
  );
}

function PaletteStrip({ colors, count }: { colors: string[]; count: number }) {
  const repeats = Array.from(
    { length: Math.min(count, 14) },
    (_, i) => colors[i % colors.length]
  );

  return (
    <div className="mt-3 flex h-1.5 overflow-hidden">
      {repeats.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
