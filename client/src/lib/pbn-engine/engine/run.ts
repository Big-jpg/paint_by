/**
 * src/engine/run.ts
 * Core engine orchestrator - processes images without DOM dependencies
 */

import { EngineInput, EngineResult, EngineProgress, EngineStep } from "./types";
import { throwIfAborted } from "./abort";

import { ColorReducer, ColorMapResult } from "../colorreductionmanagement";
import { FacetCreator } from "../facetCreator";
import { FacetReducer } from "../facetReducer";
import { FacetBorderTracer } from "../facetBorderTracer";
import { FacetBorderSegmenter } from "../facetBorderSegmenter";
import { FacetLabelPlacer } from "../facetLabelPlacer";
import { FacetResult } from "../facetmanagement";
import { RGB, delay } from "../common";
import { Point } from "../structs/point";

/**
 * Main engine function that processes an image through the paint-by-numbers pipeline
 * This function is DOM-free and can run in a Web Worker
 */
export async function runEngine(input: EngineInput): Promise<EngineResult> {
  const { imageData, settings, signal, onProgress } = input;

  const progress = (step: EngineStep, pct: number, message?: string) =>
    onProgress?.({ step, pct, message });

  throwIfAborted(signal);

  // 1) K-means clustering → returns quantized ImageData
  progress("kmeans", 0, "Starting k-means");
  const kmeansImgData = cloneImageData(imageData);

  await ColorReducer.applyKMeansClustering(
    imageData,
    kmeansImgData,
    null as any, // ctx is no longer needed - we pass null
    settings,
    kmeans => {
      // Map existing delta-based progress to 0..1
      const pct =
        (100 -
          (kmeans.currentDeltaDistanceDifference > 100
            ? 100
            : kmeans.currentDeltaDistanceDifference)) /
        100;
      progress(
        "kmeans",
        pct,
        `K-means iteration, delta: ${kmeans.currentDeltaDistanceDifference.toFixed(2)}`
      );
      throwIfAborted(signal);
    }
  );
  progress("kmeans", 1, "K-means complete");

  throwIfAborted(signal);

  // 2) Color map build
  progress("colormap", 0, "Building color map");
  let colormapResult: ColorMapResult =
    ColorReducer.createColorMap(kmeansImgData);
  progress("colormap", 1, "Color map complete");

  throwIfAborted(signal);

  // 3) Facet build + reduction loop (respect narrowPixelStripCleanupRuns)
  let facetResult: FacetResult = new FacetResult();

  if (settings.narrowPixelStripCleanupRuns === 0) {
    // facet building
    progress("facetBuild", 0, "Building facets");
    facetResult = await FacetCreator.getFacets(
      colormapResult.width,
      colormapResult.height,
      colormapResult.imgColorIndices,
      pct => {
        throwIfAborted(signal);
        progress("facetBuild", pct, "Building facets");
      }
    );
    progress("facetBuild", 1, "Facet build complete");

    throwIfAborted(signal);

    // facet reduction
    progress("facetReduce", 0, "Reducing facets");
    await FacetReducer.reduceFacets(
      settings.removeFacetsSmallerThanNrOfPoints,
      settings.removeFacetsFromLargeToSmall,
      settings.maximumNumberOfFacets,
      colormapResult.colorsByIndex,
      facetResult,
      colormapResult.imgColorIndices,
      pct => {
        throwIfAborted(signal);
        progress("facetReduce", pct, "Reducing facets");
      }
    );
    progress("facetReduce", 1, "Facet reduction complete");
  } else {
    for (let run = 0; run < settings.narrowPixelStripCleanupRuns; run++) {
      throwIfAborted(signal);

      // clean up narrow pixel strips
      await ColorReducer.processNarrowPixelStripCleanup(colormapResult);

      // facet building
      const buildProgress = run / settings.narrowPixelStripCleanupRuns;
      progress(
        "facetBuild",
        buildProgress,
        `Building facets (run ${run + 1}/${settings.narrowPixelStripCleanupRuns})`
      );

      facetResult = await FacetCreator.getFacets(
        colormapResult.width,
        colormapResult.height,
        colormapResult.imgColorIndices,
        pct => {
          throwIfAborted(signal);
          const overallPct = (run + pct) / settings.narrowPixelStripCleanupRuns;
          progress(
            "facetBuild",
            overallPct * 0.5,
            `Building facets (run ${run + 1})`
          );
        }
      );

      // facet reduction
      progress(
        "facetReduce",
        buildProgress,
        `Reducing facets (run ${run + 1}/${settings.narrowPixelStripCleanupRuns})`
      );

      await FacetReducer.reduceFacets(
        settings.removeFacetsSmallerThanNrOfPoints,
        settings.removeFacetsFromLargeToSmall,
        settings.maximumNumberOfFacets,
        colormapResult.colorsByIndex,
        facetResult,
        colormapResult.imgColorIndices,
        pct => {
          throwIfAborted(signal);
          const overallPct =
            (run + 0.5 + pct * 0.5) / settings.narrowPixelStripCleanupRuns;
          progress(
            "facetReduce",
            overallPct,
            `Reducing facets (run ${run + 1})`
          );
        }
      );
    }
    progress("facetBuild", 1, "Facet build complete");
    progress("facetReduce", 1, "Facet reduction complete");
  }

  throwIfAborted(signal);

  // 4) Border tracing
  progress("borderTrace", 0, "Tracing borders");
  await FacetBorderTracer.buildFacetBorderPaths(facetResult, pct => {
    throwIfAborted(signal);
    progress("borderTrace", pct, "Tracing borders");
  });
  progress("borderTrace", 1, "Border tracing complete");

  throwIfAborted(signal);

  // 5) Border segmentation
  progress("borderSegment", 0, "Segmenting borders");
  await FacetBorderSegmenter.buildFacetBorderSegments(
    facetResult,
    settings.nrOfTimesToHalveBorderSegments,
    pct => {
      throwIfAborted(signal);
      progress("borderSegment", pct, "Segmenting borders");
    }
  );
  progress("borderSegment", 1, "Border segmentation complete");

  throwIfAborted(signal);

  // 6) Label placement
  progress("labelPlace", 0, "Placing labels");
  await FacetLabelPlacer.buildFacetLabelBounds(facetResult, pct => {
    throwIfAborted(signal);
    progress("labelPlace", pct, "Placing labels");
  });
  progress("labelPlace", 1, "Label placement complete");

  throwIfAborted(signal);

  // 7) Generate SVG text (DOM-free)
  progress("svg", 0, "Generating SVG");
  const svgText = await generateSVGText(
    facetResult,
    colormapResult.colorsByIndex,
    settings.sizeMultiplier || 3, // sizeMultiplier
    settings.outputWidthMm && settings.outputHeightMm
      ? { widthMm: settings.outputWidthMm, heightMm: settings.outputHeightMm }
      : undefined,
    true, // fill
    true, // stroke
    true, // addColorLabels
    50, // fontSize
    "black", // fontColor
    pct => {
      throwIfAborted(signal);
      progress("svg", pct, "Generating SVG");
    }
  );
  progress("svg", 1, "SVG generation complete");

  // Build preview ImageData snapshots
  const previews: EngineResult["previews"] = {
    kmeans: kmeansImgData,
    reduced: createReducedPreview(facetResult, colormapResult),
  };

  return {
    facetResult,
    colorsByIndex: colormapResult.colorsByIndex,
    svgText,
    previews,
  };
}

/**
 * Clone an ImageData object
 */
function cloneImageData(img: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
}

/**
 * Create a preview ImageData showing the reduced facets
 */
function createReducedPreview(
  facetResult: FacetResult,
  colormapResult: ColorMapResult
): ImageData {
  const imgData = new ImageData(facetResult.width, facetResult.height);
  let idx = 0;

  for (let j = 0; j < facetResult.height; j++) {
    for (let i = 0; i < facetResult.width; i++) {
      const facet = facetResult.facets[facetResult.facetMap.get(i, j)];
      if (facet) {
        const rgb = colormapResult.colorsByIndex[facet.color];
        imgData.data[idx++] = rgb[0];
        imgData.data[idx++] = rgb[1];
        imgData.data[idx++] = rgb[2];
        imgData.data[idx++] = 255;
      } else {
        idx += 4;
      }
    }
  }

  return imgData;
}

/**
 * Generate SVG text without DOM dependencies
 */
async function generateSVGText(
  facetResult: FacetResult,
  colorsByIndex: RGB[],
  sizeMultiplier: number,
  pageSize: { widthMm: number; heightMm: number } | undefined,
  fill: boolean,
  stroke: boolean,
  addColorLabels: boolean,
  fontSize: number = 50,
  fontColor: string = "black",
  onUpdate: ((progress: number) => void) | null = null
): Promise<string> {
  const width = sizeMultiplier * facetResult.width;
  const height = sizeMultiplier * facetResult.height;

  const sizeAttributes = pageSize
    ? `width="${pageSize.widthMm}mm" height="${pageSize.heightMm}mm" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet"`
    : `width="${width}" height="${height}"`;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" ${sizeAttributes}>`;

  let count = 0;
  for (const f of facetResult.facets) {
    if (f != null && f.borderSegments && f.borderSegments.length > 0) {
      let newpath: Point[] = [];
      newpath = f.getFullPathFromBorderSegments(false);

      if (newpath.length > 0) {
        if (
          newpath[0].x !== newpath[newpath.length - 1].x ||
          newpath[0].y !== newpath[newpath.length - 1].y
        ) {
          newpath.push(newpath[0]); // close loop if necessary
        }

        // Build path data using quadratic curves
        let data = "M ";
        data +=
          newpath[0].x * sizeMultiplier +
          " " +
          newpath[0].y * sizeMultiplier +
          " ";
        for (let i = 1; i < newpath.length; i++) {
          const midpointX = (newpath[i].x + newpath[i - 1].x) / 2;
          const midpointY = (newpath[i].y + newpath[i - 1].y) / 2;
          data +=
            "Q " +
            midpointX * sizeMultiplier +
            " " +
            midpointY * sizeMultiplier +
            " " +
            newpath[i].x * sizeMultiplier +
            " " +
            newpath[i].y * sizeMultiplier +
            " ";
        }
        data += "Z";

        // Determine stroke and fill colors
        let strokeStyle = "";
        let fillStyle = "";

        if (stroke) {
          strokeStyle = 'stroke="#000"';
        } else if (fill) {
          strokeStyle = `stroke="rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})"`;
        }

        if (fill) {
          fillStyle = `fill="rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})"`;
        } else {
          fillStyle = 'fill="none"';
        }

        svgContent += `<path data-facetId="${f.id}" d="${data}" ${strokeStyle} stroke-width="1px" ${fillStyle}/>`;

        // Add color labels
        if (addColorLabels && f.labelBounds) {
          const nrOfDigits = (f.color + "").length;
          const adjustedFontSize = fontSize / nrOfDigits;

          svgContent += `<g class="label" transform="translate(${f.labelBounds.minX * sizeMultiplier},${f.labelBounds.minY * sizeMultiplier})">`;
          svgContent += `<svg width="${f.labelBounds.width * sizeMultiplier}" height="${f.labelBounds.height * sizeMultiplier}" overflow="visible" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet">`;
          svgContent += `<text font-family="Tahoma" font-size="${adjustedFontSize}" dominant-baseline="middle" text-anchor="middle" fill="${fontColor}">${f.color}</text>`;
          svgContent += `</svg></g>`;
        }
      }

      if (count % 100 === 0) {
        await delay(0);
        if (onUpdate != null) {
          onUpdate(f.id / facetResult.facets.length);
        }
      }
    }
    count++;
  }

  svgContent += "</svg>";

  if (onUpdate != null) {
    onUpdate(1);
  }

  return svgContent;
}

/**
 * Generate SVG text with custom options (for export)
 */
export async function generateSVGWithOptions(
  facetResult: FacetResult,
  colorsByIndex: RGB[],
  options: {
    sizeMultiplier?: number;
    outputWidthMm?: number;
    outputHeightMm?: number;
    fill?: boolean;
    stroke?: boolean;
    addColorLabels?: boolean;
    fontSize?: number;
    fontColor?: string;
  },
  onProgress?: (pct: number) => void
): Promise<string> {
  return generateSVGText(
    facetResult,
    colorsByIndex,
    options.sizeMultiplier ?? 1,
    options.outputWidthMm && options.outputHeightMm
      ? { widthMm: options.outputWidthMm, heightMm: options.outputHeightMm }
      : undefined,
    options.fill ?? true,
    options.stroke ?? true,
    options.addColorLabels ?? true,
    options.fontSize ?? 50,
    options.fontColor ?? "black",
    onProgress ?? null
  );
}
