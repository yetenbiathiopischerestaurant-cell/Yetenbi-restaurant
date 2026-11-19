"use client";

import type { StaticImageData } from "next/image";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import baskets from "../../../public/img/baskets.jpg";
import platter from "../../../public/img/platter.jpg";
import bowls from "../../../public/img/bowls.jpg";
import incense from "../../../public/img/incense.jpg";
import pour from "../../../public/img/jebena-pour.jpg";
import Embers from "../motion/Embers";
import { Ambient, FlagWash, Label, Rise } from "../ui/primitives";
import { LalibelaCross } from "../heritage/Ornaments";
import { useLanguage } from "@/lib/language";
import { Photo } from "@/components/Photos";

/** A photograph in an arched frame that drifts slightly as the page scrolls. */
function ArchPhoto({
  src,
  alt,
  className = "",
  tall = false,
}: {
  src: StaticImageData;
  alt: string;
  className?: string;
  tall?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-t-full ring-1 ring-gold/35 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] ${
        tall ? "aspect-[3/4.4]" : "aspect-[4/5]"
      } ${className}`}
    >
      <motion.div style={{ y }} className="absolute -inset-y-[10%] inset-x-0">
        <Photo
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 40vw, 90vw"
          placeholder="blur"
          className="object-cover"
        />
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
    </div>
  );
}

function Ornament() {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/70" />
      <LalibelaCross className="h-5 w-5 text-gold" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/70" />
    </div>
  );
}

const text =
  "font-display text-[clamp(1.15rem,1.9vw,1.6rem)] font-medium leading-[1.3] tracking-tight text-cream [text-wrap:pretty]";

/** One word that brightens while its stretch of the paragraph scrolls past. */
function Word({
  word,
  gold,
  range,
  progress,
}: {
  word: string;
  gold: boolean;
  range: [number, number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className={`mr-[0.24em] inline-block ${gold ? "text-gilded italic" : ""}`}>
      {word}
    </motion.span>
  );
}

/**
  A paragraph whose words light up in turn as it scrolls into view, like the line that used to open this section.
  "*word" in the text is set in gold italics (the star is not shown). Screen readers get the plain sentence.
*/
function LitText({ text: source, className }: { text: string; className: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const lit = useMotionValue(1);
  const progress = reduce ? lit : scrollYProgress;
  const words = source.split(" ").filter(Boolean);
  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{source.replace(/\*/g, "")}</span>
      <span aria-hidden>
        {words.map((word, index) => (
          <Word
            key={index}
            word={word.replace(/^\*/, "")}
            gold={word.startsWith("*")}
            range={[index / words.length, Math.min(1, (index + 2) / words.length)]}
            progress={progress}
          />
        ))}
      </span>
    </p>
  );
}

/** Small gold Ethiopic numeral with a hairline, marking each part of the text. */
function Marker({ n }: { n: string }) {
  return (
    <div aria-hidden className="mb-4 flex items-center gap-3">
      <span className="font-ethiopic text-xl text-gold">{n}</span>
      <span className="h-px w-20 bg-gradient-to-r from-gold/70 to-transparent" />
    </div>
  );
}

/**
  The restaurant's own introduction from the menu card, word for word and in its order, set in one typeface and
  laid out with photographs: cuisine beside the platter, injera and teff beside the baskets, the line about the
  cradle of humankind as a centrepiece over a dim photo, and the welcome beside the coffee being poured.
*/
export default function Manifesto() {
  const { t, locale } = useLanguage();
  const [cuisine, teff, quote, combine, wish] = t.manifesto.body;

  return (
    <section id="willkommen" className="relative overflow-hidden py-20 md:py-28">
      <FlagWash tone="green" className="-left-[25%] top-[5%] h-[90%] w-[70%]" />
      <Ambient src={baskets} className="-right-[15%] top-0 h-full w-[70%]" opacity={0.3} />
      <Embers count={12} />

      <div key={locale} className="relative z-10 mx-auto max-w-5xl px-5 md:px-8">
        <Label am={locale === "am" ? undefined : "እንኳን ደህና መጡ"}>{t.manifesto.label}</Label>

        {/* 1 · the cuisine, beside the platter */}
        <div className="mt-10 grid items-center gap-8 md:grid-cols-[1.3fr_0.7fr] md:gap-12">
          <div>
            <Marker n="፩" />
            <LitText text={cuisine} className={text} />
          </div>
          <Rise delay={0.1}>
            <ArchPhoto src={platter} alt="Beyaynetu" className="mx-auto w-full max-w-[14rem] md:max-w-[16rem]" tall />
          </Rise>
        </div>

        {/* 2 · injera and teff, beside the baskets (photo first on wide screens) */}
        <div className="mt-14 grid items-center gap-8 md:mt-16 md:grid-cols-[0.7fr_1.3fr] md:gap-12">
          <Rise delay={0.1} className="order-2 md:order-1">
            <div className="relative mx-auto w-full max-w-[14rem] md:max-w-[16rem]">
              <ArchPhoto src={baskets} alt="Injera" />
              <div className="absolute -bottom-8 -right-6 w-[45%] md:-right-10">
                <ArchPhoto src={bowls} alt="Wot" className="ring-2 ring-ink" />
              </div>
            </div>
          </Rise>
          <div className="order-1 md:order-2">
            <Marker n="፪" />
            <LitText text={teff} className={text} />
          </div>
        </div>

        {/* 3 · the centrepiece: the taste of Ethiopia, the cradle of humankind */}
        <Rise className="relative mt-14 md:mt-20">
          <div className="relative overflow-hidden rounded-[2rem] ring-1 ring-gold/30">
            <div aria-hidden className="absolute inset-0">
              <Photo src={incense} alt="" fill sizes="100vw" placeholder="blur" className="object-cover opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink/80" />
            </div>
            <div className="relative px-6 py-10 text-center md:px-16 md:py-14">
              <Ornament />
              <LitText
                text={quote}
                className="mx-auto mt-6 max-w-2xl font-display text-[clamp(1.5rem,3vw,2.5rem)] font-medium leading-[1.12] tracking-tight text-cream [text-wrap:balance]"
              />
              <div className="mt-6">
                <Ornament />
              </div>
            </div>
          </div>
        </Rise>

        {/* 4 · combinations, the welcome and the signature, beside the coffee */}
        <div className="mt-14 grid items-center gap-8 md:mt-20 md:grid-cols-[1.3fr_0.7fr] md:gap-12">
          <div className="space-y-5">
            <Marker n="፫" />
            <LitText text={combine} className={text} />
            <LitText text={wish} className={text} />
            <Rise delay={0.16} className="flex items-center gap-4 pt-2">
              <LalibelaCross className="h-6 w-6 shrink-0 text-gold" />
              <p className="font-display text-[clamp(1.25rem,2vw,1.7rem)] font-medium italic tracking-tight text-gilded">
                {t.manifesto.sign}
              </p>
            </Rise>
          </div>
          <Rise delay={0.1}>
            <ArchPhoto src={pour} alt="Jebena Buna" className="mx-auto w-full max-w-[14rem] md:max-w-[16rem]" tall />
          </Rise>
        </div>
      </div>
    </section>
  );
}
