"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useLenis } from "lenis/react";
import { Suspense, lazy, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useIntro } from "./IntroState";
import { introSeen, rememberIntroSeen } from "./seen";
import { useLanguage } from "@/lib/language";

// Loaded only in the browser and only when the intro will play (it is never rendered on the server).
const ParticleJourney = lazy(() => import("../three/ParticleJourney"));

const DURATION = 16;
const ease = [0.76, 0, 0.24, 1] as const;

// One caption per shape's hold, timed to the stages in ParticleJourney: flag, galaxy, bean, jebena, word.
const captions = [
  { range: [0.02, 0.045, 0.13, 0.165], text: "Aus Äthiopien", am: "ኢትዮጵያ" },
  { range: [0.225, 0.25, 0.29, 0.325], text: "Aus tausend Bohnen", am: "ቡና" },
  { range: [0.385, 0.415, 0.475, 0.51], text: "frisch geröstet", am: "ማቁላት" },
  { range: [0.57, 0.6, 0.66, 0.695], text: "in der Jebena gebrüht", am: "ጀበና" },
  { range: [0.755, 0.785, 0.86, 0.895], text: "für Sie serviert", am: "እንኳን ደህና መጡ" },
];

const noSubscribe = () => () => {};

function Caption({
  progress,
  range,
  text,
  am,
}: {
  progress: MotionValue<number>;
  range: number[];
  text: string;
  am: string;
}) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, [range[0], range[3]], [24, -24]);
  const filter = useTransform(progress, range, ["blur(10px)", "blur(0px)", "blur(0px)", "blur(10px)"]);
  return (
    <motion.div style={{ opacity, y, filter }} className="absolute inset-x-0 bottom-[11%] px-6 text-center">
      <p className="font-display text-4xl italic leading-[1.15] text-cream md:text-6xl">{text}</p>
      <p className="mt-3 font-ethiopic text-lg text-gold/75" lang="am">
        {am}
      </p>
    </motion.div>
  );
}

/** Full-screen particle story that plays by itself on a visitor's first visit, then lifts away to reveal the site. */
export default function Intro() {
  const { done, finish } = useIntro();
  /*
    First visit only. The server can't know, so it always renders the black overlay: first-time visitors
    never glimpse the site before the intro covers it. For returning visitors the inline script in the root
    layout marks <html> before the first paint and CSS hides that overlay (no black flash); once hydrated,
    storage is read here and the intro unmounts. `hydrated` is false only while hydrating, so the overlay
    matches the server HTML; on client-side navigations storage is read straight away.
  */
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const seen = hydrated && introSeen();
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const lenis = useLenis();
  const progress = useMotionValue(0);
  const [leaving, setLeaving] = useState(false);
  const flash = useTransform(progress, [0.87, 0.91, 0.965], [0, 0.45, 0]);
  const bar = useTransform(progress, [0, 1], [0, 1]);

  const leave = useCallback(() => setLeaving(true), []);

  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const [skipped, setSkipped] = useState(false);
  const skip = useCallback(() => {
    setSkipped(true);
    leave();
  }, [leave]);

  // Remembered once the overlay has fully lifted, and only if the visitor saw the particles or chose "Skip".
  // When the 3D scene was too slow to start (slow phone or connection) and the safety timeout closed the overlay,
  // nothing is stored, so they get the intro on their next visit. With reduced motion it never plays.
  const end = useCallback(() => {
    if (!reduce && (ready || skipped)) rememberIntroSeen();
    finish();
  }, [reduce, ready, skipped, finish]);

  useEffect(() => {
    if (!hydrated) return;
    if (reduce || seen) {
      finish();
      return;
    }
    // If WebGL never comes up, don't trap the visitor behind a black screen.
    if (!ready) {
      const fallback = setTimeout(leave, 5000);
      return () => clearTimeout(fallback);
    }
    const controls = animate(progress, 1, { duration: DURATION, ease: "linear", onComplete: leave });
    return () => controls.stop();
  }, [hydrated, reduce, seen, ready, progress, leave, finish]);

  // Hold the page still while the intro owns the screen.
  useEffect(() => {
    if (done || !hydrated || seen) return;
    window.scrollTo(0, 0);
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
    };
  }, [done, hydrated, seen, lenis]);

  if (seen) return null;

  return (
    <AnimatePresence onExitComplete={end}>
      {!leaving && !reduce && (
        <motion.div
          key="intro"
          // Hidden by CSS before hydration for returning visitors and reduced motion (see above).
          className="fixed inset-0 z-[100] bg-[#120f0c] motion-reduce:hidden [[data-intro-seen]_&]:hidden"
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 1.2, ease }}
          aria-label="Intro"
        >
          <div className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.2)_0%,rgba(218,90,26,0.07)_40%,transparent_70%)]" />
          <div className="absolute inset-0">
            {hydrated && (
              <Suspense fallback={null}>
                <ParticleJourney progress={progress} active onReady={onReady} />
              </Suspense>
            )}
          </div>
          <motion.div
            style={{ opacity: flash }}
            className="pointer-events-none absolute inset-0 bg-gold-soft mix-blend-overlay"
          />

          {captions.map((caption, index) => (
            <Caption key={caption.text} progress={progress} {...caption} text={t.intro.captions[index]} />
          ))}

          <div className="absolute inset-x-0 top-0 h-[2px] bg-cream/5">
            <motion.div style={{ scaleX: bar }} className="h-full origin-left bg-gold" />
          </div>

          <button
            type="button"
            onClick={skip}
            className="absolute bottom-6 right-6 rounded-full border border-cream/15 bg-ink/40 px-5 py-2.5 text-xs font-medium tracking-wide text-cream/80 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-gold/60 hover:text-gold-soft active:scale-[0.97] md:bottom-8 md:right-8"
          >
            {t.intro.skip}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
