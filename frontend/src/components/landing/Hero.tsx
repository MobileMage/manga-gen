"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

interface HeroProps {
  ctaHref: string;
  ctaLabel: string;
  showDemo?: boolean;
}

export default function Hero({ ctaHref, ctaLabel, showDemo }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      {/* Giant watermark kanji */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span
          className="text-[min(50vw,500px)] font-black opacity-[0.025] leading-none"
          style={{ fontFamily: "var(--font-noto-sans-jp)" }}
        >
          漫
        </span>
      </div>

      {/* Subtle red glow */}
      <div
        className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
        {/* Text column */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="text-[11px] text-red-500 uppercase tracking-[0.35em] mb-5 text-center lg:text-left"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            AI Manga Generator
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.92] mb-7 text-center lg:text-left"
            style={{ fontFamily: "var(--font-noto-sans-jp)" }}
          >
            Your Story,
            <br />
            <span className="text-red-500">AI-Drawn.</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 max-w-md mx-auto lg:mx-0 mb-10 leading-relaxed text-center lg:text-left">
            Transform any idea into a complete manga &mdash; characters,
            panels, and pages &mdash; in minutes. No drawing skills required.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <Link
              href={ctaHref}
              className="group px-8 py-3.5 bg-red-500 hover:bg-red-600 rounded text-sm font-bold tracking-widest transition-all hover:shadow-lg hover:shadow-red-500/20"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              {ctaLabel}
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            {showDemo && (
              <Link
                href="/demo"
                className="group flex items-center gap-2 px-8 py-3.5 border border-gray-700 hover:border-gray-500 rounded text-sm font-bold tracking-widest text-gray-300 hover:text-white transition-all"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE DEMO
              </Link>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center justify-center lg:justify-start gap-8 mt-12 pt-8 border-t border-gray-800/60">
            {[
              { val: "4", label: "Genres" },
              { val: "12", label: "Max pages" },
              { val: "∞", label: "Stories" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="text-2xl font-black text-red-500"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  {s.val}
                </div>
                <div className="text-[11px] text-gray-600 uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hero illustrations — overlapping composition */}
        <motion.div
          className="relative lg:h-[540px]"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.25,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Red accent circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full border border-red-500/20 pointer-events-none" />
          <div className="absolute -top-2 -right-2 w-20 h-20 rounded-full bg-red-500/[0.08] pointer-events-none" />

          {/* hero.jpg */}
          <div
            className="relative z-10 rounded-sm overflow-hidden border-[3px] border-white/90 shadow-[0_0_60px_rgba(0,0,0,0.6)] max-w-[85%]"
            style={{ transform: "rotate(-2deg)" }}
          >
            <div className="relative aspect-square">
              <Image
                src="/images/leonardo/hero.jpg"
                alt="Manga warrior — ink illustration with white background"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-2 border-l-2 border-red-500/50 pointer-events-none" />
            <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-2 border-r-2 border-red-500/50 pointer-events-none" />
          </div>

          {/* hero-2.jpg */}
          <div
            className="relative z-20 -mt-28 sm:-mt-36 ml-[25%] rounded-sm overflow-hidden border-[3px] border-white/70 shadow-[0_0_60px_rgba(0,0,0,0.6)] max-w-[80%]"
            style={{ transform: "rotate(1.5deg)" }}
          >
            <div className="relative aspect-square">
              <Image
                src="/images/leonardo/hero-2.jpg"
                alt="Manga warrior with sword — dark atmospheric illustration"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-2 border-l-2 border-red-500/30 pointer-events-none" />
            <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-2 border-r-2 border-red-500/30 pointer-events-none" />
          </div>

          {/* Floating label */}
          <div
            className="absolute bottom-2 left-0 z-30 bg-red-500 px-4 py-1.5 text-[10px] font-bold tracking-[0.25em] uppercase shadow-lg"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            AI Generated
          </div>
        </motion.div>
      </div>
    </section>
  );
}
