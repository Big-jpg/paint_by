export interface PreparedImage {
  imageData: ImageData;
  previewUrl: string;
}

export async function imageFileToData(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024
): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);
    const { width, height } = fitWithinBounds(
      img.width,
      img.height,
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

    ctx.drawImage(img, 0, 0, width, height);

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
