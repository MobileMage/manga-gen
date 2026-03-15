"use client";

import { useManga } from "@/contexts/MangaContext";

export default function AutoModeToggle() {
  const { autoMode, setAutoMode, autoPaused, setAutoPaused, generating, generatingSheets, generatingPages } = useManga();

  const isRunning = autoMode && !autoPaused;
  const isAnythingGenerating = generating || generatingSheets || generatingPages;

  return (
    <div className="flex items-center gap-3">
      {/* Toggle */}
      <button
        onClick={() => {
          if (autoMode) {
            setAutoMode(false);
            setAutoPaused(false);
          } else {
            setAutoMode(true);
            setAutoPaused(false);
          }
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-xs font-bold tracking-wider ${
          autoMode
            ? "border-red-500 bg-red-500/10 text-red-400"
            : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
        }`}
        style={{ fontFamily: "var(--font-space-mono), monospace" }}
      >
        <div
          className={`w-8 h-4 rounded-full relative transition-all ${
            autoMode ? "bg-red-500" : "bg-gray-700"
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${
              autoMode ? "left-4.5" : "left-0.5"
            }`}
          />
        </div>
        AUTO MODE
      </button>

      {/* Pause/Resume when auto mode is active and generating */}
      {autoMode && isAnythingGenerating && (
        <button
          onClick={() => setAutoPaused(!autoPaused)}
          className={`px-3 py-2 rounded-lg border-2 transition-all text-xs font-bold tracking-wider ${
            autoPaused
              ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
              : "border-gray-700 text-gray-400 hover:border-red-500/50 hover:text-red-400"
          }`}
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {autoPaused ? "RESUME" : "PAUSE"}
        </button>
      )}
    </div>
  );
}
