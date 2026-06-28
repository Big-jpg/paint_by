/**
 * client/src/pages/Home.tsx
 * Design: Atelier Mono — single-column workspace, output-first
 */

import { useCallback, useEffect, useState } from "react";
import { ImageUploader } from "../components/ImageUploader";
import { ProcessingProgress } from "../components/ProcessingProgress";
import { ResultView } from "../components/ResultView";
import { SettingsPanel } from "../components/SettingsPanel";
import { usePbnWorker, type PbnSettings } from "../hooks/usePbnWorker";
import { imageFileToData } from "../lib/imageData";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663056684383/hgP5jjpvxGXvGrobPfFbvS/pbn-logo-gZVHmbuQ3u4ghWCuDz7qhk.webp";

export default function Home() {
  const {
    status,
    progress,
    overallProgress,
    elapsedMs,
    isQuiet,
    result,
    error,
    process,
    cancel,
    reset,
  } = usePbnWorker();

  const [settings, setSettings] = useState<PbnSettings>({
    imageTreatment: "color",
    paletteSize: 14,
    paperSize: "A1",
    orientation: "landscape",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageReady = useCallback(
    (imageData: ImageData, preview: string) => {
      setPreviewUrl(preview);
      process(imageData, settings);
    },
    [process, settings]
  );

  const handleReset = useCallback(() => {
    reset();
    setPreviewUrl(null);
  }, [reset]);

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (status !== "idle") return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            void imageFileToData(file, {
              treatment: settings.imageTreatment,
              paperSize: settings.paperSize,
              orientation: settings.orientation,
            }).then(({ imageData, previewUrl }) => {
              setPreviewUrl(previewUrl);
              process(imageData, settings);
            });
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [status, process, settings]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center gap-3 py-4">
          <img src={LOGO_URL} alt="" className="w-8 h-8" />
          <h1 className="font-mono text-sm font-medium tracking-wide">
            Paint by Numbers
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {/* Idle state: upload + settings */}
          {status === "idle" && !result && (
            <>
              <div className="mb-2">
                <h2 className="text-lg font-medium">
                  Drop an image. Get a numbered canvas.
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All processing runs locally in your browser.
                </p>
              </div>
              <ImageUploader
                onImageReady={handleImageReady}
                prepOptions={{
                  treatment: settings.imageTreatment,
                  paperSize: settings.paperSize,
                  orientation: settings.orientation,
                }}
              />
              <SettingsPanel settings={settings} onChange={setSettings} />
            </>
          )}

          {/* Processing state */}
          {status === "processing" && (
            <div className="flex flex-col items-center gap-6">
              {previewUrl && (
                <div className="w-32 h-32 border border-border overflow-hidden opacity-60">
                  <img
                    src={previewUrl}
                    alt="Source"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <ProcessingProgress
                progress={progress}
                overallProgress={overallProgress}
                elapsedMs={elapsedMs}
                isQuiet={isQuiet}
                onCancel={() => {
                  cancel();
                  setPreviewUrl(null);
                }}
              />
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="font-mono text-sm text-destructive">
                Error: {error}
              </p>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
              >
                Try again
              </button>
            </div>
          )}

          {/* Result state */}
          {status === "done" && result && (
            <ResultView result={result} onReset={handleReset} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="container">
          <p className="font-mono text-[10px] text-muted-foreground/50 text-center">
            Client-side processing — no data leaves your browser
          </p>
        </div>
      </footer>
    </div>
  );
}
