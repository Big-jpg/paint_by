/**
 * src/engine/types.ts
 * Type definitions for the paint-by-numbers engine
 */

import { Settings } from "../settings";
import { RGB } from "../common";
import { FacetResult } from "../facetmanagement";

/**
 * Steps in the engine processing pipeline
 */
export type EngineStep =
  | "kmeans"
  | "colormap"
  | "facetBuild"
  | "facetReduce"
  | "borderTrace"
  | "borderSegment"
  | "labelPlace"
  | "svg"
  | "outlineSvg";

export type EnginePhase = "prepare" | "regions" | "export";

export type EngineProgressStats = {
  initialFacetCount?: number;
  currentFacetCount?: number;
  removedFacetCount?: number;
};

/**
 * Progress information emitted during engine processing
 */
export type EngineProgress = {
  step: EngineStep;
  pct: number; // 0..1
  phase?: EnginePhase;
  activity?: string;
  message?: string;
  stats?: EngineProgressStats;
};

/**
 * Input configuration for the engine
 */
export type EngineInput = {
  imageData: ImageData;
  settings: Settings;
  signal?: AbortSignal;
  onProgress?: (p: EngineProgress) => void;
};

/**
 * Result returned by the engine after processing
 */
export type EngineResult = {
  facetResult: FacetResult;
  colorsByIndex: RGB[];
  // SVG text output (generated without DOM dependency)
  svgText?: string;
  // Optional preview ImageData snapshots for UI preview tabs
  previews?: Partial<Record<
    "kmeans" | "reduced" | "borders" | "labels",
    ImageData
  >>;
};
