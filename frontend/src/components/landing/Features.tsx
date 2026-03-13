"use client";

import { motion } from "framer-motion";

const features = [
  {
    kanji: "力",
    title: "Powered by Gemini",
    desc: "Google's most capable AI model generates your story, characters, and artwork.",
  },
  {
    kanji: "統",
    title: "Character Consistency",
    desc: "Every panel references your character sheets for visual continuity across pages.",
  },
  {
    kanji: "冊",
    title: "Export to PDF",
    desc: "Read your manga in the built-in reader, then download as a print-ready PDF.",
  },
];

export default function Features() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group relative p-7 rounded-xl border border-gray-800/60 bg-gray-900/20 hover:border-gray-700/80 hover:bg-gray-900/40 transition-all duration-300"
            >
              <div
                className="absolute top-4 right-5 text-4xl font-black text-red-500/15 leading-none"
                style={{ fontFamily: "var(--font-noto-sans-jp)" }}
              >
                {feat.kanji}
              </div>
              <div className="w-px h-8 bg-red-500/40 mb-5" />
              <h3
                className="font-bold text-sm mb-2.5 tracking-wide"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                {feat.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
