/**
 * client/src/components/ImageUploader.tsx
 * Design: Atelier Mono — minimal drop zone with hairline border, dashed on drag
 */

import { useCallback, useRef, useState } from "react";
import { Upload, ClipboardPaste } from "lucide-react";

interface ImageUploaderProps {
  onImageReady: (imageData: ImageData, previewUrl: string) => void;
  maxWidth?: number;
  maxHeight?: number;
}

export function ImageUploader({
  onImageReady,
  maxWidth = 1024,
  maxHeight = 1024,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // Resize if needed
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        // Create preview URL from resized canvas
        const previewUrl = canvas.toDataURL("image/png");
        onImageReady(imageData, previewUrl);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [onImageReady, maxWidth, maxHeight]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div
      className={`
        relative w-full border transition-all duration-200 cursor-pointer
        ${isDragging
          ? "border-ochre border-dashed bg-ochre/5"
          : "border-border border-dashed hover:border-ochre/50 hover:bg-muted/30"
        }
      `}
      style={{ minHeight: "280px" }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onClick={() => fileInputRef.current?.click()}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          fileInputRef.current?.click();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
        <div className="flex items-center gap-3">
          <Upload
            className={`w-5 h-5 transition-colors ${isDragging ? "text-ochre" : "text-muted-foreground"}`}
          />
          <span className="font-mono text-sm text-muted-foreground tracking-wide uppercase">
            Drop image here
          </span>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground/60">
          <div className="h-px w-12 bg-border" />
          <span className="text-xs font-mono">or</span>
          <div className="h-px w-12 bg-border" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            className="px-4 py-2 text-sm font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse files
          </button>
          <div className="flex items-center gap-2 text-muted-foreground/60">
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">Ctrl+V to paste</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/50 font-mono mt-2">
          PNG, JPG, WebP — resized to {maxWidth}x{maxHeight} max
        </p>
      </div>
    </div>
  );
}
