/**
 * client/src/components/SettingsPanel.tsx
 * Design: Atelier Mono — collapsible panel with clean sliders
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PbnSettings } from "../hooks/usePbnWorker";

interface SettingsPanelProps {
  settings: PbnSettings;
  onChange: (settings: PbnSettings) => void;
  disabled?: boolean;
}

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full border border-border">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="font-mono text-xs tracking-wide uppercase text-muted-foreground">
          Settings
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 flex flex-col gap-5 border-t border-border pt-4">
          {/* Number of colors */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <label className="text-sm text-foreground">Colors</label>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {settings.kMeansNrOfClusters}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              value={settings.kMeansNrOfClusters}
              onChange={(e) =>
                onChange({ ...settings, kMeansNrOfClusters: Number(e.target.value) })
              }
              disabled={disabled}
              className="w-full h-1 bg-border appearance-none cursor-pointer accent-ochre [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground/50">
              <span>2</span>
              <span>30</span>
            </div>
          </div>

          {/* Min facet size */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <label className="text-sm text-foreground">Min facet size</label>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {settings.removeFacetsSmallerThanNrOfPoints}px
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={settings.removeFacetsSmallerThanNrOfPoints}
              onChange={(e) =>
                onChange({
                  ...settings,
                  removeFacetsSmallerThanNrOfPoints: Number(e.target.value),
                })
              }
              disabled={disabled}
              className="w-full h-1 bg-border appearance-none cursor-pointer accent-ochre [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground/50">
              <span>5</span>
              <span>100</span>
            </div>
          </div>

          {/* SVG size multiplier */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <label className="text-sm text-foreground">SVG scale</label>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {settings.sizeMultiplier}x
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              value={settings.sizeMultiplier}
              onChange={(e) =>
                onChange({ ...settings, sizeMultiplier: Number(e.target.value) })
              }
              disabled={disabled}
              className="w-full h-1 bg-border appearance-none cursor-pointer accent-ochre [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:appearance-none"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground/50">
              <span>1x</span>
              <span>6x</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
