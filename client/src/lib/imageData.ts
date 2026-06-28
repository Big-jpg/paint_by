import type { ImageTreatment, PageOrientation, PaperSize } from "./presets";
import { getPageSizeMm } from "./presets";

export interface PreparedImage {
  imageData: ImageData;
  previewUrl: string;
}

export interface ImagePrepOptions {
  maxWidth?: number;
  maxHeight?: number;
  treatment?: ImageTreatment;
  paperSize?: PaperSize;
  orientation?: PageOrientation;
}

export async function imageFileToData(
  file: File,
  options: ImagePrepOptions = {}
): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image");
  }

  const {
    maxWidth = 1024,
    maxHeight = 1024,
    treatment = "color",
    paperSize = "A1",
    orientation = "landscape",
  } = options;

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);
    const pageSize = getPageSizeMm(paperSize, orientation);
    const sourceCrop = getCenteredCrop(
      img.width,
      img.height,
      pageSize.widthMm / pageSize.heightMm
    );
    const { width, height } = fitWithinBounds(
      sourceCrop.width,
      sourceCrop.height,
      maxWidth,
      maxHeight
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create image canvas context");
    }

    ctx.drawImage(
      img,
      sourceCrop.x,
      sourceCrop.y,
      sourceCrop.width,
      sourceCrop.height,
      0,
      0,
      width,
      height
    );
    applyTreatment(ctx, width, height, treatment);

    return {
      imageData: ctx.getImageData(0, 0, width, height),
      previewUrl: canvas.toDataURL("image/png"),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function fitWithinBounds(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function getCenteredCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number
) {
  const sourceAspect = sourceWidth / sourceHeight;

  if (sourceAspect > targetAspect) {
    const width = Math.round(sourceHeight * targetAspect);
    return {
      x: Math.round((sourceWidth - width) / 2),
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = Math.round(sourceWidth / targetAspect);
  return {
    x: 0,
    y: Math.round((sourceHeight - height) / 2),
    width: sourceWidth,
    height,
  };
}

function applyTreatment(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  treatment: ImageTreatment
) {
  if (treatment === "color") return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    if (treatment === "grayscale") {
      data[i] = luma;
      data[i + 1] = luma;
      data[i + 2] = luma;
      continue;
    }

    if (treatment === "sepia") {
      data[i] = clamp(0.393 * r + 0.769 * g + 0.189 * b);
      data[i + 1] = clamp(0.349 * r + 0.686 * g + 0.168 * b);
      data[i + 2] = clamp(0.272 * r + 0.534 * g + 0.131 * b);
      continue;
    }

    const warmth = luma / 255;
    data[i] = clamp(r * 1.12 + 34 * warmth);
    data[i + 1] = clamp(g * 0.92 + 12 * warmth);
    data[i + 2] = clamp(b * 0.72 + 36 * (1 - warmth));
  }

  ctx.putImageData(imageData, 0, 0);
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
