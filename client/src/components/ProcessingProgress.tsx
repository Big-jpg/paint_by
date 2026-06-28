/**
 * client/src/components/ProcessingProgress.tsx
 * Design: Atelier Mono — oversized step counter + clean progress bar
 */

import type { EngineProgress } from "../lib/pbn-engine/engine/types";

interface ProcessingProgressProps {
  progress: EngineProgress | null;
  overallProgress: number;
  elapsedMs: number;
  isQuiet: boolean;
  onCancel: () => void;
}

const PHASE_LABELS = {
  prepare: "Preparing image",
  regions: "Building numbered regions",
  export: "Creating printable artwork",
};

const PHASE_ORDER = ["prepare", "regions", "export"] as const;

export function ProcessingProgress({
  progress,
  overallProgress,
  elapsedMs,
  isQuiet,
  onCancel,
}: ProcessingProgressProps) {
  const phase = progress?.phase ?? "prepare";
  const phaseIndex = PHASE_ORDER.indexOf(phase) + 1;
  const phaseLabel = PHASE_LABELS[phase];
  const activity = isQuiet
    ? "Still working through a detailed image"
    : progress?.activity ?? "Starting local processing";
  const pct = Math.round(overallProgress * 100);
  const stats = progress?.stats;
  const showFacetStats =
    stats?.initialFacetCount != null && stats?.currentFacetCount != null;

  return (
    <div className="w-full py-12 sm:py-16 flex flex-col items-center gap-7">
      <div className="w-full max-w-md">
        <div className="grid grid-cols-3 gap-2">
          {PHASE_ORDER.map((phaseKey, index) => {
            const isComplete = index + 1 < phaseIndex;
            const isCurrent = phaseKey === phase;

            return (
              <div
                key={phaseKey}
                className="flex flex-col gap-2"
                aria-current={isCurrent ? "step" : undefined}
              >
                <div
                  className={`h-1 w-full overflow-hidden bg-border ${
                    isCurrent && isQuiet ? "animate-pulse" : ""
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      isComplete || isCurrent ? "bg-foreground" : "bg-transparent"
                    }`}
                    style={{ width: isComplete ? "100%" : isCurrent ? "70%" : "0%" }}
                  />
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wide leading-tight ${
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {PHASE_LABELS[phaseKey]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-xl sm:text-2xl text-foreground">
          {phaseLabel}
        </p>
        <p className="min-h-5 font-mono text-xs sm:text-sm text-muted-foreground tracking-wide">
          {activity}
        </p>
        {showFacetStats && (
          <p className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
            {stats.currentFacetCount?.toLocaleString()} regions active
            {stats.removedFacetCount != null
              ? `, ${stats.removedFacetCount.toLocaleString()} merged`
              : ""}
          </p>
        )}
      </div>

      <div className="w-full max-w-md">
        <div className={`h-1 w-full bg-border overflow-hidden ${isQuiet ? "animate-pulse" : ""}`}>
          <div
            className="h-full bg-foreground transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {pct}% · {formatElapsed(elapsedMs)}
          </span>
          <button
            onClick={onCancel}
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
