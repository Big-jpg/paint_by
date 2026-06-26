/**
 * src/worker/index.ts
 * Utilities for working with the engine worker from the main thread
 */

import { EngineResult, EngineProgress } from "../engine";
import { Settings } from "../settings";

export interface WorkerStartMessage {
  type: "start";
  imageData: ImageData;
  settings: Settings;
}

export interface WorkerCancelMessage {
  type: "cancel";
}

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

/**
 * Engine worker client for the main thread
 * Provides a Promise-based API for running the engine in a Web Worker
 */
export class EngineWorkerClient {
  private worker: Worker | null = null;
  private onProgress: ((progress: EngineProgress) => void) | null = null;

  /**
   * Create a new worker instance
   */
  private createWorker(): Worker {
    // Worker path will need to be configured based on build setup
    // Using a relative path that will be resolved at runtime
    return new Worker("./worker/engine.worker.js", { type: "module" });
  }

  /**
   * Run the engine in a Web Worker
   */
  async run(
    imageData: ImageData,
    settings: Settings,
    onProgress?: (progress: EngineProgress) => void
  ): Promise<EngineResult> {
    // Terminate any existing worker
    this.terminate();

    this.worker = this.createWorker();
    this.onProgress = onProgress || null;

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker not initialized"));
        return;
      }

      this.worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        const message = event.data;

        switch (message.type) {
          case "progress":
            if (this.onProgress) {
              this.onProgress(message.progress);
            }
            break;

          case "done":
            resolve(message.result);
            this.terminate();
            break;

          case "error":
            reject(new Error(message.error));
            this.terminate();
            break;
        }
      };

      this.worker.onerror = (error) => {
        reject(new Error(error.message));
        this.terminate();
      };

      // Start processing
      const startMessage: WorkerStartMessage = {
        type: "start",
        imageData,
        settings,
      };
      this.worker.postMessage(startMessage);
    });
  }

  /**
   * Cancel current processing
   */
  cancel(): void {
    if (this.worker) {
      const cancelMessage: WorkerCancelMessage = { type: "cancel" };
      this.worker.postMessage(cancelMessage);
    }
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.onProgress = null;
  }
}

/**
 * Check if Web Workers are supported
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== "undefined";
}
