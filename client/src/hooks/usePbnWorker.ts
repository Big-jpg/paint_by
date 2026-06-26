/**
 * client/src/hooks/usePbnWorker.ts
 * React hook for managing the PBN Web Worker lifecycle
 */

import { useCallback, useRef, useState } from "react";
import type { EngineProgress } from "../lib/pbn-engine/engine/types";
import type {
  WorkerDoneMessage,
  WorkerErrorMessage,
  WorkerOutMessage,
  WorkerProgressMessage,
} from "../workers/pbn.worker";

export type PbnStatus = "idle" | "processing" | "done" | "error";

export interface PbnSettings {
  kMeansNrOfClusters: number;
  removeFacetsSmallerThanNrOfPoints: number;
  sizeMultiplier: number;
}

export interface PbnResult {
  svgText: string;
  outlineSvgText: string;
  colorsByIndex: number[][];
}

const DEFAULT_SETTINGS: PbnSettings = {
  kMeansNrOfClusters: 16,
  removeFacetsSmallerThanNrOfPoints: 20,
  sizeMultiplier: 3,
};

// Step weights for overall progress calculation
const STEP_WEIGHTS: Record<string, { start: number; weight: number }> = {
  kmeans: { start: 0, weight: 0.35 },
  colormap: { start: 0.35, weight: 0.02 },
  facetBuild: { start: 0.37, weight: 0.2 },
  facetReduce: { start: 0.57, weight: 0.15 },
  borderTrace: { start: 0.72, weight: 0.1 },
  borderSegment: { start: 0.82, weight: 0.08 },
  labelPlace: { start: 0.9, weight: 0.05 },
  svg: { start: 0.95, weight: 0.05 },
};

export function usePbnWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<PbnStatus>("idle");
  const [progress, setProgress] = useState<EngineProgress | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [result, setResult] = useState<PbnResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    (imageData: ImageData, settings: PbnSettings = DEFAULT_SETTINGS) => {
      // Terminate previous worker if any
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      setStatus("processing");
      setProgress(null);
      setOverallProgress(0);
      setResult(null);
      setError(null);

      const worker = new Worker(
        new URL("../workers/pbn.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        const msg = event.data;

        switch (msg.type) {
          case "progress": {
            const p = (msg as WorkerProgressMessage).progress;
            setProgress(p);
            // Calculate overall progress
            const stepInfo = STEP_WEIGHTS[p.step];
            if (stepInfo) {
              const overall = stepInfo.start + stepInfo.weight * p.pct;
              setOverallProgress(Math.min(overall, 1));
            }
            break;
          }
          case "done": {
            const d = msg as WorkerDoneMessage;
            setResult({ svgText: d.svgText, outlineSvgText: d.outlineSvgText, colorsByIndex: d.colorsByIndex });
            setStatus("done");
            setOverallProgress(1);
            worker.terminate();
            workerRef.current = null;
            break;
          }
          case "error": {
            const e = msg as WorkerErrorMessage;
            setError(e.error);
            setStatus("error");
            worker.terminate();
            workerRef.current = null;
            break;
          }
        }
      };

      worker.onerror = (e) => {
        setError(e.message || "Worker error");
        setStatus("error");
        worker.terminate();
        workerRef.current = null;
      };

      // Send start message
      worker.postMessage({
        type: "start",
        imageData,
        settings: {
          kMeansNrOfClusters: settings.kMeansNrOfClusters,
          removeFacetsSmallerThanNrOfPoints: settings.removeFacetsSmallerThanNrOfPoints,
          sizeMultiplier: settings.sizeMultiplier,
        },
      });
    },
    []
  );

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "cancel" });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setStatus("idle");
    setProgress(null);
    setOverallProgress(0);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setResult(null);
    setError(null);
  }, [cancel]);

  return {
    status,
    progress,
    overallProgress,
    result,
    error,
    process,
    cancel,
    reset,
  };
}
