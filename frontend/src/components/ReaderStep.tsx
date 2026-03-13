"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useManga, type PanelImage, type PageScript } from "@/contexts/MangaContext";
import { panelKey, getPanelGridStyle } from "@/lib/panelLayout";
import { exportMangaPdf } from "@/lib/exportPdf";

export default function ReaderStep() {
  const { story, panelImages } = useManga();

  const pages = story?.pages ?? [];
  const totalPages = pages.length;
  const [currentVisiblePage, setCurrentVisiblePage] = useState<"cover" | number>("cover");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [exporting, setExporting] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Intersection observer for scroll tracking
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            const page = (entry.target as HTMLElement).dataset.page;
            if (page === "cover") {
              setCurrentVisiblePage("cover");
            } else if (page) {
              setCurrentVisiblePage(parseInt(page));
            }
          }
        }
      },
      { root: container, threshold: 0.4 }
    );

    // Observe cover
    if (coverRef.current) observer.observe(coverRef.current);

    // Observe pages
    pageRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pages.length]);

  const handleExport = useCallback(async () => {
    if (!story || !coverRef.current) return;
    setExporting(true);
    try {
      await exportMangaPdf({
        title: story.title,
        pages: story.pages,
        panelImages,
        coverRef: coverRef.current,
      });
    } catch (e) {
      console.error("[reader] PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  }, [story, panelImages]);

  const pageLabel =
    currentVisiblePage === "cover"
      ? "Cover"
      : `Page ${currentVisiblePage} of ${totalPages}`;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 49px)" }}>
      {/* Sticky toolbar */}
      <div
        className="sticky top-0 z-10 border-b border-gray-800 px-6 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.8)" }}
      >
        {/* Left: label */}
        <span
          className="text-xs text-gray-500 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          Reading Mode
        </span>

        {/* Center: page counter */}
        <span
          className="text-xs text-gray-400"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {pageLabel}
        </span>

        {/* Right: RTL toggle + Export */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDirection((d) => (d === "ltr" ? "rtl" : "ltr"))}
            className="px-2.5 py-1 rounded border border-gray-700 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-all"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
            title={direction === "ltr" ? "Switch to RTL (right-to-left)" : "Switch to LTR (left-to-right)"}
          >
            {direction === "ltr" ? "LTR" : "RTL"}
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-all tracking-wide"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {exporting ? "EXPORTING..." : "EXPORT PDF"}
          </button>
        </div>
      </div>

      {/* Scroll area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto screentone"
      >
        <div className="flex flex-col items-center gap-8 py-8 px-4">
          {/* Cover page */}
          <div
            ref={coverRef}
            data-page="cover"
            className="bg-white rounded shadow-2xl w-full max-w-lg flex flex-col items-center justify-center px-8"
            style={{ aspectRatio: "7/10" }}
          >
            {story && (
              <div className="text-center">
                <div
                  className="text-4xl font-black text-gray-900 mb-4 leading-tight"
                  style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
                >
                  {story.title_japanese}
                </div>
                <div className="w-16 h-0.5 bg-red-500 mx-auto mb-4" />
                <div
                  className="text-sm text-gray-600 tracking-widest uppercase mb-8"
                  style={{ fontFamily: "var(--font-space-mono), monospace" }}
                >
                  {story.title}
                </div>
                <div className="text-xs text-gray-400">
                  Generated with{" "}
                  <span style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}>
                    漫GEN
                  </span>{" "}
                  &times; Gemini
                </div>
              </div>
            )}
          </div>

          {/* Manga pages */}
          {pages.map((page) => (
            <div
              key={page.page_number}
              ref={(el) => {
                if (el) pageRefs.current.set(String(page.page_number), el);
              }}
              data-page={page.page_number}
              className="bg-white rounded shadow-2xl w-full max-w-lg"
              style={{ aspectRatio: "7/10" }}
            >
              <div className="w-full h-full p-1.5">
                <ReadOnlyPanelGrid
                  page={page}
                  panelImages={panelImages}
                  direction={direction}
                />
              </div>
            </div>
          ))}

          {/* End spacer */}
          <div
            className="text-xs text-gray-600 py-8"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            — END —
          </div>
        </div>
      </div>
    </div>
  );
}

/** Read-only panel grid — same layout as StoryboardStep but non-interactive */
function ReadOnlyPanelGrid({
  page,
  panelImages,
  direction,
}: {
  page: PageScript;
  panelImages: Map<string, PanelImage>;
  direction: "ltr" | "rtl";
}) {
  const panels = page.panels;
  const { gridTemplateColumns, spans } = getPanelGridStyle(panels.length);

  return (
    <div
      className="grid gap-0.5 w-full h-full"
      style={{ gridTemplateColumns, direction }}
    >
      {panels.map((panel, i) => {
        const key = panelKey(page.page_number, panel.panel_number);
        const img = panelImages.get(key);
        const span = spans[i] ?? 1;

        return (
          <div
            key={key}
            className="relative overflow-hidden border border-black"
            style={{ gridColumn: `span ${span}`, direction: "ltr" }}
          >
            {img?.status === "complete" && img.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.imageDataUrl}
                alt={`Page ${page.page_number}, Panel ${panel.panel_number}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
