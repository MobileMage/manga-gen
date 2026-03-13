"use client";

import { motion } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "CONCEPT",
    jp: "構想",
    desc: "Describe your manga idea — genre, plot, characters. A few sentences is all it takes.",
  },
  {
    num: "02",
    title: "CHARACTERS",
    jp: "人物",
    desc: "AI generates detailed character model sheets with multiple angles and expressions.",
  },
  {
    num: "03",
    title: "PANELS",
    jp: "作画",
    desc: "Every panel is drawn with consistent characters and dynamic manga layouts.",
  },
  {
    num: "04",
    title: "READ",
    jp: "読む",
    desc: "Browse your finished manga in the built-in reader, then export to PDF.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28 sm:py-36">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />

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
            The Process
          </span>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2
              className="text-4xl sm:text-5xl font-black"
              style={{ fontFamily: "var(--font-noto-sans-jp)" }}
            >
              Four Steps to Manga
            </h2>
            <span
              className="text-xl sm:text-2xl text-gray-800 font-bold"
              style={{ fontFamily: "var(--font-noto-sans-jp)" }}
            >
              制作過程
            </span>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[120px] left-[12%] right-[12%] h-px bg-gradient-to-r from-red-500/40 via-red-500/15 to-red-500/40" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              <div
                className="text-7xl font-black text-red-500/20 leading-none mb-3"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                {step.num}
              </div>
              <div
                className="text-2xl font-black mb-1"
                style={{ fontFamily: "var(--font-noto-sans-jp)" }}
              >
                {step.jp}
              </div>
              <div
                className="text-xs font-bold text-gray-400 mb-3 tracking-[0.2em]"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                {step.title}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
