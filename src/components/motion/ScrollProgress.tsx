"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useLenis } from "lenis/react";
import { useState } from "react";
import { useLanguage } from "@/lib/language";

/** Thin reading bar in the flag's colours along the top plus a circular back-to-top button. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const [visible, setVisible] = useState(false);
  const lenis = useLenis();
  const { t } = useLanguage();

  useMotionValueEvent(scrollYProgress, "change", (progress) => setVisible(progress > 0.08));

  return (
    <>
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left will-change-transform bg-gradient-to-r from-eth-green via-eth-yellow to-eth-red shadow-[0_0_12px_rgba(226,191,98,0.55)]"
      />
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            aria-label={t.toTop}
            onClick={() => (lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0 }))}
            className="group fixed bottom-4 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-ink/80 backdrop-blur-md md:bottom-6 md:right-6 md:h-14 md:w-14"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
              <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(244,236,220,0.12)" strokeWidth="1.5" />
              <motion.circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="#c9a24a"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ pathLength: progress }}
              />
            </svg>
            <span className="text-gold-soft transition-transform duration-500 group-hover:-translate-y-1">↑</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
