"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useManga, type Step } from "@/contexts/MangaContext";

const STEPS: { id: Step; label: string }[] = [
  { id: "concept", label: "CONCEPT" },
  { id: "characters", label: "CHARACTERS" },
  { id: "storyboard", label: "STORYBOARD" },
  { id: "reader", label: "READER" },
];

export default function TopBar() {
  const { user, signOut } = useAuth();
  const { currentStep, setCurrentStep, completedSteps, mode, setMode, autoMode, autoPaused, setAutoPaused } = useManga();

  return (
    <div
      className="border-b border-gray-800 px-3 sm:px-6 py-3 flex items-center justify-between"
      style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.8)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div
          className="text-xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
        >
          <span className="text-red-500">漫</span>
          <span className="text-white">enpitsu</span>
        </div>
        <div className="hidden sm:block text-gray-600 text-xs">v0.2</div>
      </div>

      {/* Center: Mode toggle + Step navigation */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mode toggle */}
        <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setMode("story")}
            className={`px-2 sm:px-3 py-1.5 text-xs font-medium transition-all ${
              mode === "story"
                ? "bg-red-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            <span className="sm:hidden">S</span>
            <span className="hidden sm:inline">STORY</span>
          </button>
          <button
            onClick={() => setMode("sketch")}
            className={`px-2 sm:px-3 py-1.5 text-xs font-medium transition-all ${
              mode === "sketch"
                ? "bg-red-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            <span className="sm:hidden">K</span>
            <span className="hidden sm:inline">SKETCH</span>
          </button>
        </div>

        {/* Step navigation (story mode only) */}
        {mode === "story" && (
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const isActive = s.id === currentStep;
              const isCompleted = completedSteps.has(s.id);
              const isEnabled = isActive || isCompleted;

              return (
                <button
                  key={s.id}
                  disabled={!isEnabled}
                  onClick={() => {
                    if (!isEnabled) return;
                    setCurrentStep(s.id);
                  }}
                  className={`px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    isActive
                      ? "bg-red-500 text-white"
                      : isCompleted
                        ? "text-gray-300 hover:text-white hover:bg-gray-800"
                        : "text-gray-700 cursor-not-allowed"
                  }`}
                  style={{ fontFamily: "var(--font-space-mono), monospace" }}
                >
                  {String(i + 1).padStart(2, "0")}<span className="hidden sm:inline">. {s.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Auto badge + User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {autoMode && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                autoPaused
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
              }`}
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              {autoPaused ? "PAUSED" : "AUTO"}
            </span>
            <button
              onClick={() => setAutoPaused(!autoPaused)}
              className="hidden sm:block text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              {autoPaused ? "RESUME" : "PAUSE"}
            </button>
          </div>
        )}
        <button
          onClick={signOut}
          title="Sign out"
          className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 hover:border-red-500/50 flex items-center justify-center text-xs text-gray-400 transition-colors"
        >
          {user?.email?.charAt(0).toUpperCase() ?? "?"}
        </button>
        <button
          onClick={signOut}
          className="hidden sm:block text-xs text-gray-500 hover:text-gray-300 transition-colors"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
}
