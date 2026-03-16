"use client";

import { useState, useCallback, useRef } from "react";
import { useManga } from "@/contexts/MangaContext";
import { useAuth } from "@/contexts/AuthContext";
import { generatePages } from "@/lib/generatePipeline";
import Toast from "@/components/Toast";

export default function StoryboardStep() {
  const {
    story,
    characterSheets,
    pageImages,
    generatingPages,
    setGeneratingPages,
    updatePageImage,
    clearPageImages,
    completeStep,
    setCurrentStep,
    genre,
  } = useManga();
  const { getToken } = useAuth();

  const pages = story?.pages ?? [];
  const [selectedPage, setSelectedPage] = useState(
    pages[0]?.page_number ?? 1
  );
  const [error, setError] = useState<string | null>(null);
  const dismissError = useCallback(() => setError(null), []);
  const abortRef = useRef<AbortController | null>(null);

  const currentPage = pages.find((p) => p.page_number === selectedPage);

  // Progress tracking
  const totalPages = pages.length;
  const completedPages = Array.from(pageImages.values()).filter(
    (p) => p.status === "complete"
  ).length;
  const allComplete = totalPages > 0 && completedPages === totalPages;

  const generatingPage = Array.from(pageImages.values()).find(
    (p) => p.status === "generating"
  );

  const handleGenerate = async () => {
    if (!story || pages.length === 0) return;
    setError(null);
    clearPageImages();

    // Mark all pages as pending
    for (const page of pages) {
      updatePageImage(page.page_number, {
        pageNumber: page.page_number,
        status: "pending",
        imageDataUrl: "",
        errorMessage: undefined,
      });
    }

    setGeneratingPages(true);

    // Mark first page as generating
    if (pages[0]) {
      updatePageImage(pages[0].page_number, { status: "generating" });
    }

    try {
      const token = await getToken();
      abortRef.current = new AbortController();

      await generatePages({
        story,
        characterSheets,
        genre,
        token,
        signal: abortRef.current.signal,
        callbacks: {
          onPageComplete: (pageNumber, imageDataUrl) => {
            updatePageImage(pageNumber, {
              status: "complete",
              imageDataUrl,
              errorMessage: undefined,
            });
          },
          onPageError: (pageNumber, errorMessage) => {
            updatePageImage(pageNumber, { status: "error", errorMessage });
            setError(`Failed: Page ${pageNumber}`);
          },
          onPageGenerating: (pageNumber) => {
            updatePageImage(pageNumber, { status: "generating" });
          },
        },
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setGeneratingPages(false);
      abortRef.current = null;
    }
  };

  const handleContinue = () => {
    completeStep("storyboard");
    setCurrentStep("reader");
  };

  // Get page script for selected page (for reference display)
  const selectedPageScript = currentPage ?? null;

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-49px)]">
      {/* Left sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-800 p-4 overflow-y-auto md:flex-shrink-0 fade-up flex flex-col">
        <div className="mb-4">
          <div
            className="text-xs text-gray-500 uppercase tracking-widest mb-1"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Step 03
          </div>
          <h2
            className="text-xl font-black"
            style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
          >
            Storyboard
          </h2>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Generate complete manga pages from the story script.
          </p>
        </div>

        {/* Page list */}
        <div className="flex gap-2 overflow-x-auto md:flex-col md:space-y-2 md:overflow-x-visible mb-4 md:flex-1 md:overflow-y-auto pb-2 md:pb-0">
          {pages.map((page) => {
            const isActive = page.page_number === selectedPage;
            const img = pageImages.get(page.page_number);
            const status = img?.status ?? "pending";

            return (
              <button
                key={page.page_number}
                onClick={() => setSelectedPage(page.page_number)}
                className={`flex-shrink-0 md:flex-shrink md:w-full text-left p-2.5 rounded-lg border-2 transition-all ${
                  isActive
                    ? "border-red-500 bg-red-500/5"
                    : "border-gray-800 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white">
                    Page {page.page_number}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                    {page.panels.length} panels
                  </span>
                </div>
                {/* Status indicator */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      status === "complete"
                        ? "bg-green-500"
                        : status === "generating"
                          ? "bg-yellow-500 animate-pulse"
                          : status === "error"
                            ? "bg-red-500"
                            : "bg-gray-600"
                    }`}
                  />
                  <span className="text-[10px] text-gray-500 capitalize">
                    {status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress text */}
        {generatingPages && generatingPage && (
          <div
            className="text-xs text-gray-400 mb-3 text-center"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Page {generatingPage.pageNumber}/{totalPages} ({completedPages}/
            {totalPages})
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generatingPages || pages.length === 0}
          className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-xs tracking-wide mb-2"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {generatingPages
            ? `GENERATING... (${completedPages}/${totalPages})`
            : "GENERATE ALL PAGES"}
        </button>

        {/* Continue button */}
        {allComplete && (
          <button
            onClick={handleContinue}
            className="w-full py-2.5 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-lg transition-all text-xs tracking-wide fade-up"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            CONTINUE TO READER &rarr;
          </button>
        )}
      </div>

      {/* Right canvas area */}
      <div className="flex-1 screentone flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto min-h-64 md:min-h-0">
        {!currentPage ? (
          <div className="text-gray-600 text-sm">No pages available</div>
        ) : pageImages.size === 0 && !generatingPages ? (
          /* Idle state */
          <div
            className="text-center fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div
              className="text-6xl md:text-8xl font-black opacity-5 mb-4"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              {"\u30B3\u30DE"}
            </div>
            <div className="text-gray-600 text-sm max-w-sm mx-auto leading-relaxed">
              Page artwork will appear here. Click &ldquo;Generate All
              Pages&rdquo; to create manga pages from your story script.
            </div>
          </div>
        ) : (
          /* Page display */
          <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
            {/* Manga page */}
            <div
              className="bg-white rounded shadow-2xl w-full overflow-hidden max-h-[60vh] md:max-h-none"
              style={{ aspectRatio: "2/3" }}
            >
              {(() => {
                const img = pageImages.get(selectedPage);
                if (img?.status === "complete" && img.imageDataUrl) {
                  return (
                    <img
                      src={img.imageDataUrl}
                      alt={`Page ${selectedPage}`}
                      className="w-full h-full object-cover"
                    />
                  );
                }
                if (img?.status === "generating") {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                      <div className="w-8 h-8 border-2 border-gray-400 border-t-red-500 rounded-full animate-spin mb-3" />
                      <span className="text-sm text-gray-400">
                        Generating page...
                      </span>
                    </div>
                  );
                }
                if (img?.status === "error") {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 p-4">
                      <span className="text-red-400 text-sm font-bold mb-2">
                        Error
                      </span>
                      <span className="text-xs text-red-300 text-center">
                        {img.errorMessage ?? "Generation failed"}
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
                    <span className="text-gray-400 text-sm">
                      Page {selectedPage}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      Waiting to generate...
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Page script reference */}
            {selectedPageScript && (
              <div className="w-full bg-gray-900/80 border border-gray-800 rounded-lg p-4 fade-up">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs text-gray-500 uppercase tracking-widest"
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                    }}
                  >
                    Page {selectedPageScript.page_number} Script
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                    {selectedPageScript.panels.length} panels
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedPageScript.panels.map((panel) => (
                    <div
                      key={panel.panel_number}
                      className="text-xs text-gray-400 border-l-2 border-gray-700 pl-2"
                    >
                      <span className="text-gray-500 font-bold">
                        P{panel.panel_number}:
                      </span>{" "}
                      {panel.description}
                      {panel.dialogue && (
                        <span className="text-gray-600 italic ml-1">
                          &ldquo;{panel.dialogue}&rdquo;
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Toast message={error} onDismiss={dismissError} />
    </div>
  );
}
