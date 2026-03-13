"use client";

import { useState, useCallback, useRef } from "react";
import { useManga, type PanelImage } from "@/contexts/MangaContext";
import { useAuth } from "@/contexts/AuthContext";
import Toast from "@/components/Toast";
import { panelKey, getPanelGridStyle, getPanelAspectRatios } from "@/lib/panelLayout";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function StoryboardStep() {
  const {
    story,
    characterSheets,
    panelImages,
    generatingPanels,
    setGeneratingPanels,
    updatePanelImage,
    clearPanelImages,
    completeStep,
    setCurrentStep,
    genre,
  } = useManga();
  const { getToken } = useAuth();

  const pages = story?.pages ?? [];
  const [selectedPage, setSelectedPage] = useState(
    pages[0]?.page_number ?? 1
  );
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dismissError = useCallback(() => setError(null), []);
  const abortRef = useRef<AbortController | null>(null);

  const currentPage = pages.find((p) => p.page_number === selectedPage);

  // Progress tracking
  const totalPanels = pages.reduce((sum, p) => sum + p.panels.length, 0);
  const completedPanels = Array.from(panelImages.values()).filter(
    (p) => p.status === "complete"
  ).length;
  const allComplete = totalPanels > 0 && completedPanels === totalPanels;

  // Find current generating position for progress text
  const generatingPanel = Array.from(panelImages.values()).find(
    (p) => p.status === "generating"
  );

  const handleGenerate = async () => {
    if (!story || pages.length === 0) return;
    setError(null);
    clearPanelImages();

    // Mark all panels as pending
    for (const page of pages) {
      for (const panel of page.panels) {
        const key = panelKey(page.page_number, panel.panel_number);
        updatePanelImage(key, {
          pageNumber: page.page_number,
          panelNumber: panel.panel_number,
          status: "pending",
          imageDataUrl: "",
          errorMessage: undefined,
        });
      }
    }

    setGeneratingPanels(true);

    // Mark first panel as generating
    if (pages[0]?.panels[0]) {
      const firstKey = panelKey(
        pages[0].page_number,
        pages[0].panels[0].panel_number
      );
      updatePanelImage(firstKey, { status: "generating" });
    }

    try {
      const token = await getToken();

      // Build character_sheets dict: name -> base64 (strip data URL prefix)
      const sheetsDict: Record<string, string> = {};
      characterSheets.forEach((sheet, name) => {
        if (sheet.status === "complete" && sheet.imageDataUrl) {
          const b64 = sheet.imageDataUrl.replace(
            /^data:image\/\w+;base64,/,
            ""
          );
          sheetsDict[name] = b64;
        }
      });

      const stylePrompt = `Manga style, ${genre} genre. Cinematic composition`;

      // Compute aspect ratios from grid layout for each panel
      const panelAspectRatios: Record<string, string> = {};
      for (const page of story.pages) {
        const ratios = getPanelAspectRatios(page.panels.length);
        page.panels.forEach((panel, i) => {
          panelAspectRatios[panelKey(page.page_number, panel.panel_number)] =
            ratios[i] ?? "3:4";
        });
      }

      abortRef.current = new AbortController();

      const res = await fetch(`${BACKEND_URL}/api/generate/panels-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pages: story.pages,
          characters: story.characters,
          character_sheets: sheetsDict,
          genre,
          style_prompt: stylePrompt,
          panel_aspect_ratios: panelAspectRatios,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);

          if (payload === "[DONE]") break;

          try {
            const event = JSON.parse(payload) as {
              page_number: number;
              panel_number: number;
              image_base64: string;
              status: string;
              error_message: string;
            };

            const key = panelKey(event.page_number, event.panel_number);

            if (event.status === "complete") {
              updatePanelImage(key, {
                status: "complete",
                imageDataUrl: `data:image/png;base64,${event.image_base64}`,
                errorMessage: undefined,
              });
            } else {
              updatePanelImage(key, {
                status: "error",
                errorMessage: event.error_message,
              });
              setError(
                `Failed: Page ${event.page_number}, Panel ${event.panel_number}`
              );
            }

            // Mark next panel as generating
            let foundCurrent = false;
            for (const page of pages) {
              for (const panel of page.panels) {
                const k = panelKey(page.page_number, panel.panel_number);
                if (k === key) {
                  foundCurrent = true;
                  continue;
                }
                if (foundCurrent) {
                  const existing = panelImages.get(k);
                  if (!existing || existing.status === "pending") {
                    updatePanelImage(k, { status: "generating" });
                  }
                  foundCurrent = false; // Only mark next one
                  break;
                }
              }
              if (!foundCurrent) continue;
              break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setGeneratingPanels(false);
      abortRef.current = null;
    }
  };

  const handleContinue = () => {
    completeStep("storyboard");
    setCurrentStep("reader");
  };

  // Get panel script for selected panel
  const selectedPanelScript = (() => {
    if (!selectedPanel) return null;
    for (const page of pages) {
      for (const panel of page.panels) {
        if (panelKey(page.page_number, panel.panel_number) === selectedPanel) {
          return { page, panel };
        }
      }
    }
    return null;
  })();

  return (
    <div className="flex" style={{ height: "calc(100vh - 49px)" }}>
      {/* Left sidebar */}
      <div className="w-64 border-r border-gray-800 p-4 overflow-y-auto flex-shrink-0 fade-up flex flex-col">
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
            Generate manga panel artwork from the story script.
          </p>
        </div>

        {/* Page list */}
        <div className="space-y-2 mb-4 flex-1 overflow-y-auto">
          {pages.map((page) => {
            const isActive = page.page_number === selectedPage;
            // Compute panel statuses for this page
            const panelStatuses = page.panels.map((panel) => {
              const img = panelImages.get(
                panelKey(page.page_number, panel.panel_number)
              );
              return img?.status ?? "pending";
            });

            return (
              <button
                key={page.page_number}
                onClick={() => setSelectedPage(page.page_number)}
                className={`w-full text-left p-2.5 rounded-lg border-2 transition-all ${
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
                {/* Status dots */}
                <div className="flex gap-1">
                  {panelStatuses.map((status, i) => (
                    <div
                      key={i}
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
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress text */}
        {generatingPanels && generatingPanel && (
          <div
            className="text-xs text-gray-400 mb-3 text-center"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Page {generatingPanel.pageNumber}/{pages.length} — Panel{" "}
            {generatingPanel.panelNumber} ({completedPanels}/{totalPanels})
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generatingPanels || pages.length === 0}
          className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-xs tracking-wide mb-2"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {generatingPanels
            ? `GENERATING... (${completedPanels}/${totalPanels})`
            : "GENERATE ALL PANELS"}
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
      <div className="flex-1 screentone flex flex-col items-center justify-center p-8 overflow-y-auto">
        {!currentPage ? (
          /* No page selected */
          <div className="text-gray-600 text-sm">No pages available</div>
        ) : panelImages.size === 0 && !generatingPanels ? (
          /* Idle state */
          <div
            className="text-center fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div
              className="text-8xl font-black opacity-5 mb-4"
              style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
            >
              {"\u30B3\u30DE"}
            </div>
            <div className="text-gray-600 text-sm max-w-sm mx-auto leading-relaxed">
              Panel artwork will appear here. Click &ldquo;Generate All
              Panels&rdquo; to create manga art from your story script.
            </div>
          </div>
        ) : (
          /* Page canvas with panels */
          <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
            {/* Manga page */}
            <div
              className="bg-white rounded shadow-2xl w-full"
              style={{ aspectRatio: "7/10" }}
            >
              <div className="w-full h-full p-2">
                <PanelGrid
                  page={currentPage}
                  panelImages={panelImages}
                  selectedPanel={selectedPanel}
                  onSelectPanel={setSelectedPanel}
                />
              </div>
            </div>

            {/* Selected panel details */}
            {selectedPanelScript && (
              <div className="w-full bg-gray-900/80 border border-gray-800 rounded-lg p-4 fade-up">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs text-gray-500 uppercase tracking-widest"
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                    }}
                  >
                    Page {selectedPanelScript.page.page_number}, Panel{" "}
                    {selectedPanelScript.panel.panel_number}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
                    {selectedPanelScript.panel.mood}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  {selectedPanelScript.panel.description}
                </p>
                {selectedPanelScript.panel.dialogue && (
                  <p className="text-xs text-gray-500 italic">
                    &ldquo;{selectedPanelScript.panel.dialogue}&rdquo;
                  </p>
                )}
                {selectedPanelScript.panel.characters_present.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {selectedPanelScript.panel.characters_present.map(
                      (name) => (
                        <span
                          key={name}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
                        >
                          {name}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Toast message={error} onDismiss={dismissError} />
    </div>
  );
}

/** Panel grid inside the white manga page */
function PanelGrid({
  page,
  panelImages,
  selectedPanel,
  onSelectPanel,
}: {
  page: { page_number: number; panels: { panel_number: number; description: string; dialogue: string; mood: string }[] };
  panelImages: Map<string, PanelImage>;
  selectedPanel: string | null;
  onSelectPanel: (key: string | null) => void;
}) {
  const panels = page.panels;
  const { gridTemplateColumns, spans } = getPanelGridStyle(panels.length);

  return (
    <div
      className="grid gap-1.5 w-full h-full"
      style={{ gridTemplateColumns }}
    >
      {panels.map((panel, i) => {
        const key = panelKey(page.page_number, panel.panel_number);
        const img = panelImages.get(key);
        const isSelected = selectedPanel === key;
        const span = spans[i] ?? 1;

        return (
          <button
            key={key}
            onClick={() => onSelectPanel(isSelected ? null : key)}
            className={`relative overflow-hidden border-2 transition-all rounded-sm ${
              isSelected
                ? "border-red-500 ring-2 ring-red-500/30"
                : "border-black hover:border-gray-700"
            }`}
            style={{ gridColumn: `span ${span}` }}
          >
            {img?.status === "complete" && img.imageDataUrl ? (
              <img
                src={img.imageDataUrl}
                alt={`Panel ${panel.panel_number}`}
                className="w-full h-full object-cover"
              />
            ) : img?.status === "generating" ? (
              <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-red-500 rounded-full animate-spin mb-2" />
                <span className="text-[10px] text-gray-400">
                  Generating...
                </span>
              </div>
            ) : img?.status === "error" ? (
              <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center p-2">
                <span className="text-red-400 text-xs font-bold mb-1">
                  Error
                </span>
                <span className="text-[9px] text-red-300 text-center line-clamp-2">
                  {img.errorMessage ?? "Generation failed"}
                </span>
              </div>
            ) : (
              /* Pending / empty state */
              <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-2">
                <span className="text-gray-400 text-xs font-bold mb-1">
                  {panel.panel_number}
                </span>
                <span className="text-[9px] text-gray-400 text-center line-clamp-3">
                  {panel.description}
                </span>
                {panel.dialogue && (
                  <span className="text-[8px] text-gray-300 italic mt-1 line-clamp-1">
                    &ldquo;{panel.dialogue}&rdquo;
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
