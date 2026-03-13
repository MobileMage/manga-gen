"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Showcase() {
  return (
    <section id="showcase" className="relative py-28 sm:py-36">
      {/* Diagonal red stripe — background texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[40%] -left-[20%] w-[140%] h-28 bg-red-500/[0.02] -rotate-[2.5deg]" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          <span
            className="text-[11px] text-red-500 uppercase tracking-[0.35em] block mb-4"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            See It In Action
          </span>
          <h2
            className="text-4xl sm:text-5xl font-black"
            style={{ fontFamily: "var(--font-noto-sans-jp)" }}
          >
            From Idea to Manga
          </h2>
        </motion.div>

        {/* Character Sheets */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="grid lg:grid-cols-5 gap-10 lg:gap-12 items-center mb-28"
        >
          <div className="lg:col-span-3 relative group">
            <div className="rounded-xl overflow-hidden border border-gray-800/80 shadow-2xl shadow-black/40 transition-transform duration-500 group-hover:scale-[1.01]">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0a0a0a] border-b border-gray-800/60">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-gray-700" />
                <div className="w-3 h-3 rounded-full bg-gray-700" />
                <span
                  className="ml-3 text-[10px] text-gray-600"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  enpitsu &mdash; Characters
                </span>
              </div>
              <div className="relative aspect-video bg-gray-950">
                <Image
                  src="/images/concept.png"
                  alt="AI-generated character model sheets"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            {/* Decorative corner */}
            <div className="absolute -bottom-3 -right-3 w-20 h-20 border-r-2 border-b-2 border-red-500/20 rounded-br-xl pointer-events-none" />
          </div>

          <div className="lg:col-span-2">
            <div
              className="text-5xl font-black text-red-500/20 mb-3 leading-none"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              02
            </div>
            <h3
              className="text-2xl sm:text-3xl font-black mb-4"
              style={{ fontFamily: "var(--font-noto-sans-jp)" }}
            >
              Character Model Sheets
            </h3>
            <p className="text-gray-400 leading-relaxed mb-5">
              AI generates detailed character sheets with front, 3/4, and side
              profile views. Each character maintains visual consistency
              across every panel of your manga.
            </p>
            <div
              className="flex items-center gap-3 text-xs text-red-400 tracking-widest"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              <span className="w-8 h-px bg-red-500/60" />
              MULTI-ANGLE REFERENCE SHEETS
            </div>
          </div>
        </motion.div>

        {/* Storyboard */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="grid lg:grid-cols-5 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-2 lg:order-1">
            <div
              className="text-5xl font-black text-red-500/20 mb-3 leading-none"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              03
            </div>
            <h3
              className="text-2xl sm:text-3xl font-black mb-4"
              style={{ fontFamily: "var(--font-noto-sans-jp)" }}
            >
              Dynamic Panel Layouts
            </h3>
            <p className="text-gray-400 leading-relaxed mb-5">
              Full manga pages with varied panel compositions, action lines,
              and dialogue &mdash; all drawn with consistent character art
              throughout your story.
            </p>
            <div
              className="flex items-center gap-3 text-xs text-red-400 tracking-widest"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              <span className="w-8 h-px bg-red-500/60" />
              AI-COMPOSED MANGA PANELS
            </div>
          </div>

          <div className="lg:col-span-3 lg:order-2 relative group">
            <div className="rounded-xl overflow-hidden border border-gray-800/80 shadow-2xl shadow-black/40 transition-transform duration-500 group-hover:scale-[1.01]">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0a0a0a] border-b border-gray-800/60">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-gray-700" />
                <div className="w-3 h-3 rounded-full bg-gray-700" />
                <span
                  className="ml-3 text-[10px] text-gray-600"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  enpitsu &mdash; Storyboard
                </span>
              </div>
              <div className="relative aspect-video bg-gray-950">
                <Image
                  src="/images/storyboard.png"
                  alt="AI-generated manga storyboard with dynamic panels"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            {/* Decorative corner */}
            <div className="absolute -bottom-3 -left-3 w-20 h-20 border-l-2 border-b-2 border-red-500/20 rounded-bl-xl pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
