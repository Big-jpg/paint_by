/**
 * src/engine/abort.ts
 * Bridge between existing CancellationToken and modern AbortSignal
 */

import { CancellationToken } from "../common";

/**
 * Throws an error if the abort signal has been triggered
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Cancelled");
  }
}

/**
 * Creates an AbortController that mirrors a CancellationToken
 * This allows the legacy CancellationToken to work with the new engine
 */
export function createAbortControllerFromToken(cancellationToken: CancellationToken): AbortController {
  const controller = new AbortController();
  
  // Check periodically if the cancellation token has been cancelled
  const checkInterval = setInterval(() => {
    if (cancellationToken.isCancelled) {
      controller.abort();
      clearInterval(checkInterval);
    }
  }, 50);
  
  // Also clear the interval when the signal is aborted
  controller.signal.addEventListener('abort', () => {
    clearInterval(checkInterval);
  });
  
  return controller;
}

/**
 * Creates a CancellationToken that mirrors an AbortSignal
 * This allows the new AbortSignal to work with legacy code
 */
export function createTokenFromAbortSignal(signal?: AbortSignal): CancellationToken {
  const token = new CancellationToken();
  
  if (signal) {
    if (signal.aborted) {
      token.isCancelled = true;
    } else {
      signal.addEventListener('abort', () => {
        token.isCancelled = true;
      });
    }
  }
  
  return token;
}
