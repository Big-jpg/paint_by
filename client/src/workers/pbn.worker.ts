/**
 * client/src/workers/pbn.worker.ts
 * Web Worker that runs the paint-by-numbers engine
 * Generates both filled SVG and outline-only SVG
 */

import {
  runEngine,
  generateSVGWithOptions,
  getPhaseForStep,
} from "../lib/pbn-engine/engine";
import { Settings } from "../lib/pbn-engine/settings";
import type {
  EngineInput,
  EngineProgress,
} from "../lib/pbn-engine/engine/types";

export interface WorkerStartMessage {
  type: "start";
  imageData: ImageData;
  settings: {
    kMeansNrOfClusters: number;
    removeFacetsSmallerThanNrOfPoints: number;
    sizeMultiplier: number;
    outputWidthMm: number;
    outputHeightMm: number;
  };
}

export interface WorkerCancelMessage {
  type: "cancel";
}

export type WorkerInMessage = WorkerStartMessage | WorkerCancelMessage;

export interface WorkerProgressMessage {
  type: "progress";
  progress: EngineProgress;
}

export interface WorkerDoneMessage {
  type: "done";
  svgText: string;
  outlineSvgText: string;
  colorsByIndex: number[][];
}

export interface WorkerErrorMessage {
  type: "error";
  error: string;
}

export type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerDoneMessage
  | WorkerErrorMessage;

let currentAbortController: AbortController | null = null;

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case "start":
      await handleStart(message);
      break;
    case "cancel":
      handleCancel();
      break;
  }
};

async function handleStart(message: WorkerStartMessage) {
  if (currentAbortController) {
    currentAbortController.abort();
  }

  currentAbortController = new AbortController();

  try {
    const settings = new Settings();
    settings.kMeansNrOfClusters = message.settings.kMeansNrOfClusters;
    settings.removeFacetsSmallerThanNrOfPoints =
      message.settings.removeFacetsSmallerThanNrOfPoints;
    settings.sizeMultiplier = message.settings.sizeMultiplier;
    settings.outputWidthMm = message.settings.outputWidthMm;
    settings.outputHeightMm = message.settings.outputHeightMm;

    const input: EngineInput = {
      imageData: message.imageData,
      settings,
      signal: currentAbortController.signal,
      onProgress: (progress: EngineProgress) => {
        const outMessage: WorkerProgressMessage = {
          type: "progress",
          progress,
        };
        self.postMessage(outMessage);
      },
    };

    const result = await runEngine(input);

    // Generate outline-only SVG (no fill, borders + labels only)
    postProgress({
      step: "outlineSvg",
      pct: 0,
      phase: getPhaseForStep("outlineSvg"),
      activity: "Preparing printable outline",
      message: "Generating outline SVG",
    });
    const outlineSvgText = await generateSVGWithOptions(
      result.facetResult,
      result.colorsByIndex,
      {
        sizeMultiplier: settings.sizeMultiplier,
        outputWidthMm: settings.outputWidthMm,
        outputHeightMm: settings.outputHeightMm,
        fill: false,
        stroke: true,
        addColorLabels: true,
        fontSize: 50,
        fontColor: "black",
      },
      pct => {
        postProgress({
          step: "outlineSvg",
          pct,
          phase: getPhaseForStep("outlineSvg"),
          activity: "Preparing printable outline",
          message: "Generating outline SVG",
        });
      }
    );
    postProgress({
      step: "outlineSvg",
      pct: 1,
      phase: getPhaseForStep("outlineSvg"),
      activity: "Printable files ready",
      message: "Outline SVG complete",
    });

    const outMessage: WorkerDoneMessage = {
      type: "done",
      svgText: result.svgText || "",
      outlineSvgText,
      colorsByIndex: result.colorsByIndex,
    };
    self.postMessage(outMessage);
  } catch (error) {
    if ((error as Error).message === "Cancelled") {
      return;
    }

    const outMessage: WorkerErrorMessage = {
      type: "error",
      error: (error as Error).message || "Unknown error",
    };
    self.postMessage(outMessage);
  } finally {
    currentAbortController = null;
  }
}

function postProgress(progress: EngineProgress) {
  const outMessage: WorkerProgressMessage = {
    type: "progress",
    progress,
  };
  self.postMessage(outMessage);
}

function handleCancel() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}
