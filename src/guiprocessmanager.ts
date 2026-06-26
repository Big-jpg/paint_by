/**
 * src/guiprocessmanager.ts
 * Module that manages the GUI when processing
 * Refactored to use the new engine while maintaining legacy UI compatibility
 */

import { ColorMapResult, ColorReducer } from "./colorreductionmanagement";
import { CancellationToken, delay, IMap, RGB } from "./common";
import { FacetBorderSegmenter } from "./facetBorderSegmenter";
import { FacetBorderTracer } from "./facetBorderTracer";
import { FacetCreator } from "./facetCreator";
import { FacetLabelPlacer } from "./facetLabelPlacer";
import { FacetResult } from "./facetmanagement";
import { FacetReducer } from "./facetReducer";
import { time, timeEnd } from "./gui";
import { Settings } from "./settings";
import { Point } from "./structs/point";
import { runEngine, EngineProgress, createAbortControllerFromToken } from "./engine";

export class ProcessResult {
    public facetResult!: FacetResult;
    public colorsByIndex!: RGB[];
}

/**
 *  Manages the GUI states & processes the image step by step
 *  Now uses the new engine internally while maintaining the legacy UI interface
 */
export class GUIProcessManager {

    public static async process(settings: Settings, cancellationToken: CancellationToken): Promise<ProcessResult> {
        const c = document.getElementById("canvas") as HTMLCanvasElement;
        const ctx = c.getContext("2d")!;
        let imgData = ctx.getImageData(0, 0, c.width, c.height);

        // Handle resizing in UI layer (keeping it here for now as per Phase 1 recommendation)
        if (settings.resizeImageIfTooLarge && (c.width > settings.resizeImageWidth || c.height > settings.resizeImageHeight)) {
            let width = c.width;
            let height = c.height;
            if (width > settings.resizeImageWidth) {
                const newWidth = settings.resizeImageWidth;
                const newHeight = c.height / c.width * settings.resizeImageWidth;
                width = newWidth;
                height = newHeight;
            }
            if (height > settings.resizeImageHeight) {
                const newHeight = settings.resizeImageHeight;
                const newWidth = width / height * newHeight;
                width = newWidth;
                height = newHeight;
            }

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCanvas.getContext("2d")!.drawImage(c, 0, 0, width, height);
            c.width = width;
            c.height = height;
            ctx.drawImage(tempCanvas, 0, 0, width, height);
            imgData = ctx.getImageData(0, 0, c.width, c.height);
        }

        // reset progress
        $(".status .progress .determinate").css("width", "0px");
        $(".status").removeClass("complete");

        const tabsOutput = M.Tabs.getInstance(document.getElementById("tabsOutput")!);

        // Create AbortController that mirrors the CancellationToken
        const abortController = createAbortControllerFromToken(cancellationToken);

        // Setup preview canvases
        const cKmeans = document.getElementById("cKMeans") as HTMLCanvasElement;
        cKmeans.width = imgData.width;
        cKmeans.height = imgData.height;
        const ctxKmeans = cKmeans.getContext("2d")!;
        ctxKmeans.fillStyle = "white";
        ctxKmeans.fillRect(0, 0, cKmeans.width, cKmeans.height);

        const cReduction = document.getElementById("cReduction") as HTMLCanvasElement;
        cReduction.width = imgData.width;
        cReduction.height = imgData.height;
        const ctxReduction = cReduction.getContext("2d")!;
        ctxReduction.fillStyle = "white";
        ctxReduction.fillRect(0, 0, cReduction.width, cReduction.height);

        const cBorderPath = document.getElementById("cBorderPath") as HTMLCanvasElement;
        cBorderPath.width = imgData.width;
        cBorderPath.height = imgData.height;
        const ctxBorderPath = cBorderPath.getContext("2d")!;

        const cBorderSegment = document.getElementById("cBorderSegmentation") as HTMLCanvasElement;
        cBorderSegment.width = imgData.width;
        cBorderSegment.height = imgData.height;
        const ctxBorderSegment = cBorderSegment.getContext("2d")!;

        const cLabelPlacement = document.getElementById("cLabelPlacement") as HTMLCanvasElement;
        cLabelPlacement.width = imgData.width;
        cLabelPlacement.height = imgData.height;
        const ctxLabelPlacement = cLabelPlacement.getContext("2d")!;

        time("Total processing");

        // Track current step for UI updates
        let currentStep = "";
        let engineResult: any = null;

        try {
            engineResult = await runEngine({
                imageData: imgData,
                settings,
                signal: abortController.signal,
                onProgress: (progress: EngineProgress) => {
                    // Update legacy progress bars based on engine progress
                    GUIProcessManager.updateLegacyProgress(progress, tabsOutput, {
                        ctxKmeans,
                        ctxReduction,
                        ctxBorderPath,
                        ctxBorderSegment,
                        ctxLabelPlacement,
                        cKmeans,
                        cReduction,
                        cBorderPath,
                        cBorderSegment,
                        cLabelPlacement,
                    });
                    currentStep = progress.step;
                }
            });
        } catch (e) {
            if ((e as Error).message === "Cancelled") {
                throw e;
            }
            throw e;
        }

        // Update preview canvases with final results
        if (engineResult.previews?.kmeans) {
            ctxKmeans.putImageData(engineResult.previews.kmeans, 0, 0);
        }
        if (engineResult.previews?.reduced) {
            ctxReduction.putImageData(engineResult.previews.reduced, 0, 0);
        }

        // Draw final border paths
        GUIProcessManager.drawBorderPaths(ctxBorderPath, cBorderPath, engineResult.facetResult);
        
        // Draw final border segments
        GUIProcessManager.drawBorderSegments(ctxBorderSegment, cBorderSegment, engineResult.facetResult);
        
        // Draw label placements
        ctxLabelPlacement.fillStyle = "white";
        ctxLabelPlacement.fillRect(0, 0, cLabelPlacement.width, cLabelPlacement.height);
        ctxLabelPlacement.drawImage(cBorderSegment, 0, 0);
        GUIProcessManager.drawLabelPlacements(ctxLabelPlacement, engineResult.facetResult);

        // Mark all steps as complete
        $(".status").removeClass("active");
        $(".status.kMeans").addClass("complete");
        $(".status.facetBuilding").addClass("complete");
        $(".status.facetReduction").addClass("complete");
        $(".status.facetBorderPath").addClass("complete");
        $(".status.facetBorderSegmentation").addClass("complete");
        $(".status.facetLabelPlacement").addClass("complete");

        timeEnd("Total processing");

        // Return result in legacy format
        const processResult = new ProcessResult();
        processResult.facetResult = engineResult.facetResult;
        processResult.colorsByIndex = engineResult.colorsByIndex;
        return processResult;
    }

    /**
     * Update legacy progress bars based on engine progress
     */
    private static updateLegacyProgress(
        progress: EngineProgress,
        tabsOutput: M.Tabs,
        canvases: {
            ctxKmeans: CanvasRenderingContext2D;
            ctxReduction: CanvasRenderingContext2D;
            ctxBorderPath: CanvasRenderingContext2D;
            ctxBorderSegment: CanvasRenderingContext2D;
            ctxLabelPlacement: CanvasRenderingContext2D;
            cKmeans: HTMLCanvasElement;
            cReduction: HTMLCanvasElement;
            cBorderPath: HTMLCanvasElement;
            cBorderSegment: HTMLCanvasElement;
            cLabelPlacement: HTMLCanvasElement;
        }
    ) {
        const pctStr = Math.round(progress.pct * 100) + "%";

        switch (progress.step) {
            case "kmeans":
                if (progress.pct === 0) {
                    tabsOutput.select("kmeans-pane");
                    $(".status").removeClass("active");
                    $(".status.kMeans").addClass("active");
                }
                $("#statusKMeans").css("width", pctStr);
                if (progress.pct === 1) {
                    $(".status").removeClass("active");
                    $(".status.kMeans").addClass("complete");
                }
                break;

            case "colormap":
                // Color map is quick, no separate progress bar in legacy UI
                break;

            case "facetBuild":
                if (progress.pct === 0) {
                    $(".status").removeClass("active");
                    $(".status.facetBuilding").addClass("active");
                }
                $("#statusFacetBuilding").css("width", pctStr);
                if (progress.pct === 1) {
                    $(".status").removeClass("active");
                    $(".status.facetBuilding").addClass("complete");
                }
                break;

            case "facetReduce":
                if (progress.pct === 0) {
                    tabsOutput.select("reduction-pane");
                    $(".status").removeClass("active");
                    $(".status.facetReduction").addClass("active");
                }
                $("#statusFacetReduction").css("width", pctStr);
                if (progress.pct === 1) {
                    $(".status").removeClass("active");
                    $(".status.facetReduction").addClass("complete");
                }
                break;

            case "borderTrace":
                if (progress.pct === 0) {
                    tabsOutput.select("borderpath-pane");
                    $(".status").removeClass("active");
                    $(".status.facetBorderPath").addClass("active");
                }
                $("#statusFacetBorderPath").css("width", pctStr);
                if (progress.pct === 1) {
                    $(".status").removeClass("active");
                    $(".status.facetBorderPath").addClass("complete");
                }
                break;

            case "borderSegment":
                if (progress.pct === 0) {
                    tabsOutput.select("bordersegmentation-pane");
                    $(".status").removeClass("active");
                    $(".status.facetBorderSegmentation").addClass("active");
                }
                $("#statusFacetBorderSegmentation").css("width", pctStr);
                if (progress.pct === 1) {
                    $(".status").removeClass("active");
                    $(".status.facetBorderSegmentation").addClass("complete");
                }
                break;

            case "labelPlace":
                if (progress.pct === 0) {
                    tabsOutput.select("labelplacement-pane");
                    $(".status").removeClass("active");
                    $(".status.facetLabelPlacement").addClass("active");
                }
                $("#statusFacetLabelPlacement").css("width", pctStr);
                if (progress.pct === 1) {
                    $(".status").removeClass("active");
                    $(".status.facetLabelPlacement").addClass("complete");
                }
                break;

            case "svg":
                // SVG generation progress - no separate bar in legacy UI
                break;
        }
    }

    /**
     * Draw border paths on canvas
     */
    private static drawBorderPaths(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, facetResult: FacetResult) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (const f of facetResult.facets) {
            if (f != null && f.borderPath != null) {
                ctx.beginPath();
                ctx.moveTo(f.borderPath[0].getWallX(), f.borderPath[0].getWallY());
                for (let i = 1; i < f.borderPath.length; i++) {
                    ctx.lineTo(f.borderPath[i].getWallX(), f.borderPath[i].getWallY());
                }
                ctx.stroke();
            }
        }
    }

    /**
     * Draw border segments on canvas
     */
    private static drawBorderSegments(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, facetResult: FacetResult) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (const f of facetResult.facets) {
            if (f != null && f.borderSegments && f.borderSegments.length > 0) {
                ctx.beginPath();
                const path = f.getFullPathFromBorderSegments(false);
                ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
                ctx.stroke();
            }
        }
    }

    /**
     * Draw label placements on canvas
     */
    private static drawLabelPlacements(ctx: CanvasRenderingContext2D, facetResult: FacetResult) {
        for (const f of facetResult.facets) {
            if (f != null && f.labelBounds != null) {
                ctx.fillStyle = "red";
                ctx.fillRect(f.labelBounds.minX, f.labelBounds.minY, f.labelBounds.width, f.labelBounds.height);
            }
        }
    }

    /**
     *  Creates a vector based SVG image of the facets with the given configuration
     *  Kept for legacy compatibility - uses DOM-based SVG creation
     */
    public static async createSVG(facetResult: FacetResult, colorsByIndex: RGB[], sizeMultiplier: number, fill: boolean, stroke: boolean, addColorLabels: boolean, fontSize: number = 50, fontColor: string = "black", onUpdate: ((progress: number) => void) | null = null) {
        const xmlns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(xmlns, "svg");
        svg.setAttribute("width", sizeMultiplier * facetResult.width + "");
        svg.setAttribute("height", sizeMultiplier * facetResult.height + "");

        let count = 0;
        for (const f of facetResult.facets) {

            if (f != null && f.borderSegments.length > 0) {
                let newpath: Point[] = [];
                const useSegments = true;
                if (useSegments) {
                    newpath = f.getFullPathFromBorderSegments(false);
                } else {
                    for (let i: number = 0; i < f.borderPath.length; i++) {
                        newpath.push(new Point(f.borderPath[i].getWallX() + 0.5, f.borderPath[i].getWallY() + 0.5));
                    }
                }
                if (newpath[0].x !== newpath[newpath.length - 1].x || newpath[0].y !== newpath[newpath.length - 1].y) {
                    newpath.push(newpath[0]);
                }

                const svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                let data = "M ";
                data += newpath[0].x * sizeMultiplier + " " + newpath[0].y * sizeMultiplier + " ";
                for (let i: number = 1; i < newpath.length; i++) {
                    const midpointX = (newpath[i].x + newpath[i - 1].x) / 2;
                    const midpointY = (newpath[i].y + newpath[i - 1].y) / 2;
                    data += "Q " + (midpointX * sizeMultiplier) + " " + (midpointY * sizeMultiplier) + " " + (newpath[i].x * sizeMultiplier) + " " + (newpath[i].y * sizeMultiplier) + " ";
                }
                data += "Z";

                svgPath.setAttribute("data-facetId", f.id + "");
                svgPath.setAttribute("d", data);

                if (stroke) {
                    svgPath.style.stroke = "#000";
                } else {
                    if (fill) {
                        svgPath.style.stroke = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
                    }
                }
                svgPath.style.strokeWidth = "1px";

                if (fill) {
                    svgPath.style.fill = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${colorsByIndex[f.color][2]})`;
                } else {
                    svgPath.style.fill = "none";
                }

                svg.appendChild(svgPath);

                if (addColorLabels) {
                    const txt = document.createElementNS(xmlns, "text");
                    txt.setAttribute("font-family", "Tahoma");
                    const nrOfDigits = (f.color + "").length;
                    txt.setAttribute("font-size", (fontSize / nrOfDigits) + "");
                    txt.setAttribute("dominant-baseline", "middle");
                    txt.setAttribute("text-anchor", "middle");
                    txt.setAttribute("fill", fontColor);

                    txt.textContent = f.color + "";

                    const subsvg = document.createElementNS(xmlns, "svg");
                    subsvg.setAttribute("width", f.labelBounds.width * sizeMultiplier + "");
                    subsvg.setAttribute("height", f.labelBounds.height * sizeMultiplier + "");
                    subsvg.setAttribute("overflow", "visible");
                    subsvg.setAttribute("viewBox", "-50 -50 100 100");
                    subsvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

                    subsvg.appendChild(txt);

                    const g = document.createElementNS(xmlns, "g");
                    g.setAttribute("class", "label");
                    g.setAttribute("transform", "translate(" + f.labelBounds.minX * sizeMultiplier + "," + f.labelBounds.minY * sizeMultiplier + ")");
                    g.appendChild(subsvg);
                    svg.appendChild(g);
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

        if (onUpdate != null) {
            onUpdate(1);
        }

        return svg;
    }
}
