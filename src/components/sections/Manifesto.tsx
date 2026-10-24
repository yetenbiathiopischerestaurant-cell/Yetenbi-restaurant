"use client";

import type { StaticImageData } from "next/image";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import baskets from "../../../public/img/baskets.jpg";
import platter from "../../../public/img/platter.jpg";
import pour from "../../../public/img/jebena-pour.jpg";
import Embers from "../motion/Embers";
import { Ambient, FlagWash, Label } from "../ui/primitives";
import { useLanguage } from "@/lib/language";
import { Photo } from "@/components/Photos";

type Token = { word: string; gold?: boolean } | { img: StaticImageData; alt: string };

const photos: { img: StaticImageData; alt: string }[] = [
  { img: baskets, alt: "Injera" },
  { img: platter, alt: "Beyaynetu" },
  { img: pour, alt: "Jebena Buna" },
];

/** "[0]" marks an inline photo, "*word" a gold italic word (see manifesto.text in lib/i18n). */
function parse(text: string): Token[] {
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const match = word.match(/^\[(\d)\]$/);
      if (match) return photos[Number(match[1])];
      return word.startsWith("*") ? { word: word.slice(1), gold: true } : { word };
    });
}

function Word({
  token,
  range,
  progress,
}: {
  token: Extract<Token, { word: string }>;
  range: [number, number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={`mr-[0.24em] inline-block ${token.gold ? "text-gilded italic" : ""}`}>
      {token.word}
    </motion.span>
  );
}

function Pill({
  token,
  range,
  progress,
}: {
  token: Extract<Token, { img: StaticImageData }>;
  range: [number, number];
  progress: MotionValue<number>;
}) {
  const scale = useTransform(progress, range, [0.3, 1]);
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <motion.span
      style={{ scale, opacity }}
      className="relative mr-[0.24em] inline-block h-[0.8em] w-[1.9em] overflow-hidden rounded-full align-[-0.06em] ring-1 ring-gold/40"
    >
      <Photo src={token.img} alt={token.alt} fill sizes="180px" className="object-cover" />
    </motion.span>
  );
}

/** The house in one sentence: words light up in turn as it scrolls past, with photographs set into the type. */
export default function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const lit = useMotionValue(1);
  const { t, locale } = useLanguage();
  const tokens = parse(t.manifesto.text);
  const plain = t.manifesto.text.replace(/\[\d\]\s?/g, "").replace(/\*/g, "");
  const progress = reduce ? lit : scrollYProgress;

  return (
    <section id="willkommen" className="relative overflow-hidden py-32 md:py-48">
      <FlagWash tone="green" className="-left-[25%] top-[5%] h-[90%] w-[70%]" />
      <Ambient src={baskets} className="-right-[15%] top-0 h-full w-[70%]" opacity={0.4} />
      <Embers count={12} />
      <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
        <Label am={locale === "am" ? undefined : "እንኳን ደህና መጡ"}>{t.manifesto.label}</Label>
        <p
          key={locale}
          ref={ref}
          className="mt-10 font-display text-[clamp(2.2rem,5vw,4.6rem)] font-medium leading-[1.14] tracking-tight text-cream"
        >
          <span className="sr-only">{plain}</span>
          <span aria-hidden>
            {tokens.map((token, index) => {
              // Each word lights up during its own stretch of the scroll.
              const range: [number, number] = [index / tokens.length, Math.min(1, (index + 1.5) / tokens.length)];
              return "img" in token ? (
                <Pill key={index} token={token} range={range} progress={progress} />
              ) : (
                <Word key={index} token={token} range={range} progress={progress} />
              );
            })}
          </span>
        </p>
      </div>
    </section>
  );
}
