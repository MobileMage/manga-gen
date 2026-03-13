"use client";

import Link from "next/link";
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
  const { currentStep, setCurrentStep, completedSteps } = useManga();

  return (
    <div
      className="border-b border-gray-800 px-6 py-3 flex items-center justify-between"
      style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.8)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
        >
          <span className="text-red-500">漫</span>
          <span className="text-white">enpitsu</span>
        </Link>
        <div className="text-gray-600 text-xs">v0.1</div>
      </div>

      {/* Step navigation */}
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
                console.log("[topbar] Navigate to step:", s.id);
                setCurrentStep(s.id);
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                isActive
                  ? "bg-red-500 text-white"
                  : isCompleted
                    ? "text-gray-300 hover:text-white hover:bg-gray-800"
                    : "text-gray-700 cursor-not-allowed"
              }`}
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              {String(i + 1).padStart(2, "0")}. {s.label}
            </button>
          );
        })}
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-400">
          {user?.email?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <button
          onClick={signOut}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
}
