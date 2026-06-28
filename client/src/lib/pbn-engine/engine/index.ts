/**
 * src/engine/index.ts
 * Main export file for the paint-by-numbers engine
 */

export * from "./types";
export * from "./abort";
export { runEngine, generateSVGWithOptions, getPhaseForStep } from "./run";
