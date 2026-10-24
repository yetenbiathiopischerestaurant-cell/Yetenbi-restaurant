"use client";

import type { StaticImageData } from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { useRef } from "react";
import Magnetic from "../motion/Magnetic";
import { LalibelaCross } from "../heritage/Ornaments";
import { Photo, useAmbientUrl } from "@/components/Photos";

/*
 * The visual vocabulary of the hero, reused everywhere so the whole site reads as one piece:
 * gold hairline + spaced caps label, serif titles whose words rise out of a mask,
 * italic cream lead text, gold/ghost pill buttons, and photographs that wake up from darkness.
 */

export const ease = [0.22, 1, 0.36, 1] as const;

export function Label({
  children,
  className = "",
  am,
}: {
  children: React.ReactNode;
  className?: string;
  am?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <motion.span
        className="flag-stripe h-[2px] w-16 origin-left rounded-full"
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease }}
      />
      <LalibelaCross className="h-5 w-5 shrink-0 text-gold" />
      <motion.p
        className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-cream/85 md:text-xs"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        {children}
      </motion.p>
      {am && (
        <span lang="am" className="font-ethiopic text-sm text-gold/85">
          {am}
        </span>
      )}
    </div>
  );
}

/** Serif headline; each word rises out of its own mask like the hero wordmark. */
export function Title({
  text,
  as = "h2",
  className = "",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const words = text.split(" ");
  return (
    <Tag
      className={`font-display font-semibold tracking-tight ${className}`}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ staggerChildren: 0.07, delayChildren: delay }}
    >
      {/* read once as a sentence; the animated words are decoration (aria-label is not allowed on a plain p) */}
      <span className="sr-only">{text}</span>
      {words.map((word, index) => (
        <span key={index} aria-hidden className="inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "105%", rotate: 6 },
              show: { y: "0%", rotate: 0, transition: { duration: 1.2, ease } },
            }}
          >
            {word}
            {index < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Section heading: the hero's hairline label, then words rising out of masks, the closing phrase in gold italic. */
export function Heading({
  label,
  labelAm,
  title,
  em,
  className = "",
  size = "lg",
  align = "left",
}: {
  label?: string;
  labelAm?: string;
  title: string;
  em?: string;
  className?: string;
  size?: "lg" | "md";
  align?: "left" | "center";
}) {
  const reduce = useReducedMotion();
  const words = [
    ...title.split(" ").map((word) => ({ word, italic: false })),
    ...(em ? em.split(" ").map((word) => ({ word, italic: true })) : []),
  ];
  return (
    <div className={`${align === "center" ? "flex flex-col items-center text-center" : ""} ${className}`}>
      {label && <Label am={labelAm}>{label}</Label>}
      <motion.h2
        initial={reduce ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        transition={{ staggerChildren: 0.06 }}
        aria-label={[title, em].filter(Boolean).join(" ")}
        className={`mt-6 flex flex-wrap gap-x-[0.24em] font-display font-semibold leading-[1.02] tracking-tight text-cream ${
          align === "center" ? "justify-center" : ""
        } ${size === "lg" ? "text-[clamp(2.75rem,6vw,5.75rem)]" : "text-[clamp(2.4rem,4.6vw,4.4rem)]"}`}
      >
        {words.map(({ word, italic }, index) => (
          <span key={index} aria-hidden className="inline-block overflow-hidden pb-[0.14em]">
            <motion.span
              className={`inline-block ${italic ? "text-gilded pr-[0.06em] font-medium italic" : ""}`}
              variants={{
                hidden: { y: "110%", rotate: 6 },
                show: { y: "0%", rotate: 0, transition: { duration: 1.1, ease } },
              }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </motion.h2>
    </div>
  );
}

/** Italic serif paragraph, the hero subtitle voice. */
export function Lead({
  children,
  className = "",
  delay = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.p
      className={`font-display text-2xl italic leading-snug text-cream/80 md:text-[1.75rem] ${className}`}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1.2, ease, delay }}
    >
      {children}
    </motion.p>
  );
}

/** A very faint wash of the flag's green or red behind a section, so its colours recur quietly down the page. */
export function FlagWash({ tone, className = "" }: { tone: "green" | "red"; className?: string }) {
  const color = tone === "green" ? "rgba(79, 138, 95, 0.14)" : "rgba(176, 64, 44, 0.12)";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }}
    />
  );
}

/** Plain fade-up for supporting copy and small blocks. */
export function Rise({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1.1, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

export function GoldButton({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <Magnetic>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full btn-gild px-8 py-4 font-semibold text-ink hover:text-cream active:scale-[0.98]"
      >
        <span className="absolute inset-0 -translate-x-full bg-eth-green transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
        <span className="relative">{children}</span>
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-1">
          <ArrowRight size={14} weight="bold" />
        </span>
      </a>
    </Magnetic>
  );
}

/**
 * Candle-light backdrop: a section's own photograph as a soft wash of its colours.
 * Uses a tiny pre-blurred copy from /img/ambient (made once at build time), so the browser never
 * runs a live blur filter or tracks scroll for it: it is a static, cheap layer.
 */
export function Ambient({
  src,
  className = "",
  opacity = 0.45,
}: {
  src: StaticImageData;
  className?: string;
  opacity?: number;
}) {
  const url = useAmbientUrl(src);
  return (
    <div
      aria-hidden
      style={{ opacity: Math.min(0.85, opacity * 1.25), backgroundImage: `url(${url})` }}
      className={`pointer-events-none absolute bg-cover bg-center [mask-image:radial-gradient(closest-side,#000_35%,transparent)] ${className}`}
    />
  );
}

/** Photograph that wakes from darkness when it enters view (the hero's opening move) and drifts with scroll. */
export function CinematicImage({
  src,
  alt,
  className = "",
  sizes = "50vw",
  position = "center",
}: {
  src: StaticImageData;
  alt: string;
  className?: string;
  sizes?: string;
  position?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={reduce ? undefined : { y }}
        className="absolute -inset-y-[10%] inset-x-0 will-change-transform"
      >
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.3 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 2.4, ease }}
        >
          <Photo
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            placeholder="blur"
            className="object-cover"
            style={{ objectPosition: position }}
          />
        </motion.div>
      </motion.div>
      {/* darkness lifting: an opacity fade, which the GPU composites without repainting the photo */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-ink"
        initial={reduce ? false : { opacity: 0.85 }}
        whileInView={{ opacity: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 2.4, ease }}
      />
    </div>
  );
}
