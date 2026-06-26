/**
 * src/worker/engine.worker.ts
 * Web Worker wrapper for the paint-by-numbers engine
 * Enables non-blocking UI by running the engine in a separate thread
 */

import { runEngine, EngineInput, EngineResult, EngineProgress } from "../engine";
import { Settings } from "../settings";

/**
 * Message types for worker communication
 */
export type WorkerMessageType = "start" | "cancel";

export interface WorkerStartMessage {
  type: "start";
  imageData: ImageData;
  settings: Settings;
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
  result: EngineResult;
}

export interface WorkerErrorMessage {
  type: "error";
  error: string;
}

export type WorkerOutMessage = WorkerProgressMessage | WorkerDoneMessage | WorkerErrorMessage;

// Current abort controller for cancellation
let currentAbortController: AbortController | null = null;

/**
 * Handle incoming messages from the main thread
 */
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

/**
 * Handle start message - begin processing
 */
async function handleStart(message: WorkerStartMessage) {
  // Cancel any existing processing
  if (currentAbortController) {
    currentAbortController.abort();
  }

  currentAbortController = new AbortController();

  try {
    const input: EngineInput = {
      imageData: message.imageData,
      settings: message.settings,
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

    const outMessage: WorkerDoneMessage = {
      type: "done",
      result,
    };
    self.postMessage(outMessage);
  } catch (error) {
    if ((error as Error).message === "Cancelled") {
      // Cancellation is expected, don't report as error
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

/**
 * Handle cancel message - abort current processing
 */
function handleCancel() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

// Export types for use in main thread
export {};
