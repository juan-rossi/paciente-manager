"use client";

import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2 } from "lucide-react";

export function NotificationToast({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-2 rounded-lg border border-border/60 bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur"
        >
          <CheckCircle2 className="size-4 text-brand-accent" />
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
