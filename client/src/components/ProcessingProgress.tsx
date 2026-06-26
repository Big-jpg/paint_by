/**
 * client/src/components/ProcessingProgress.tsx
 * Design: Atelier Mono — oversized step counter + clean progress bar
 */

import type { EngineProgress } from "../lib/pbn-engine/engine/types";

interface ProcessingProgressProps {
  progress: EngineProgress | null;
  overallProgress: number;
  onCancel: () => void;
}

const STEP_LABELS: Record<string, string> = {
  kmeans: "Color clustering",
  colormap: "Building color map",
  facetBuild: "Building facets",
  facetReduce: "Reducing facets",
  borderTrace: "Tracing borders",
  borderSegment: "Segmenting borders",
  labelPlace: "Placing labels",
  svg: "Generating SVG",
};

const STEP_ORDER = [
  "kmeans",
  "colormap",
  "facetBuild",
  "facetReduce",
  "borderTrace",
  "borderSegment",
  "labelPlace",
  "svg",
];

export function ProcessingProgress({
  progress,
  overallProgress,
  onCancel,
}: ProcessingProgressProps) {
  const currentStepIndex = progress
    ? STEP_ORDER.indexOf(progress.step) + 1
    : 1;
  const totalSteps = STEP_ORDER.length;
  const stepLabel = progress ? STEP_LABELS[progress.step] || progress.step : "Initializing";
  const pct = Math.round(overallProgress * 100);

  return (
    <div className="w-full py-16 flex flex-col items-center gap-8">
      {/* Large step counter */}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-5xl font-medium text-foreground tabular-nums">
          {currentStepIndex}
        </span>
        <span className="font-mono text-lg text-muted-foreground">/</span>
        <span className="font-mono text-lg text-muted-foreground">
          {totalSteps}
        </span>
      </div>

      {/* Step label */}
      <p className="font-mono text-sm text-muted-foreground tracking-wide">
        {stepLabel}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="h-1 w-full bg-border overflow-hidden">
          <div
            className="h-full bg-foreground transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {pct}%
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
