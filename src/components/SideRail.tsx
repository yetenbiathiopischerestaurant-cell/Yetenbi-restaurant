"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import Stela, { STELA_FLOORS } from "./heritage/Stela";
import { useLanguage } from "@/lib/language";

const chapters = [
  { id: "willkommen", label: "Willkommen" },
  { id: "platte", label: "Die Platte" },
  { id: "speisekarte", label: "Speisekarte" },
  { id: "kaffee", label: "Drei Runden" },
  { id: "amharisch", label: "Amharisch" },
  { id: "besuch", label: "Anfahrt" },
  { id: "reservieren", label: "Reservierung" },
];

/** A small Aksum stela on the right edge: its storeys light up as you travel down the page, fully lit at the end. */
export default function SideRail() {
  const [current, setCurrent] = useState(-1);
  const { t } = useLanguage();
  const [lit, setLit] = useState(0);
  const { scrollY, scrollYProgress } = useScroll();
  // Stay out of the hero, which has its own stelae; fade in once it has scrolled away.
  // ...and fade out again as the footer comes up, so it never sits on the footer's address and links.
  const show = useTransform(scrollY, (offset) => {
    if (typeof window === "undefined") return 0;
    const screen = window.innerHeight;
    const fadeIn = (offset - screen * 0.55) / (screen * 0.3);
    const remaining = document.documentElement.scrollHeight - offset - screen;
    const fadeOut = (remaining - screen * 0.55) / (screen * 0.35);
    return Math.min(1, Math.max(0, Math.min(fadeIn, fadeOut)));
  });

  // One storey per sixth of the page, so the stela is fully lit when you reach the bottom.
  useMotionValueEvent(scrollYProgress, "change", (progress) =>
    setLit(Math.min(STELA_FLOORS, Math.ceil(progress * STELA_FLOORS - 0.02))),
  );

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) setCurrent(chapters.findIndex((chapter) => chapter.id === entry.target.id));
        }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    chapters.forEach((chapter) => {
      const el = document.getElementById(chapter.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const label = current >= 0 ? t.rail[current] : undefined;

  return (
    <motion.aside
      style={{ opacity: show }}
      aria-hidden
      className="pointer-events-none fixed right-5 top-1/2 z-30 hidden will-change-[opacity] -translate-y-1/2 flex-col items-center gap-4 xl:flex"
    >
      <Stela className="h-72 w-auto text-gold/90 drop-shadow-[0_0_14px_rgba(201,162,74,0.3)]" lit={lit} />
      <div className="h-28 w-6">
        <AnimatePresence mode="wait">
          {label && (
            <motion.p
              key={label}
              initial={{ opacity: 0, offset: 8 }}
              animate={{ opacity: 1, offset: 0 }}
              exit={{ opacity: 0, offset: -8 }}
              className="whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-cream/68 [writing-mode:vertical-rl]"
            >
              {label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
