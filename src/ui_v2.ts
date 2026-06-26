/**
 * src/ui_v2.ts
 * Modern UI implementation for paint-by-numbers generator
 * Clean layout without Materialize, using modern CSS
 */

import { runEngine, EngineResult, EngineProgress, EngineStep, generateSVGWithOptions } from "./engine";
import { Settings, ClusteringColorSpace } from "./settings";
import { RGB } from "./common";
import { FacetResult } from "./facetmanagement";

// UI State
interface UIState {
  imageData: ImageData | null;
  result: EngineResult | null;
  isProcessing: boolean;
  abortController: AbortController | null;
  currentPreview: "original" | "kmeans" | "reduced" | "borders" | "output";
}

const state: UIState = {
  imageData: null,
  result: null,
  isProcessing: false,
  abortController: null,
  currentPreview: "original",
};

// Preset configurations
const presets = {
  draft: {
    name: "Draft",
    description: "Quick preview with fewer colors",
    kMeansNrOfClusters: 8,
    removeFacetsSmallerThanNrOfPoints: 50,
    narrowPixelStripCleanupRuns: 1,
    nrOfTimesToHalveBorderSegments: 1,
  },
  balanced: {
    name: "Balanced",
    description: "Good balance of detail and simplicity",
    kMeansNrOfClusters: 16,
    removeFacetsSmallerThanNrOfPoints: 20,
    narrowPixelStripCleanupRuns: 3,
    nrOfTimesToHalveBorderSegments: 2,
  },
  detailed: {
    name: "Detailed",
    description: "Maximum detail with more colors",
    kMeansNrOfClusters: 24,
    removeFacetsSmallerThanNrOfPoints: 10,
    narrowPixelStripCleanupRuns: 3,
    nrOfTimesToHalveBorderSegments: 3,
  },
};

/**
 * Initialize the UI
 */
export function initUI(): void {
  setupInputPanel();
  setupPresetPanel();
  setupPreviewPanel();
  setupExportPanel();
  setupProgressTimeline();
}

/**
 * Setup the input panel (dropzone + file + paste)
 */
function setupInputPanel(): void {
  const dropzone = document.getElementById("dropzone") as HTMLDivElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;

  // File input change
  fileInput.addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      loadImageFile(files[0]);
    }
  });

  // Dropzone click
  dropzone.addEventListener("click", () => {
    fileInput.click();
  });

  // Drag and drop
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      loadImageFile(files[0]);
    }
  });

  // Paste support
  document.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            loadImageFile(file);
          }
          break;
        }
      }
    }
  });
}

/**
 * Load an image file
 */
function loadImageFile(file: File): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas and get image data
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      
      state.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      state.result = null;
      state.currentPreview = "original";
      
      updatePreviewCanvas();
      updateUIState();
      
      // Show image info
      const imageInfo = document.getElementById("imageInfo");
      if (imageInfo) {
        imageInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight} pixels`;
      }
    };
    img.onerror = () => {
      alert("Failed to load image");
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

/**
 * Setup the preset panel
 */
function setupPresetPanel(): void {
  const presetSelect = document.getElementById("presetSelect") as HTMLSelectElement;
  const colorsSlider = document.getElementById("colorsSlider") as HTMLInputElement;
  const colorsValue = document.getElementById("colorsValue") as HTMLSpanElement;
  const processBtn = document.getElementById("processBtn") as HTMLButtonElement;
  const cancelBtn = document.getElementById("cancelBtn") as HTMLButtonElement;

  // Preset change
  presetSelect.addEventListener("change", () => {
    const preset = presets[presetSelect.value as keyof typeof presets];
    if (preset) {
      colorsSlider.value = preset.kMeansNrOfClusters.toString();
      colorsValue.textContent = preset.kMeansNrOfClusters.toString();
    }
  });

  // Colors slider
  colorsSlider.addEventListener("input", () => {
    colorsValue.textContent = colorsSlider.value;
  });

  // Process button
  processBtn.addEventListener("click", () => {
    processImage();
  });

  // Cancel button
  cancelBtn.addEventListener("click", () => {
    cancelProcessing();
  });

  // Advanced settings toggle
  const advancedToggle = document.getElementById("advancedToggle") as HTMLButtonElement;
  const advancedSettings = document.getElementById("advancedSettings") as HTMLDivElement;
  
  advancedToggle.addEventListener("click", () => {
    advancedSettings.classList.toggle("hidden");
    advancedToggle.textContent = advancedSettings.classList.contains("hidden") 
      ? "Show Advanced Settings" 
      : "Hide Advanced Settings";
  });
}

/**
 * Setup the preview panel
 */
function setupPreviewPanel(): void {
  const previewSelect = document.getElementById("previewSelect") as HTMLSelectElement;
  
  previewSelect.addEventListener("change", () => {
    state.currentPreview = previewSelect.value as UIState["currentPreview"];
    updatePreviewCanvas();
  });
}

/**
 * Setup the export panel
 */
function setupExportPanel(): void {
  const downloadSVGBtn = document.getElementById("downloadSVGBtn") as HTMLButtonElement;
  const downloadPNGBtn = document.getElementById("downloadPNGBtn") as HTMLButtonElement;
  const downloadPaletteBtn = document.getElementById("downloadPaletteBtn") as HTMLButtonElement;

  // Render options
  const showLabels = document.getElementById("showLabels") as HTMLInputElement;
  const showBorders = document.getElementById("showBorders") as HTMLInputElement;
  const fillFacets = document.getElementById("fillFacets") as HTMLInputElement;

  const updateOutput = () => {
    if (state.result && state.currentPreview === "output") {
      updatePreviewCanvas();
    }
  };

  showLabels.addEventListener("change", updateOutput);
  showBorders.addEventListener("change", updateOutput);
  fillFacets.addEventListener("change", updateOutput);

  // Download buttons
  downloadSVGBtn.addEventListener("click", () => downloadSVG());
  downloadPNGBtn.addEventListener("click", () => downloadPNG());
  downloadPaletteBtn.addEventListener("click", () => downloadPalette());
}

/**
 * Setup the progress timeline
 */
function setupProgressTimeline(): void {
  // Progress timeline is updated during processing
}

/**
 * Get current settings from UI
 */
function getSettings(): Settings {
  const settings = new Settings();
  const presetSelect = document.getElementById("presetSelect") as HTMLSelectElement;
  const preset = presets[presetSelect.value as keyof typeof presets];
  
  // Apply preset
  if (preset) {
    settings.removeFacetsSmallerThanNrOfPoints = preset.removeFacetsSmallerThanNrOfPoints;
    settings.narrowPixelStripCleanupRuns = preset.narrowPixelStripCleanupRuns;
    settings.nrOfTimesToHalveBorderSegments = preset.nrOfTimesToHalveBorderSegments;
  }

  // Override with slider value
  const colorsSlider = document.getElementById("colorsSlider") as HTMLInputElement;
  settings.kMeansNrOfClusters = parseInt(colorsSlider.value);

  // Advanced settings
  const minFacetSize = document.getElementById("minFacetSize") as HTMLInputElement;
  const maxFacets = document.getElementById("maxFacets") as HTMLInputElement;
  const resizeImage = document.getElementById("resizeImage") as HTMLInputElement;
  const maxWidth = document.getElementById("maxWidth") as HTMLInputElement;
  const maxHeight = document.getElementById("maxHeight") as HTMLInputElement;

  if (minFacetSize.value) {
    settings.removeFacetsSmallerThanNrOfPoints = parseInt(minFacetSize.value);
  }
  if (maxFacets.value) {
    settings.maximumNumberOfFacets = parseInt(maxFacets.value) || Number.MAX_VALUE;
  }
  settings.resizeImageIfTooLarge = resizeImage.checked;
  if (maxWidth.value) {
    settings.resizeImageWidth = parseInt(maxWidth.value);
  }
  if (maxHeight.value) {
    settings.resizeImageHeight = parseInt(maxHeight.value);
  }

  return settings;
}

/**
 * Process the image
 */
async function processImage(): Promise<void> {
  if (!state.imageData) {
    alert("Please load an image first");
    return;
  }

  if (state.isProcessing) {
    return;
  }

  state.isProcessing = true;
  state.abortController = new AbortController();
  state.result = null;
  updateUIState();
  resetProgress();

  const settings = getSettings();

  // Handle resizing in UI layer
  let imageData = state.imageData;
  if (settings.resizeImageIfTooLarge && 
      (imageData.width > settings.resizeImageWidth || imageData.height > settings.resizeImageHeight)) {
    imageData = resizeImageData(imageData, settings.resizeImageWidth, settings.resizeImageHeight);
  }

  try {
    const result = await runEngine({
      imageData,
      settings,
      signal: state.abortController.signal,
      onProgress: updateProgress,
    });

    state.result = result;
    state.currentPreview = "output";
    
    // Update preview selector
    const previewSelect = document.getElementById("previewSelect") as HTMLSelectElement;
    previewSelect.value = "output";
    
    updatePreviewCanvas();
    updatePalette();
    completeProgress();
  } catch (error) {
    if ((error as Error).message !== "Cancelled") {
      alert("Processing failed: " + (error as Error).message);
    }
  } finally {
    state.isProcessing = false;
    state.abortController = null;
    updateUIState();
  }
}

/**
 * Cancel processing
 */
function cancelProcessing(): void {
  if (state.abortController) {
    state.abortController.abort();
  }
}

/**
 * Resize image data
 */
function resizeImageData(imageData: ImageData, maxWidth: number, maxHeight: number): ImageData {
  let width = imageData.width;
  let height = imageData.height;

  if (width > maxWidth) {
    height = height * maxWidth / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = width * maxHeight / height;
    height = maxHeight;
  }

  width = Math.floor(width);
  height = Math.floor(height);

  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = width;
  resizedCanvas.height = height;
  const resizedCtx = resizedCanvas.getContext("2d")!;
  resizedCtx.drawImage(canvas, 0, 0, width, height);

  return resizedCtx.getImageData(0, 0, width, height);
}

/**
 * Update progress display
 */
function updateProgress(progress: EngineProgress): void {
  const stepElements: Record<EngineStep, string> = {
    kmeans: "step-kmeans",
    colormap: "step-colormap",
    facetBuild: "step-facetBuild",
    facetReduce: "step-facetReduce",
    borderTrace: "step-borderTrace",
    borderSegment: "step-borderSegment",
    labelPlace: "step-labelPlace",
    svg: "step-svg",
  };

  // Update step status
  const stepId = stepElements[progress.step];
  const stepEl = document.getElementById(stepId);
  if (stepEl) {
    stepEl.classList.remove("pending", "complete");
    stepEl.classList.add("active");
    
    const progressBar = stepEl.querySelector(".step-progress") as HTMLDivElement;
    if (progressBar) {
      progressBar.style.width = `${progress.pct * 100}%`;
    }

    if (progress.pct === 1) {
      stepEl.classList.remove("active");
      stepEl.classList.add("complete");
    }
  }

  // Update overall progress
  const overallProgress = document.getElementById("overallProgress") as HTMLDivElement;
  const stepWeights: Record<EngineStep, number> = {
    kmeans: 0.3,
    colormap: 0.02,
    facetBuild: 0.15,
    facetReduce: 0.15,
    borderTrace: 0.1,
    borderSegment: 0.1,
    labelPlace: 0.08,
    svg: 0.1,
  };

  let overallPct = 0;
  const steps: EngineStep[] = ["kmeans", "colormap", "facetBuild", "facetReduce", "borderTrace", "borderSegment", "labelPlace", "svg"];
  const currentStepIndex = steps.indexOf(progress.step);
  
  for (let i = 0; i < currentStepIndex; i++) {
    overallPct += stepWeights[steps[i]];
  }
  overallPct += stepWeights[progress.step] * progress.pct;

  if (overallProgress) {
    overallProgress.style.width = `${overallPct * 100}%`;
  }

  // Update status text
  const statusText = document.getElementById("statusText");
  if (statusText && progress.message) {
    statusText.textContent = progress.message;
  }
}

/**
 * Reset progress display
 */
function resetProgress(): void {
  const steps = ["kmeans", "colormap", "facetBuild", "facetReduce", "borderTrace", "borderSegment", "labelPlace", "svg"];
  for (const step of steps) {
    const stepEl = document.getElementById(`step-${step}`);
    if (stepEl) {
      stepEl.classList.remove("active", "complete");
      stepEl.classList.add("pending");
      const progressBar = stepEl.querySelector(".step-progress") as HTMLDivElement;
      if (progressBar) {
        progressBar.style.width = "0%";
      }
    }
  }

  const overallProgress = document.getElementById("overallProgress") as HTMLDivElement;
  if (overallProgress) {
    overallProgress.style.width = "0%";
  }

  const statusText = document.getElementById("statusText");
  if (statusText) {
    statusText.textContent = "Processing...";
  }
}

/**
 * Mark progress as complete
 */
function completeProgress(): void {
  const overallProgress = document.getElementById("overallProgress") as HTMLDivElement;
  if (overallProgress) {
    overallProgress.style.width = "100%";
  }

  const statusText = document.getElementById("statusText");
  if (statusText) {
    statusText.textContent = "Complete!";
  }
}

/**
 * Update UI state (enable/disable buttons, etc.)
 */
function updateUIState(): void {
  const processBtn = document.getElementById("processBtn") as HTMLButtonElement;
  const cancelBtn = document.getElementById("cancelBtn") as HTMLButtonElement;
  const exportPanel = document.getElementById("exportPanel") as HTMLDivElement;
  const progressPanel = document.getElementById("progressPanel") as HTMLDivElement;

  processBtn.disabled = state.isProcessing || !state.imageData;
  cancelBtn.disabled = !state.isProcessing;
  cancelBtn.classList.toggle("hidden", !state.isProcessing);
  
  if (exportPanel) {
    exportPanel.classList.toggle("disabled", !state.result);
  }
  
  if (progressPanel) {
    progressPanel.classList.toggle("hidden", !state.isProcessing && !state.result);
  }
}

/**
 * Update the preview canvas
 */
function updatePreviewCanvas(): void {
  const canvas = document.getElementById("previewCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;

  if (!state.imageData && !state.result) {
    canvas.width = 400;
    canvas.height = 300;
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#999";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No image loaded", canvas.width / 2, canvas.height / 2);
    return;
  }

  let imageData: ImageData | null = null;

  switch (state.currentPreview) {
    case "original":
      imageData = state.imageData;
      break;
    case "kmeans":
      imageData = state.result?.previews?.kmeans || null;
      break;
    case "reduced":
      imageData = state.result?.previews?.reduced || null;
      break;
    case "output":
      // Render SVG to canvas
      if (state.result) {
        renderOutputToCanvas(canvas, ctx);
        return;
      }
      break;
  }

  if (imageData) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  }
}

/**
 * Render the output SVG to canvas
 */
async function renderOutputToCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void> {
  if (!state.result) return;

  const showLabels = (document.getElementById("showLabels") as HTMLInputElement).checked;
  const showBorders = (document.getElementById("showBorders") as HTMLInputElement).checked;
  const fillFacets = (document.getElementById("fillFacets") as HTMLInputElement).checked;

  const svgText = await generateSVGWithOptions(
    state.result.facetResult,
    state.result.colorsByIndex,
    {
      sizeMultiplier: 1,
      fill: fillFacets,
      stroke: showBorders,
      addColorLabels: showLabels,
    }
  );

  // Create SVG blob and render to canvas
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  
  img.onload = () => {
    canvas.width = state.result!.facetResult.width;
    canvas.height = state.result!.facetResult.height;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
}

/**
 * Update the color palette display
 */
function updatePalette(): void {
  const paletteContainer = document.getElementById("paletteContainer") as HTMLDivElement;
  if (!paletteContainer || !state.result) return;

  paletteContainer.innerHTML = "";
  
  for (let i = 0; i < state.result.colorsByIndex.length; i++) {
    const color = state.result.colorsByIndex[i];
    const colorDiv = document.createElement("div");
    colorDiv.className = "palette-color";
    colorDiv.style.backgroundColor = `rgb(${color[0]},${color[1]},${color[2]})`;
    colorDiv.title = `${i}: RGB(${color[0]},${color[1]},${color[2]})`;
    colorDiv.textContent = i.toString();
    paletteContainer.appendChild(colorDiv);
  }
}

/**
 * Download SVG
 */
async function downloadSVG(): Promise<void> {
  if (!state.result) return;

  const showLabels = (document.getElementById("showLabels") as HTMLInputElement).checked;
  const showBorders = (document.getElementById("showBorders") as HTMLInputElement).checked;
  const fillFacets = (document.getElementById("fillFacets") as HTMLInputElement).checked;
  const sizeMultiplier = parseInt((document.getElementById("sizeMultiplier") as HTMLInputElement)?.value || "1");

  const svgText = await generateSVGWithOptions(
    state.result.facetResult,
    state.result.colorsByIndex,
    {
      sizeMultiplier,
      fill: fillFacets,
      stroke: showBorders,
      addColorLabels: showLabels,
    }
  );

  const blob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n', svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "paintbynumbers.svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download PNG
 */
async function downloadPNG(): Promise<void> {
  if (!state.result) return;

  const showLabels = (document.getElementById("showLabels") as HTMLInputElement).checked;
  const showBorders = (document.getElementById("showBorders") as HTMLInputElement).checked;
  const fillFacets = (document.getElementById("fillFacets") as HTMLInputElement).checked;
  const sizeMultiplier = parseInt((document.getElementById("sizeMultiplier") as HTMLInputElement)?.value || "1");

  const svgText = await generateSVGWithOptions(
    state.result.facetResult,
    state.result.colorsByIndex,
    {
      sizeMultiplier,
      fill: fillFacets,
      stroke: showBorders,
      addColorLabels: showLabels,
    }
  );

  // Create canvas from SVG
  const blob = new Blob([svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = state.result!.facetResult.width * sizeMultiplier;
    canvas.height = state.result!.facetResult.height * sizeMultiplier;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "paintbynumbers.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
      }
    }, "image/png");
    
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
}

/**
 * Download palette PNG
 */
function downloadPalette(): void {
  if (!state.result) return;

  const colorsByIndex = state.result.colorsByIndex;
  const canvas = document.createElement("canvas");

  const nrOfItemsPerRow = 10;
  const nrRows = Math.ceil(colorsByIndex.length / nrOfItemsPerRow);
  const margin = 10;
  const cellWidth = 80;
  const cellHeight = 70;

  canvas.width = margin + nrOfItemsPerRow * (cellWidth + margin);
  canvas.height = margin + nrRows * (cellHeight + margin);
  const ctx = canvas.getContext("2d")!;
  ctx.translate(0.5, 0.5);

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < colorsByIndex.length; i++) {
    const color = colorsByIndex[i];
    const x = margin + (i % nrOfItemsPerRow) * (cellWidth + margin);
    const y = margin + Math.floor(i / nrOfItemsPerRow) * (cellHeight + margin);

    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.fillRect(x, y, cellWidth, cellHeight - 20);
    ctx.strokeStyle = "#888";
    ctx.strokeRect(x, y, cellWidth, cellHeight - 20);

    const nrText = i + "";
    ctx.fillStyle = "black";
    ctx.strokeStyle = "#CCC";
    ctx.font = "20px Tahoma";
    const nrTextSize = ctx.measureText(nrText);
    ctx.lineWidth = 2;
    ctx.strokeText(nrText, x + cellWidth / 2 - nrTextSize.width / 2, y + cellHeight / 2 - 5);
    ctx.fillText(nrText, x + cellWidth / 2 - nrTextSize.width / 2, y + cellHeight / 2 - 5);
    ctx.lineWidth = 1;

    ctx.font = "10px Tahoma";
    const rgbText = "RGB: " + Math.floor(color[0]) + "," + Math.floor(color[1]) + "," + Math.floor(color[2]);
    const rgbTextSize = ctx.measureText(rgbText);
    ctx.fillStyle = "black";
    ctx.fillText(rgbText, x + cellWidth / 2 - rgbTextSize.width / 2, y + cellHeight - 10);
  }

  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "palette.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, "image/png");
}
