"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function ActionBreak() {
  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 1 }}
        className="relative overflow-hidden"
      >
        {/* Contain the full image, black bars fill remaining space */}
        <div className="relative w-full max-w-5xl mx-auto">
          <div className="relative aspect-video">
            <Image
              src="/images/leonardo/action-3.jpg"
              alt="Dynamic manga action scene"
              fill
              className="object-contain"
            />
          </div>
        </div>
        {/* Gradient fades into black on edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />

        {/* Manga panel border overlay */}
        <div className="absolute inset-x-6 sm:inset-x-12 inset-y-6 border-2 border-white/10 pointer-events-none" />

        {/* Overlay text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <div
              className="text-5xl sm:text-7xl lg:text-8xl font-black opacity-20 leading-none"
              style={{ fontFamily: "var(--font-noto-sans-jp)" }}
            >
              描く
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
