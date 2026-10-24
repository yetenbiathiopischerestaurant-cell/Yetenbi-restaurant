"use client";

import type { StaticImageData } from "next/image";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import pour from "../../../public/img/jebena-pour.jpg";
import cups from "../../../public/img/cups.jpg";
import incense from "../../../public/img/incense.jpg";
import Embers from "../motion/Embers";
import { ease, Heading } from "../ui/primitives";
import { useLanguage } from "@/lib/language";
import { AksumFrame } from "../heritage/Ornaments";
import { geez } from "@/lib/ethiopic";
import { Photo } from "@/components/Photos";

type Round = { name: string; am: string; photo: StaticImageData };

const rounds: Round[] = [
  {
    name: "Abol",
    am: "አቦል",
    photo: pour,
  },
  {
    name: "Tona",
    am: "ቶና",
    photo: cups,
  },
  {
    name: "Baraka",
    am: "በረካ",
    photo: incense,
  },
];

const polar = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(100 + r * Math.cos(rad)), y: round(100 + r * Math.sin(rad)) };
};
const arc = (from: number, to: number, r: number) => {
  const a = polar(from, r);
  const b = polar(to, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
};

// A sini: the small handleless cup the ceremony is served in.
const CUP = "M58 92 C58 128 78 146 100 146 C122 146 142 128 142 92 Z";

/*
  The coffee ceremony is served in three rounds. The section pins; a dial runs through Abol, Tona and
  Baraka while the cup at its centre is poured and filled once per round.
*/
export default function Buna() {
  const root = useRef<HTMLElement>(null);
  const [round, setRound] = useState(0);
  const { t, locale } = useLanguage();
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => setRound(Math.min(2, Math.floor(v * 3))));

  const within = useTransform(scrollYProgress, (v) => {
    const t = Math.min(0.999, Math.max(0, v)) * 3;
    return t - Math.floor(t);
  });
  const level = useTransform(within, [0.08, 0.7], [146, 96]);
  const stream = useTransform(within, [0, 0.06, 0.62, 0.72], [0, 1, 1, 0]);
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  // The room warms up mid-ceremony: an overlay's opacity (composited), not a repainted background colour.
  const warmth = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0.3]);

  const r = rounds[round];

  return (
    <motion.section ref={root} id="kaffee" className="relative h-[330vh]">
      <div className="sticky top-0 flex h-[100dvh] flex-col overflow-hidden px-5 pb-8 pt-24 md:px-8 md:pt-28">
        <motion.div
          aria-hidden
          style={{ opacity: warmth }}
          className="pointer-events-none absolute inset-0 bg-[#2e1f12] will-change-[opacity]"
        />
        <Embers count={18} />
        <div className="pointer-events-none absolute left-[28%] top-[55%] h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.2),rgba(218,90,26,0.06)_45%,transparent_70%)]" />

        <div className="relative mx-auto w-full max-w-7xl">
          <Heading
            key={locale}
            label={t.buna.label}
            labelAm={locale === "am" ? undefined : "ጀበና ቡና"}
            title={t.buna.title}
            em={t.buna.em}
            size="md"
          />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-6 md:grid-cols-12 md:gap-10">
          {/* Dial with the cup */}
          <div className="flex justify-center md:col-span-5">
            <svg
              viewBox="0 0 200 200"
              className="w-[min(62vw,34vh)] md:w-[min(36vw,56vh)]"
              role="img"
              aria-label={`${t.buna.roundOf(round + 1)}: ${r.name}`}
            >
              <defs>
                <clipPath id="sini">
                  <path d={CUP} />
                </clipPath>
                <linearGradient id="brew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#7a4a22" />
                  <stop offset="1" stopColor="#2a160a" />
                </linearGradient>
              </defs>

              {/* three round segments */}
              {[0, 1, 2].map((i) => (
                <path
                  key={i}
                  d={arc(i * 120 + 4, i * 120 + 116, 92)}
                  fill="none"
                  stroke="rgba(244,236,220,0.12)"
                  strokeWidth="1.5"
                />
              ))}
              <motion.path
                d={arc(0.01, 359.99, 92)}
                fill="none"
                stroke="#c9a24a"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ pathLength: progress }}
              />
              {rounds.map((rd, i) => {
                const p = polar(i * 120 + 60, 80);
                return (
                  <text
                    key={rd.name}
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-sans uppercase transition-[fill] duration-500"
                    fontSize="6"
                    letterSpacing="1.6"
                    fill={i === round ? "#e7cd8a" : "rgba(244,236,220,0.35)"}
                  >
                    {rd.name}
                  </text>
                );
              })}
              {[0, 120, 240].map((d) => {
                const a = polar(d, 88);
                const b = polar(d, 96);
                return <line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#c9a24a" strokeWidth="1.5" />;
              })}

              {/* pour stream from above */}
              <motion.rect
                x="98.6"
                y="40"
                width="2.8"
                height="62"
                rx="1.4"
                fill="url(#brew)"
                style={{ opacity: stream }}
              />

              {/* cup and coffee */}
              <g clipPath="url(#sini)">
                <rect x="50" y="88" width="100" height="70" fill="rgba(244,236,220,0.04)" />
                <motion.rect x="50" width="100" height="80" fill="url(#brew)" style={{ y: level }} />
              </g>
              <path d={CUP} fill="none" stroke="#e7cd8a" strokeWidth="1.6" />
              <ellipse cx="100" cy="92" rx="42" ry="5" fill="none" stroke="#e7cd8a" strokeWidth="1.2" opacity="0.7" />
              <path d="M76 116 q24 8 48 0" fill="none" stroke="#c9a24a" strokeWidth="0.8" opacity="0.6" />
              <ellipse cx="100" cy="150" rx="26" ry="3" fill="none" stroke="#c9a24a" strokeWidth="1" opacity="0.6" />

              {/* steam */}
              <g fill="none" stroke="#f4ecdc" strokeWidth="1" strokeLinecap="round" opacity="0.45">
                <path className="steam" d="M88 82 q-4 -8 0 -16" />
                <path className="steam" style={{ animationDelay: "1.2s" }} d="M100 80 q4 -9 0 -18" />
                <path className="steam" style={{ animationDelay: "0.6s" }} d="M112 82 q-4 -8 0 -16" />
              </g>
            </svg>
          </div>

          {/* The round */}
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] items-center gap-5 md:col-span-7 md:gap-10">
            <AksumFrame className="mx-auto w-full max-w-[340px]" inner="aspect-[4/5]">
              <AnimatePresence initial={false}>
                <motion.div
                  key={r.name}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.15 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease }}
                >
                  <Photo
                    src={r.photo}
                    alt={t.buna.photoAlts[round]}
                    fill
                    sizes="(min-width: 768px) 26vw, 45vw"
                    placeholder="blur"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </AksumFrame>

            <div className="relative min-h-[14rem] md:min-h-[20rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
                  transition={{ duration: 0.55, ease }}
                >
                  <p className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-cream/60">
                    {t.buna.roundOf(round + 1)}
                    <span lang="am" className="font-ethiopic text-sm normal-case tracking-normal text-gold/80">
                      {geez(round + 1)}
                    </span>
                  </p>
                  <p className="mt-3 font-ethiopic text-lg text-gold/90" lang="am">
                    {r.am}
                  </p>
                  <h3 className="bg-gradient-to-b from-[#f6e2a8] via-gold-soft to-gold bg-clip-text pb-1 font-display text-[clamp(2.75rem,6vw,5.5rem)] font-bold uppercase leading-[0.95] tracking-[0.04em] text-transparent">
                    {r.name}
                  </h3>
                  <p className="mt-4 max-w-sm font-display text-lg italic leading-snug text-cream/85 md:text-2xl">
                    {t.buna.rounds[round]}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-6 border-t border-gold/20 pt-5">
          <p className="font-display text-cream/80">
            <span className="text-2xl text-gold-soft md:text-3xl">6,90 €</span> {t.buna.small}
          </p>
          <p className="font-display text-cream/80">
            <span className="text-2xl text-gold-soft md:text-3xl">9,90 €</span> {t.buna.large}
          </p>
          <p className="hidden font-display text-cream/80 md:block">
            <span className="text-2xl text-gold-soft md:text-3xl">2,50 €</span> {t.buna.cup}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
