"use client";

import Link from "next/link";

interface NavbarProps {
  ctaHref: string;
  ctaLabel: string;
  showDemo?: boolean;
  onDemoClick?: () => void;
}

export default function Navbar({ ctaHref, ctaLabel, showDemo, onDemoClick }: NavbarProps) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
      style={{ backdropFilter: "blur(20px)", background: "rgba(0,0,0,0.75)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-noto-sans-jp)" }}
        >
          <span className="text-red-500">漫</span>
          <span>enpitsu</span>
        </Link>

        <div className="flex items-center gap-6">
          <a
            href="#showcase"
            className="hidden sm:block text-xs text-gray-500 hover:text-white transition-colors tracking-wide"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            SHOWCASE
          </a>
          {showDemo && (
            <button
              onClick={onDemoClick}
              className="hidden sm:inline-block px-5 py-2 border border-gray-700 hover:border-gray-500 rounded text-xs font-bold tracking-widest text-gray-300 hover:text-white transition-all"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              TRY DEMO
            </button>
          )}
          <Link
            href={ctaHref}
            className="hidden sm:inline-block px-5 py-2 bg-red-500 hover:bg-red-600 rounded text-xs font-bold tracking-widest transition-colors"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}
