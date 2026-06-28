/**
 * client/src/hooks/usePbnWorker.ts
 * React hook for managing the PBN Web Worker lifecycle
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineProgress } from "../lib/pbn-engine/engine/types";
import type {
  ImageTreatment,
  PageOrientation,
  PaletteSize,
  PaperSize,
} from "../lib/presets";
import { getPageSizeMm } from "../lib/presets";
import type {
  WorkerDoneMessage,
  WorkerErrorMessage,
  WorkerOutMessage,
  WorkerProgressMessage,
} from "../workers/pbn.worker";

export type PbnStatus = "idle" | "processing" | "done" | "error";

export interface PbnSettings {
  imageTreatment: ImageTreatment;
  paletteSize: PaletteSize;
  paperSize: PaperSize;
  orientation: PageOrientation;
}

export interface PbnResult {
  svgText: string;
  outlineSvgText: string;
  colorsByIndex: number[][];
}

const DEFAULT_SETTINGS: PbnSettings = {
  imageTreatment: "color",
  paletteSize: 14,
  paperSize: "A1",
  orientation: "landscape",
};

// Step weights for overall progress calculation
const STEP_WEIGHTS: Record<string, { start: number; weight: number }> = {
  kmeans: { start: 0, weight: 0.2 },
  colormap: { start: 0.2, weight: 0.03 },
  facetBuild: { start: 0.23, weight: 0.2 },
  facetReduce: { start: 0.43, weight: 0.34 },
  borderTrace: { start: 0.77, weight: 0.08 },
  borderSegment: { start: 0.85, weight: 0.05 },
  labelPlace: { start: 0.9, weight: 0.04 },
  svg: { start: 0.94, weight: 0.04 },
  outlineSvg: { start: 0.98, weight: 0.02 },
};

const QUIET_THRESHOLD_MS = 3500;

export function usePbnWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<PbnStatus>("idle");
  const [progress, setProgress] = useState<EngineProgress | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [result, setResult] = useState<PbnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastProgressAt, setLastProgressAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== "processing") return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status]);

  const elapsedMs =
    status === "processing" && startedAt != null ? now - startedAt : 0;
  const isQuiet =
    status === "processing" &&
    lastProgressAt != null &&
    now - lastProgressAt > QUIET_THRESHOLD_MS;

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
      const started = Date.now();
      setStartedAt(started);
      setLastProgressAt(started);
      setNow(started);

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
            const receivedAt = Date.now();
            setProgress(p);
            setLastProgressAt(receivedAt);
            setNow(receivedAt);
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
            setResult({
              svgText: d.svgText,
              outlineSvgText: d.outlineSvgText,
              colorsByIndex: d.colorsByIndex,
            });
            setStatus("done");
            setOverallProgress(1);
            setStartedAt(null);
            setLastProgressAt(null);
            worker.terminate();
            workerRef.current = null;
            break;
          }
          case "error": {
            const e = msg as WorkerErrorMessage;
            setError(e.error);
            setStatus("error");
            setStartedAt(null);
            setLastProgressAt(null);
            worker.terminate();
            workerRef.current = null;
            break;
          }
        }
      };

      worker.onerror = e => {
        setError(e.message || "Worker error");
        setStatus("error");
        setStartedAt(null);
        setLastProgressAt(null);
        worker.terminate();
        workerRef.current = null;
      };

      // Send start message
      const pageSize = getPageSizeMm(settings.paperSize, settings.orientation);
      worker.postMessage({
        type: "start",
        imageData,
        settings: {
          kMeansNrOfClusters: settings.paletteSize,
          removeFacetsSmallerThanNrOfPoints: 20,
          sizeMultiplier: 3,
          outputWidthMm: pageSize.widthMm,
          outputHeightMm: pageSize.heightMm,
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
    setStartedAt(null);
    setLastProgressAt(null);
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
    elapsedMs,
    isQuiet,
    process,
    cancel,
    reset,
  };
}
