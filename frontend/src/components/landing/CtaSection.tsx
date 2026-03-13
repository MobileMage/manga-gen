"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

interface CtaSectionProps {
  ctaHref: string;
  ctaLabel: string;
  showDemo?: boolean;
  onDemoClick?: () => void;
}

export default function CtaSection({ ctaHref, ctaLabel, showDemo, onDemoClick }: CtaSectionProps) {
  return (
    <section className="relative py-32 sm:py-40 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />

      {/* Mood background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/leonardo/mood-3.jpg"
          alt=""
          fill
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
      </div>

      <div className="relative text-center max-w-2xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="text-3xl sm:text-4xl text-gray-600/60 mb-5 font-bold"
            style={{ fontFamily: "var(--font-noto-sans-jp)" }}
          >
            漫画を創ろう
          </div>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black mb-7 leading-[0.95]"
            style={{ fontFamily: "var(--font-noto-sans-jp)" }}
          >
            Start Creating
            <br />
            <span className="text-red-500">Your Manga</span>
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            No drawing skills needed. Just your imagination.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={ctaHref}
              className="group inline-block px-10 py-4 bg-red-500 hover:bg-red-600 rounded text-sm font-bold tracking-widest transition-all hover:shadow-xl hover:shadow-red-500/20"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              {ctaLabel} &mdash; IT&apos;S FREE
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            {showDemo && (
              <button
                onClick={onDemoClick}
                className="group flex items-center gap-2 px-10 py-4 border border-gray-600 hover:border-gray-400 rounded text-sm font-bold tracking-widest text-gray-400 hover:text-white transition-all"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE DEMO
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
