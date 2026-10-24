"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { StaticImageData } from "next/image";
import { motion as m, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import jebenaSet from "../../../public/img/jebena-set.jpg";
import cups from "../../../public/img/cups.jpg";
import bowls from "../../../public/img/bowls.jpg";
import Jebena from "../Jebena";
import Embers from "../motion/Embers";
import { Ambient, ease, FlagWash, GoldButton, Lead, Rise, Title } from "../ui/primitives";
import { AksumFrame, Harag, LalibelaCross, Tibeb } from "../heritage/Ornaments";
import { useLanguage } from "@/lib/language";
import { Photo } from "@/components/Photos";
import { AllergenFacts, DrinkFacts, FactsLegend, useMenu, useTagLabels } from "@/components/MenuFacts";
import { hasAllergenData, priceText, type Dish } from "@/lib/menu";
import { ONLINE_ORDERING } from "@/lib/features";

/** Dim photograph bleeding in from one side, like the pictures around the text on the printed menu. */
function SidePhoto({ src, side }: { src: StaticImageData; side: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute top-[8%] hidden h-[84%] w-[34vw] overflow-hidden lg:block ${
        side === "left"
          ? "left-0 [mask-image:linear-gradient(to_right,#000_10%,transparent)]"
          : "right-0 [mask-image:linear-gradient(to_left,#000_10%,transparent)]"
      }`}
    >
      <m.div style={{ y }} className="absolute -inset-y-[14%] inset-x-0">
        <Photo
          src={src}
          alt=""
          fill
          sizes="34vw"
          placeholder="blur"
          className="object-cover opacity-[0.38] saturate-[0.85]"
        />
      </m.div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink" />
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

function Item({ item, compact, drink }: { item: Dish; compact: boolean; drink: boolean }) {
  const { t, locale } = useLanguage();
  const tags = useTagLabels(item);
  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
      className="group"
    >
      <div className="flex items-baseline gap-3">
        <h4
          className={`font-display font-semibold text-cream transition-colors duration-500 group-hover:text-gold-soft ${
            compact ? "text-xl" : "text-[1.6rem] leading-tight"
          }`}
        >
          {item.name[locale]}
        </h4>
        <span aria-hidden className="mb-1.5 flex-1 border-b border-dotted border-gold/35" />
        <span
          className={`shrink-0 whitespace-nowrap font-display tabular-nums text-gold-soft ${compact ? "text-xl" : "text-[1.6rem]"}`}
        >
          {priceText(item.price)} €
        </span>
      </div>
      {item.amharic && (
        <p className="mt-0.5 font-ethiopic text-[13px] text-gold/60" lang="am">
          {item.amharic}
        </p>
      )}
      {item.description && (
        <p
          className={`max-w-[60ch] leading-relaxed text-cream/68 ${compact ? "mt-0.5 text-sm" : "mt-2 text-[0.95rem]"}`}
        >
          {item.description[locale]}
        </p>
      )}
      {drink && (
        <p className="mt-0.5">
          <DrinkFacts dish={item} />
        </p>
      )}
      {!item.available && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#f0a080]">{t.menu.soldOut}</p>
      )}
      {tags.length > 0 && !compact && (
        <p className="mt-2 font-display text-[0.95rem] italic text-gold/80">{tags.join(", ")}</p>
      )}
      <AllergenFacts dish={item} className="mt-1" />
    </motion.li>
  );
}

/** The menu as a framed card, modelled on Yetenbi's printed black-and-gold menu. */
export default function MenuCard() {
  const menu = useMenu().filter((category) => category.items.length > 0);
  const [active, setActive] = useState(menu[0]?.id ?? "");
  const reduce = useReducedMotion();
  const category = menu.find((category) => category.id === active) ?? menu[0];
  const compact = category?.items.every((dish) => !dish.description || dish.description.de.length < 40) ?? true;
  const { t, locale } = useLanguage();

  return (
    <section id="speisekarte" className="relative overflow-hidden py-32 md:py-48">
      <FlagWash tone="red" className="-right-[20%] bottom-[5%] h-[60%] w-[60%]" />
      <SidePhoto src={jebenaSet} side="left" />
      <SidePhoto src={cups} side="right" />
      <Ambient src={bowls} className="left-1/2 top-[20%] h-[70%] w-[90vw] -translate-x-1/2" opacity={0.35} />
      <div className="pointer-events-none absolute left-1/2 top-[30%] h-[80vmin] w-[100vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(201,162,74,0.16),transparent_62%)]" />
      <Embers count={18} />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex flex-col items-center text-center">
          <Rise>
            <Jebena className="h-14 w-10 text-gold" draw />
          </Rise>
          <Title
            key={locale}
            text={t.menu.title}
            className="mt-6 text-[clamp(3rem,7vw,6rem)] leading-none text-cream"
          />
          <Lead className="mt-5 max-w-xl text-center">{t.menu.lead}</Lead>
          {ONLINE_ORDERING && (
            <Rise className="mt-8" delay={0.3}>
              <GoldButton href="/bestellen">{t.order.menuCta}</GoldButton>
            </Rise>
          )}
        </div>

        <Rise className="mt-16" delay={0.15}>
          <AksumFrame className="shadow-[0_60px_140px_-40px_rgba(201,162,74,0.25)]">
            <div className="relative overflow-hidden bg-ink/70 bg-[radial-gradient(ellipse_at_top,rgba(201,162,74,0.16),transparent_60%)] px-5 pb-14 pt-16 md:px-14 md:pb-16 md:pt-20">
              {/* manuscript head: harag interlace between two crosses */}
              <div aria-hidden className="absolute inset-x-6 top-5 flex items-center gap-3 md:inset-x-10">
                <LalibelaCross className="h-6 w-6 shrink-0 text-gold" />
                <Harag className="flex-1 opacity-80" />
                <LalibelaCross className="h-6 w-6 shrink-0 text-gold" />
              </div>
              <Tibeb className="absolute inset-x-0 bottom-0 opacity-60" />
              <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-[0.06]" />
              <div
                role="tablist"
                aria-label={t.menu.categories}
                className="-mx-5 flex gap-6 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:gap-x-7 md:gap-y-3 md:overflow-visible md:px-0"
              >
                {menu.map((category) => (
                  <button
                    key={category.id}
                    role="tab"
                    aria-selected={active === category.id}
                    onClick={() => setActive(category.id)}
                    className={`relative shrink-0 pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] transition-colors duration-500 ${
                      active === category.id ? "text-gold-soft" : "text-cream/50 hover:text-cream/85"
                    }`}
                  >
                    {category.title[locale]}
                    {active === category.id && (
                      <motion.span
                        layoutId="menu-underline"
                        className="absolute inset-x-0 bottom-0 h-px bg-gold"
                        transition={{ duration: 0.6, ease }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {category && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={category.id}
                    role="tabpanel"
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                    transition={{ duration: 0.45, ease }}
                    className="mt-12"
                  >
                    <div className="text-center">
                      <h3 className="font-display text-2xl font-semibold uppercase tracking-[0.1em] text-gold-soft sm:text-3xl sm:tracking-[0.18em] md:text-4xl">
                        {category.title[locale]}
                      </h3>
                      <div className="mt-4">
                        <Ornament />
                      </div>
                      {category.note && (
                        <p className="mx-auto mt-5 max-w-2xl font-display text-lg italic leading-snug text-cream/80">
                          {category.note[locale]}
                        </p>
                      )}
                    </div>

                    <motion.ul
                      initial="hidden"
                      animate="show"
                      transition={{ staggerChildren: 0.06, delayChildren: 0.15 }}
                      className={`mt-12 ${compact ? "grid gap-x-14 gap-y-5 md:grid-cols-2" : "mx-auto max-w-3xl space-y-9"}`}
                    >
                      {category.items.map((item) => (
                        <Item key={item.id} item={item} compact={compact} drink={category.drinks} />
                      ))}
                    </motion.ul>
                  </motion.div>
                </AnimatePresence>
              )}

              <div className="mt-16 text-center">
                <Ornament />
                <p className="mt-5 font-display text-2xl italic text-cream/85">{t.menu.appetit}</p>
                <p className="mt-2 text-xs text-cream/50">
                  {hasAllergenData(menu) ? t.menu.priceNoteCodes : t.menu.priceNote}
                </p>
                {hasAllergenData(menu) && <FactsLegend className="mx-auto mt-4 max-w-2xl text-left" />}
              </div>
            </div>
          </AksumFrame>
        </Rise>
      </div>
    </section>
  );
}
