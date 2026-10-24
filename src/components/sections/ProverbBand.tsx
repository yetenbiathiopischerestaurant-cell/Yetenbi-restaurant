"use client";

import { useLanguage } from "@/lib/language";

import { LalibelaCross, Tibeb } from "../heritage/Ornaments";
import { Rise, Title } from "../ui/primitives";

/** An Amharic proverb between two woven bands: together, small things hold something great. */
export default function ProverbBand() {
  const { t, locale } = useLanguage();
  return (
    <section
      aria-label={t.proverb.caption}
      className="relative py-24 md:py-32 [content-visibility:auto] [contain-intrinsic-size:auto_900px]"
    >
      <Tibeb className="opacity-70" />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center md:py-24">
        <LalibelaCross className="h-7 w-7 text-gold" />
        <Rise delay={0.1}>
          <p lang="am" className="mt-8 font-ethiopic text-3xl text-gold-soft md:text-5xl">
            ድር ቢያብር አንበሳ ያስር
          </p>
        </Rise>
        <Title
          as="p"
          key={locale}
          text={t.proverb.translation}
          className="mt-6 max-w-3xl text-[clamp(1.75rem,3.6vw,3.25rem)] font-medium italic leading-[1.15] text-cream"
          delay={0.2}
        />
        <Rise delay={0.4}>
          <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-cream/55">
            {t.proverb.caption}
          </p>
        </Rise>
      </div>
      <Tibeb className="opacity-70" />
    </section>
  );
}
