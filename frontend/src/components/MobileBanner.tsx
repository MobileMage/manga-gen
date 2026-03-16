"use client";

import { useState } from "react";

export default function MobileBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="md:hidden flex items-center justify-between gap-3 px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base flex-shrink-0">⚡</span>
        <span
          className="text-xs leading-snug"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          Best experienced on a larger screen
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-yellow-500/60 hover:text-yellow-400 transition-colors text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
