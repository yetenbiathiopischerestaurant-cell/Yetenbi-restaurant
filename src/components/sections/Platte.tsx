"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import hero from "../../../public/img/hero.jpg";
import { Ambient, ease, Heading } from "../ui/primitives";
import { LalibelaCross } from "../heritage/Ornaments";
import { useLanguage } from "@/lib/language";
import { geez } from "@/lib/ethiopic";
import { useDishUrl, useMenuPhoto } from "@/components/Photos";
import { useMenu } from "@/components/MenuFacts";
import { priceText, tagsOf, type Dish as MenuDish } from "@/lib/menu";

/*
  The platter shows the menu itself: the first dish of every tab (Vorspeisen first, the last tab last), in the
  order of the menu in /admin. Each dish gets a photo: its own where there is one, otherwise one for its tab.
  The owner can replace these pictures in /admin → Fotos.
*/
const PHOTO_BY_DISH: Record<string, string> = {
  "fleisch-0": "/img/dish/kitfo.jpg",
  "fleisch-6": "/img/dish/kitfo.jpg",
  "fleisch-1": "/img/dish/tibs.jpg",
  "fleisch-2": "/img/dish/keywot.jpg",
  "vegan-1": "/img/dish/shiro.jpg",
  "vegan-2": "/img/dish/misir.jpg",
  "vegan-3": "/img/dish/atkilt.jpg",
  "beilagen-0": "/img/dish/misir.jpg",
  "beilagen-1": "/img/dish/misir.jpg",
  "beilagen-2": "/img/dish/shiro.jpg",
  "beilagen-5": "/img/dish/atkilt.jpg",
};
const PHOTO_BY_TAB: Record<string, string> = {
  vorspeisen: "/img/bowls.jpg",
  vegan: "/img/platter.jpg",
  fleisch: "/img/dish/keywot.jpg",
  kinder: "/img/baskets.jpg",
  beilagen: "/img/dish/misir.jpg",
  kalt: "/img/cups.jpg",
  heiss: "/img/cups.jpg",
  kaffee: "/img/jebena-pour.jpg",
};
const photoOf = (dish: MenuDish) => PHOTO_BY_DISH[dish.id] ?? PHOTO_BY_TAB[dish.categoryId] ?? "/img/platter.jpg";

/** Distance of the dishes from the centre, in % of the plate. */
const RADIUS = 33;

// Spongy injera surface: fractal noise turned into scattered pores over a warm teff base.
const injera = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.11' numOctaves='2' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 0.33 0 0 0 0 0.22 0 0 0 0 0.12 0 0 0 -3.2 1.75'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`;

/*
  The menu's heart, served the Ethiopian way: one big injera platter on a woven mesob rim.
  The section pins and the platter turns as you scroll; whichever dish reaches the top is presented beside it.
*/
export default function Platte() {
  const menu = useMenu();
  // first dish of every tab that has one, with the tab's title
  const dishes = menu.flatMap((category) => (category.items[0] ? [{ ...category.items[0], tab: category.title }] : []));
  const N = Math.max(1, dishes.length);
  const STEP = 360 / N;
  // Dish size follows the number of dishes: about 70% of the gap between two neighbours, so even the
  // enlarged one at the top never touches the next (8 dishes: about 18% of the plate).
  const size = Math.min(26, 2 * RADIUS * Math.sin(Math.PI / N) * 0.7);
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const dishUrl = useDishUrl();
  const menuPhoto = useMenuPhoto();
  // the dish's own photo if the owner uploaded one, else the picture for its tab
  const pictureOf = (d: MenuDish) => menuPhoto(d.id) ?? dishUrl(photoOf(d));
  const { t, locale } = useLanguage();
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const turn = useSpring(useTransform(scrollYProgress, [0.06, 0.94], [0, -(N - 1) * STEP]), {
    stiffness: 90,
    damping: 24,
  });
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setActive(Math.min(N - 1, Math.max(0, Math.round(((progress - 0.06) / 0.88) * (N - 1)))));
  });

  const dish = dishes[Math.min(active, dishes.length - 1)];
  if (!dish) return null;

  return (
    <section ref={root} id="platte" className="relative" style={{ height: `${N * 70 + 60}vh` }}>
      <div className="sticky top-0 flex h-[100dvh] flex-col overflow-hidden px-5 pb-8 pt-24 md:px-8 md:pt-28">
        <Ambient src={hero} className="left-[-10%] top-[10%] h-[90%] w-[70%]" opacity={0.5} />
        <div className="pointer-events-none absolute left-[25%] top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.18),transparent_62%)]" />

        <div className="relative mx-auto w-full max-w-7xl">
          <Heading
            key={locale}
            label={t.platte.label}
            labelAm={locale === "am" ? undefined : "መሶብ"}
            title={t.platte.title}
            em={t.platte.em}
            size="md"
          />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-6 md:grid-cols-12 md:gap-10">
          {/* The platter */}
          <div className="flex justify-center md:col-span-6">
            <div className="relative aspect-square w-[min(62vw,32vh)] md:w-[min(44vw,66vh)]">
              {/* pointer at twelve o'clock */}
              <div aria-hidden className="absolute -top-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center">
                <LalibelaCross className="h-7 w-7 text-gold" />
                <span className="h-3 w-px bg-gold" />
              </div>

              <motion.div
                style={reduce ? undefined : { rotate: turn }}
                className="absolute inset-0 will-change-transform"
              >
                {/* woven mesob rim */}
                <div className="absolute inset-0 rounded-full bg-[repeating-conic-gradient(#3a2416_0deg_5deg,#c9a24a_5deg_6.5deg,#2a1a10_6.5deg_11deg,#8a2e1c_11deg_12.5deg)] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,162,74,0.4)]" />
                <div className="absolute inset-[3.2%] rounded-full bg-[repeating-radial-gradient(circle,#2a1a10_0_2px,#3a2416_2px_5px)] opacity-90" />
                {/* injera */}
                <div
                  className="absolute inset-[6%] rounded-full shadow-[inset_0_0_40px_rgba(60,35,15,0.65),inset_0_-12px_30px_rgba(40,22,10,0.5)]"
                  style={{
                    backgroundImage: `${injera}, radial-gradient(circle at 40% 35%, #dcbf92 0%, #c9a272 45%, #a37b4f 100%)`,
                    backgroundSize: "220px 220px, cover",
                  }}
                />
                {/* dishes */}
                {dishes.map((d, i) => {
                  const angle = (i * STEP - 90) * (Math.PI / 180);
                  const r = RADIUS;
                  const on = i === active;
                  return (
                    <div
                      key={d.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${50 + r * Math.cos(angle)}%`,
                        top: `${50 + r * Math.sin(angle)}%`,
                        width: `${size}%`,
                        height: `${size}%`,
                      }}
                    >
                      <div
                        className={`h-full w-full rounded-full shadow-[0_8px_18px_rgba(40,20,8,0.55),inset_0_0_14px_rgba(0,0,0,0.35)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          on
                            ? "scale-[1.12] ring-2 ring-gold-soft ring-offset-2 ring-offset-[#c9a272]"
                            : "scale-95 brightness-[0.8] saturate-[0.85]"
                        }`}
                        style={{
                          backgroundImage: `url(${pictureOf(d)})`,
                          backgroundSize: "cover",
                          borderRadius: "48% 52% 50% 50% / 52% 48% 52% 48%",
                        }}
                      />
                    </div>
                  );
                })}
                {/* rolled injera in the middle */}
                <div className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-radial-gradient(circle,#c9a272_0_5px,#a37b4f_5px_7px)] shadow-[0_6px_14px_rgba(40,20,8,0.5)]" />
              </motion.div>
            </div>
          </div>

          {/* The dish at the top */}
          <div className="relative min-h-[13rem] md:col-span-6 md:min-h-[24rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
                transition={{ duration: 0.55, ease }}
              >
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">{dish.tab[locale]}</p>
                {dish.amharic && dish.amharic !== dish.name[locale] && (
                  <p className="mt-2 font-ethiopic text-lg text-gold/90" lang="am">
                    {dish.amharic}
                  </p>
                )}
                <h3 className="mt-1 flex flex-wrap gap-x-[0.3em] overflow-hidden pb-2 font-display text-[clamp(2.2rem,5vw,4.6rem)] font-bold leading-[0.98] tracking-[0.02em]">
                  {dish.name[locale]
                    .toUpperCase()
                    .split(" ")
                    .map((word, w) => (
                      <span key={w} className="inline-block whitespace-nowrap">
                        {word.split("").map((letter, i) => (
                          <motion.span
                            key={i}
                            className="inline-block bg-gradient-to-b from-[#f6e2a8] via-gold-soft to-gold bg-clip-text text-transparent"
                            initial={{ y: "105%", rotate: 8 }}
                            animate={{ y: "0%", rotate: 0 }}
                            transition={{ duration: 0.9, ease, delay: (w * 6 + i) * 0.03 }}
                          >
                            {letter}
                          </motion.span>
                        ))}
                      </span>
                    ))}
                </h3>
                {dish.description && (
                  <p className="mt-3 line-clamp-4 max-w-md font-display text-lg italic leading-snug text-cream/85 md:mt-4 md:text-xl">
                    {dish.description[locale]}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {dish.price > 0 && (
                    <span className="font-display text-3xl text-gold-soft md:text-4xl">{priceText(dish.price)} €</span>
                  )}
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-cream/68">
                    {tagsOf(dish)
                      .map((tag) => t.tags[tag])
                      .join(" / ")}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Where on the platter we are */}
        <div className="relative mx-auto w-full max-w-7xl">
          <ol className="hidden gap-3 md:grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
            {dishes.map((d, i) => (
              <li
                key={d.id}
                className={`text-sm transition-colors duration-500 ${i === active ? "text-cream" : "text-cream/55"}`}
              >
                <span className="block h-px overflow-hidden bg-cream/15">
                  <span
                    className={`block h-full bg-gold transition-[width] duration-700 ${i <= active ? "w-full" : "w-0"}`}
                  />
                </span>
                <span className="mt-2 flex items-baseline gap-2 font-display text-sm leading-tight">
                  <span lang="am" className="font-ethiopic text-xs text-gold/70">
                    {geez(i + 1)}
                  </span>
                  <span className="truncate">{d.tab[locale]}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="h-px bg-cream/15 md:hidden">
            <motion.div style={{ scaleX: bar }} className="h-full origin-left bg-gold" />
          </div>
        </div>
      </div>
    </section>
  );
}
