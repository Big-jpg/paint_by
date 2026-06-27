/**
 * client/src/components/ImageUploader.tsx
 * Design: Atelier Mono — minimal drop zone with hairline border, dashed on drag
 */

import { useCallback, useRef, useState } from "react";
import { Upload, ClipboardPaste } from "lucide-react";
import { imageFileToData } from "../lib/imageData";
import type { ImagePrepOptions } from "../lib/imageData";

interface ImageUploaderProps {
  onImageReady: (imageData: ImageData, previewUrl: string) => void;
  maxWidth?: number;
  maxHeight?: number;
  prepOptions?: ImagePrepOptions;
}

export function ImageUploader({
  onImageReady,
  maxWidth = 1024,
  maxHeight = 1024,
  prepOptions,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const { imageData, previewUrl } = await imageFileToData(file, {
        ...prepOptions,
        maxWidth,
        maxHeight,
      });
      onImageReady(imageData, previewUrl);
    },
    [onImageReady, maxWidth, maxHeight, prepOptions]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
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
          if (file) void processFile(file);
          break;
        }
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
    },
    [processFile]
  );

  return (
    <div
      className={`
        relative w-full border transition-all duration-200 cursor-pointer
        ${
          isDragging
            ? "border-ochre border-dashed bg-ochre/5"
            : "border-border border-dashed hover:border-ochre/50 hover:bg-muted/30"
        }
      `}
      style={{ minHeight: "280px" }}
      onDragOver={e => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onClick={() => fileInputRef.current?.click()}
      tabIndex={0}
      onKeyDown={e => {
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
            onClick={e => {
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
