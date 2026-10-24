"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import Embers from "../motion/Embers";
import { ease, FlagWash, Heading, Rise } from "../ui/primitives";
import { useLanguage } from "@/lib/language";

/* The 33 base consonants of the fidel, each with its seven vowel orders (Unicode Ethiopic block). */
const ROW_STARTS = [
  0x1200, 0x1208, 0x1210, 0x1218, 0x1220, 0x1228, 0x1230, 0x1238, 0x1240, 0x1260, 0x1270, 0x1278, 0x1280, 0x1290,
  0x1298, 0x12a0, 0x12a8, 0x12b8, 0x12c8, 0x12d0, 0x12d8, 0x12e0, 0x12e8, 0x12f0, 0x1300, 0x1308, 0x1320, 0x1328,
  0x1330, 0x1338, 0x1340, 0x1348, 0x1350,
];
const FIDEL = ROW_STARTS.map((start) => Array.from({ length: 7 }, (_, i) => String.fromCodePoint(start + i)));

/* The words themselves; their meaning and when-to-say-it come from the dictionary (amharisch.phrases). */
const phrases = [
  { am: "ሰላም", latin: "Selam" },
  { am: "ጤና ይስጥልኝ", latin: "Tena yistilign" },
  { am: "አመሰግናለሁ", latin: "Ameseginalehu" },
  { am: "በጣም ጣፋጭ ነው", latin: "Betam tafach new" },
  { am: "ቡና", latin: "Buna" },
  { am: "ጉርሻ", latin: "Gursha" },
];

/** A few words of Amharic for the evening. Choosing a phrase lights up its letters in the fidel chart. */
export default function Amharisch() {
  const [active, setActive] = useState(0);
  const { t, locale } = useLanguage();
  const letters = useMemo(() => new Set([...phrases[active].am].filter((char) => char.trim())), [active]);
  const phrase = phrases[active];

  return (
    <section
      id="amharisch"
      className="relative overflow-hidden py-32 md:py-44 [content-visibility:auto] [contain-intrinsic-size:auto_900px]"
    >
      <FlagWash tone="green" className="-right-[20%] top-[10%] h-[80%] w-[60%]" />
      <Embers count={10} />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Heading key={locale} label={t.amharisch.label} title={t.amharisch.title} em={t.amharisch.em} size="md" />
        <Rise delay={0.15}>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/72">{t.amharisch.intro}</p>
        </Rise>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Phrases */}
          <ul className="space-y-2 lg:col-span-6">
            {phrases.map((ph, i) => {
              const on = i === active;
              return (
                <li key={ph.latin}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-pressed={on}
                    className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b py-5 text-left transition-colors duration-500 ${
                      on ? "border-gold/60" : "border-gold/15 hover:border-gold/35"
                    }`}
                  >
                    <span>
                      <span
                        lang="am"
                        className={`block font-ethiopic text-3xl transition-colors duration-500 md:text-4xl ${on ? "text-gold-soft" : "text-cream/80"}`}
                      >
                        {ph.am}
                      </span>
                      <span className="mt-1 block font-display text-lg italic text-cream/68">{ph.latin}</span>
                    </span>
                    <span
                      className={`font-display text-xl transition-colors duration-500 md:text-2xl ${on ? "text-cream" : "text-cream/55"}`}
                    >
                      {t.amharisch.phrases[i].meaning}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Fidel chart */}
          <div className="lg:col-span-6">
            <div className="relative border border-gold/30 p-5 md:p-7">
              <div
                aria-hidden
                className="grid grid-cols-7 gap-x-1 gap-y-0.5 text-center font-ethiopic text-[11px] leading-[1.55] sm:text-[13px] md:text-sm"
              >
                {FIDEL.flat().map((ch, i) => {
                  const lit = letters.has(ch);
                  return (
                    <span
                      key={i}
                      className={`rounded-sm transition-all duration-500 ${lit ? "relative z-10 scale-[1.6] bg-gold/15 font-semibold text-gold-soft [text-shadow:0_0_14px_rgba(231,205,138,0.9)]" : "text-cream/15"}`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
              <div className="mt-6 border-t border-gold/20 pt-5">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${locale}-${phrase.latin}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease }}
                    className="font-display text-lg italic leading-snug text-cream/80"
                  >
                    {t.amharisch.phrases[active].when}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
