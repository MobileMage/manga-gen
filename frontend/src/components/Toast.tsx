"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({
  message,
  onDismiss,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, onDismiss, duration]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-red-900/90 border border-red-500/50 text-white text-sm px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <span className="text-red-300 shrink-0">!</span>
            <p className="flex-1">{message}</p>
            <button
              onClick={onDismiss}
              className="text-red-300 hover:text-white shrink-0"
            >
              &times;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
