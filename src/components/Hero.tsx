"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import heroImg from "../../public/img/hero.jpg";
import { restaurant } from "@/lib/data";
import Magnetic from "./motion/Magnetic";
import Embers from "./motion/Embers";
import { useIntro } from "./intro/IntroState";
import { useLanguage } from "@/lib/language";
import { ArrowRight } from "@phosphor-icons/react";
import Stela, { STELA_FLOORS } from "./heritage/Stela";
import { LalibelaCross, Tibeb } from "./heritage/Ornaments";
import { Photo } from "@/components/Photos";

const ease = [0.22, 1, 0.36, 1] as const;
const intro = 0.15; // the entrance starts when the particle intro hands over
const title = "YETENBI".split("");

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.25]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const { done } = useIntro();
  const { t } = useLanguage();
  const [lit, setLit] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // One flag across the whole word: tell every letter the word's width and where the letter sits in it.
  useEffect(() => {
    const heading = titleRef.current;
    if (!heading) return;
    const measure = () => {
      const letters = [...heading.querySelectorAll<HTMLElement>("[data-letter]")];
      if (letters.length === 0) return;
      const start = letters[0].offsetLeft;
      const last = letters[letters.length - 1];
      heading.style.setProperty("--flag-w", `${last.offsetLeft + last.offsetWidth - start}px`);
      letters.forEach((letter) => letter.style.setProperty("--flag-x", `${letter.offsetLeft - start}px`));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(heading);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, []);

  // Once the lines are drawn, the windows light up one storey at a time.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setLit(STELA_FLOORS), 1900);
    return () => clearTimeout(timer);
  }, [done]);

  return (
    <section ref={ref} id="top" className="relative h-[100dvh] min-h-[640px] overflow-hidden">
      <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-0 will-change-transform">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.3 }}
          animate={done ? { scale: 1 } : undefined}
          transition={{ duration: 2.6, ease, delay: intro - 0.6 }}
        >
          <Photo
            src={heroImg}
            alt="Äthiopische Beyaynetu-Platte mit Injera, Wots und Gemüse"
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </motion.div>

      {/* the photograph comes out of darkness: an overlay fade instead of a brightness filter */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-ink"
        initial={{ opacity: 0.8 }}
        animate={done ? { opacity: 0 } : undefined}
        transition={{ duration: 2.6, ease, delay: intro - 0.6 }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.05]" />
      <Embers />

      <motion.div
        style={{ y: textY, opacity: fade }}
        className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5 pt-20 will-change-transform md:px-8"
      >
        <motion.p
          className="font-ethiopic text-lg text-gold/90 md:text-xl"
          lang="am"
          initial={{ opacity: 0, y: 20 }}
          animate={done ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1, ease, delay: intro }}
        >
          እንኳን ደህና መጡ · {t.hero.welcome}
        </motion.p>

        <h1
          ref={titleRef}
          className="mt-3 flex overflow-hidden font-display text-[clamp(4.5rem,15vw,12rem)] font-bold leading-[0.9] tracking-[0.04em] drop-shadow-[0_6px_24px_rgba(10,6,2,0.55)]"
          aria-label="Yetenbi"
        >
          {title.map((word, index) => (
            <motion.span
              key={index}
              aria-hidden
              data-letter
              className="flag-fill inline-block"
              initial={{ y: "105%", rotate: 8 }}
              animate={done ? { y: "0%", rotate: 0 } : undefined}
              transition={{ duration: 1.3, ease, delay: intro + 0.1 + index * 0.06 }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.div
          className="mt-4 flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={done ? { opacity: 1 } : undefined}
          transition={{ duration: 1, delay: intro + 0.7 }}
        >
          <motion.span
            className="h-px w-16 origin-left bg-gold"
            initial={{ scaleX: 0 }}
            animate={done ? { scaleX: 1 } : undefined}
            transition={{ duration: 1.2, ease, delay: intro + 0.7 }}
          />
          <LalibelaCross className="h-5 w-5 shrink-0 text-gold" />
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-cream/85 md:text-xs">
            {t.hero.tagline}
          </p>
        </motion.div>

        <motion.p
          className="mt-8 max-w-xl font-display text-2xl italic leading-snug text-cream/85 md:text-[2rem]"
          initial={{ opacity: 0, y: 30 }}
          animate={done ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1.2, ease, delay: intro + 0.85 }}
        >
          {t.hero.subtitle}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={done ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1.2, ease, delay: intro + 1 }}
        >
          <Magnetic>
            <a
              href="#speisekarte"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gold px-8 py-4 font-semibold text-ink"
            >
              <span className="absolute inset-0 -translate-x-full bg-cream transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
              <span className="relative">{t.hero.cta}</span>
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px">
                <ArrowRight size={14} weight="bold" />
              </span>
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href={restaurant.phoneHref}
              className="inline-flex items-center gap-3 rounded-full border border-cream/30 px-8 py-4 font-semibold text-cream backdrop-blur-sm transition-colors duration-500 hover:border-gold hover:text-gold-soft"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-eth-green opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-eth-green" />
              </span>
              {restaurant.phone}
            </a>
          </Magnetic>
        </motion.div>
      </motion.div>

      {/* An Aksumite stela rises over the right of the photograph, its windows lit one storey at a time */}
      <motion.div
        style={{ y: textY, opacity: fade }}
        className="pointer-events-none absolute bottom-0 right-[3%] hidden h-[90%] text-gold will-change-transform lg:block xl:right-[8%]"
        initial={{ opacity: 0 }}
        animate={done ? { opacity: 1 } : undefined}
        transition={{ duration: 0.6, delay: intro + 0.3 }}
      >
        <div className="absolute inset-x-[-40%] bottom-0 top-[20%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(28,23,18,0.6),transparent_70%)]" />
        {/* candle glow behind the stelae: one composited layer gently breathing, instead of per-window filters */}
        <div className="glow-breathe absolute inset-x-[-20%] bottom-[5%] top-[15%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(233,150,58,0.22),transparent_65%)]" />
        {done && (
          <div className="relative flex h-full items-end">
            {/* a field of stelae, as at Aksum: the great one in front, two smaller behind */}
            <Stela className="-mr-6 h-[60%] w-auto text-gold/65" draw delay={intro + 0.9} lit={lit} stagger={0.5} />
            <Stela className="relative z-10 h-full w-auto" draw delay={intro + 0.4} lit={lit} stagger={0.35} />
            <Stela className="-ml-4 h-[46%] w-auto text-gold/55" draw delay={intro + 1.2} lit={lit} stagger={0.6} />
          </div>
        )}
      </motion.div>

      {/* Info strip */}
      <motion.ul
        className="absolute inset-x-0 bottom-0 mx-auto hidden max-w-7xl items-center gap-10 px-8 pb-12 text-xs uppercase tracking-[0.25em] text-cream/68 md:flex"
        initial={{ opacity: 0 }}
        animate={done ? { opacity: 1 } : undefined}
        transition={{ duration: 1, delay: intro + 1.4 }}
      >
        <li>{t.hero.services}</li>
        <li aria-hidden className="h-3 w-px bg-gold/50" />
        <li>{restaurant.street}</li>
        <li aria-hidden className="h-3 w-px bg-gold/50" />
        <li>{t.hero.price}</li>
      </motion.ul>
      <motion.div
        className="absolute inset-x-0 bottom-0"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={done ? { opacity: 0.8, scaleX: 1 } : undefined}
        transition={{ duration: 1.6, ease, delay: intro + 1.2 }}
      >
        <Tibeb />
      </motion.div>
    </section>
  );
}
