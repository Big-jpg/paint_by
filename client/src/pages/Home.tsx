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
import type { PreparedImage } from "../lib/imageData";

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preparedImage, setPreparedImage] = useState<PreparedImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setPreparedImage(null);
    setPreviewUrl(null);
    setPrepError(null);
  }, []);

  const handleCreate = useCallback(() => {
    if (!preparedImage || isPreparing) return;
    process(preparedImage.imageData, settings);
  }, [isPreparing, preparedImage, process, settings]);

  const handleReset = useCallback(() => {
    reset();
    setSelectedFile(null);
    setPreparedImage(null);
    setPreviewUrl(null);
    setPrepError(null);
  }, [reset]);

  useEffect(() => {
    if (!selectedFile || status !== "idle") return;

    let isActive = true;
    setIsPreparing(true);
    setPrepError(null);

    void imageFileToData(selectedFile, {
      treatment: settings.imageTreatment,
      paperSize: settings.paperSize,
      orientation: settings.orientation,
    })
      .then(prepared => {
        if (!isActive) return;
        setPreparedImage(prepared);
        setPreviewUrl(prepared.previewUrl);
      })
      .catch(error => {
        if (!isActive) return;
        setPreparedImage(null);
        setPreviewUrl(null);
        setPrepError((error as Error).message || "Could not prepare image");
      })
      .finally(() => {
        if (isActive) {
          setIsPreparing(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    selectedFile,
    settings.imageTreatment,
    settings.orientation,
    settings.paperSize,
    status,
  ]);

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
            handleFileSelected(file);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFileSelected, status]);

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
          {/* Idle state: upload, verify, configure, create */}
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

              {!selectedFile && (
                <ImageUploader onFileSelected={handleFileSelected} />
              )}

              {selectedFile && (
                <>
                  <section className="grid gap-5 border border-border p-4 lg:grid-cols-[minmax(320px,0.8fr)_1fr]">
                    <div className="border border-border bg-white overflow-hidden">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Prepared source preview"
                          className="block w-full max-h-[360px] object-contain"
                        />
                      ) : (
                        <div className="min-h-[220px] flex items-center justify-center p-4 text-center font-mono text-xs text-muted-foreground">
                          Preparing preview
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between gap-4">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                          Selected image
                        </p>
                        <h3 className="mt-1 text-base font-medium break-all">
                          {selectedFile.name}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Verify the image, choose the artwork settings below,
                          then create the paint-by-numbers output.
                        </p>
                        {prepError && (
                          <p className="mt-3 font-mono text-xs text-destructive">
                            {prepError}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreparedImage(null);
                          setPreviewUrl(null);
                          setPrepError(null);
                        }}
                        className="w-fit px-4 py-2 text-sm font-mono border border-border hover:border-foreground/30 transition-all active:scale-[0.97]"
                      >
                        Change image
                      </button>
                    </div>
                  </section>

                  <SettingsPanel settings={settings} onChange={setSettings} />

                  <div className="flex items-center justify-between gap-4 border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      {isPreparing
                        ? "Preparing the preview with your selected settings."
                        : "Ready to create your numbered artwork."}
                    </p>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!preparedImage || isPreparing || !!prepError}
                      className="px-5 py-2 text-sm font-mono border border-foreground bg-foreground text-background transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                      {isPreparing ? "Preparing" : "Create"}
                    </button>
                  </div>
                </>
              )}
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
                  setSelectedFile(null);
                  setPreparedImage(null);
                  setPreviewUrl(null);
                  setPrepError(null);
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
