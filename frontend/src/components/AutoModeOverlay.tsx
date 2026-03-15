"use client";

import { useManga } from "@/contexts/MangaContext";

const STEP_LABELS: Record<string, { label: string; kanji: string }> = {
  concept: { label: "Generating Story", kanji: "執筆中" },
  characters: { label: "Generating Characters", kanji: "設定" },
  storyboard: { label: "Generating Pages", kanji: "コマ" },
};

export default function AutoModeOverlay() {
  const {
    autoMode,
    autoPaused,
    setAutoPaused,
    setAutoMode,
    generating,
    generatingSheets,
    generatingPages,
    currentStep,
    story,
    characterSheets,
    pageImages,
  } = useManga();

  const isAnythingGenerating = generating || generatingSheets || generatingPages;

  if (!autoMode || !isAnythingGenerating) return null;

  const stepInfo = STEP_LABELS[currentStep] ?? { label: "Processing", kanji: "処理" };

  let progress = "";
  let completedThumbnails: string[] = [];

  if (generatingSheets && story) {
    const total = story.characters.length;
    const done = story.characters.filter(
      (c) => characterSheets.get(c.name)?.status === "complete"
    ).length;
    progress = `${done}/${total}`;
    completedThumbnails = story.characters
      .map((c) => characterSheets.get(c.name))
      .filter((s) => s?.status === "complete" && s.imageDataUrl)
      .map((s) => s!.imageDataUrl);
  } else if (generatingPages && story) {
    const total = story.pages.length;
    const done = Array.from(pageImages.values()).filter(
      (p) => p.status === "complete"
    ).length;
    progress = `${done}/${total}`;
    completedThumbnails = Array.from(pageImages.values())
      .filter((p) => p.status === "complete" && p.imageDataUrl)
      .map((p) => p.imageDataUrl);
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/90 border border-gray-700 rounded-full px-4 py-2 shadow-2xl backdrop-blur-sm">
      {/* Kanji badge */}
      <span
        className="text-lg font-black animate-pulse"
        style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
      >
        {stepInfo.kanji}
      </span>

      {/* Label + progress */}
      <span
        className="text-xs text-gray-400 tracking-wider uppercase"
        style={{ fontFamily: "var(--font-space-mono), monospace" }}
      >
        {stepInfo.label}{progress ? ` ${progress}` : ""}
      </span>

      {/* Thumbnails */}
      {completedThumbnails.length > 0 && (
        <div className="flex gap-1">
          {completedThumbnails.slice(-4).map((src, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded border border-gray-600 overflow-hidden"
            >
              <img
                src={src}
                alt={`${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Pause / Resume */}
      <button
        onClick={() => setAutoPaused(!autoPaused)}
        className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider transition-all ${
          autoPaused
            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
        }`}
        style={{ fontFamily: "var(--font-space-mono), monospace" }}
      >
        {autoPaused ? "▶ RESUME" : "⏸ PAUSE"}
      </button>

      {/* Cancel */}
      <button
        onClick={() => {
          setAutoMode(false);
          setAutoPaused(false);
        }}
        className="text-gray-600 hover:text-red-400 transition-colors text-sm"
        title="Cancel auto mode"
      >
        ✕
      </button>
    </div>
  );
}
