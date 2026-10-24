"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowUpRight, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useAccount } from "@/lib/account-client";
import { ONLINE_ORDERING } from "@/lib/features";
import { homeFor, staffScreen } from "@/lib/roles";
import { useState } from "react";
import Jebena from "./Jebena";
import Magnetic from "./motion/Magnetic";
import { useIntro } from "./intro/IntroState";
import LanguageToggle from "./LanguageToggle";
import { useHtmlLang, useLanguage } from "@/lib/language";

const spring = [0.32, 0.72, 0, 1] as const;

export default function Header() {
  const { scrollY } = useScroll();
  const { done } = useIntro();
  const { t } = useLanguage();
  useHtmlLang();
  const me = useAccount();
  const accountHref = me ? homeFor(me.role) : "/login";
  // The team gets a labelled button to their screen; guests the account icon.
  const screen = me ? staffScreen(me.role) : null;
  const staffLabel = screen ? t.account.staffLabel[screen] : null;
  const accountLabel = staffLabel ?? (me ? t.account.myAccount : t.account.signIn);
  const links = [
    { href: "#platte", label: t.nav.links.platte },
    { href: "#speisekarte", label: t.nav.links.karte },
    { href: "#kaffee", label: t.nav.links.kaffee },
    { href: "#besuch", label: t.nav.links.anfahrt },
    ...(ONLINE_ORDERING ? [{ href: "/bestellen", label: t.order.navLink }] : []),
  ];
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  // Hide the bar while scrolling down (past the first screen), show it again when scrolling up.
  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(current > previous && current > 500 && !open);
  });

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 md:pt-5"
        initial={{ y: -120, opacity: 0 }}
        animate={done ? { y: hidden ? -120 : 0, opacity: hidden ? 0 : 1 } : undefined}
        transition={{ duration: 0.8, ease: spring, delay: done && !hidden ? 0.9 : 0 }}
      >
        <nav
          aria-label={t.nav.main}
          className="flex w-full max-w-5xl items-center justify-between gap-6 rounded-full border border-cream/10 bg-ink/55 py-2 pl-5 pr-2 shadow-[inset_0_1px_0_rgba(244,236,220,0.08),0_20px_50px_-20px_rgba(10,6,2,0.8)] backdrop-blur-md lg:w-max lg:justify-start"
        >
          <a href="#top" className="group flex shrink-0 items-center gap-2.5 text-gold" onClick={() => setOpen(false)}>
            <Jebena className="h-7 w-5 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-rotate-12" />
            <span className="font-display text-xl font-bold tracking-[0.2em] text-gold-soft">YETENBI</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-full px-4 py-2 text-[0.85rem] text-cream/80 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-cream/[0.06] hover:text-cream"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            {staffLabel ? (
              <Link
                href={accountHref}
                className="flex items-center gap-2 rounded-full border border-gold/60 py-1.5 pl-2.5 pr-4 text-sm font-semibold text-gold-soft transition-colors hover:bg-gold hover:text-ink"
              >
                <UserCircle size={20} weight="fill" />
                {staffLabel}
              </Link>
            ) : (
              <Link
                href={accountHref}
                aria-label={accountLabel}
                title={accountLabel}
                className="flex h-9 w-9 items-center justify-center rounded-full text-cream/80 transition-colors hover:bg-cream/[0.06] hover:text-gold-soft"
              >
                <UserCircle size={24} weight={me ? "fill" : "light"} />
              </Link>
            )}
            <LanguageToggle />
            <Magnetic strength={0.2}>
              <a
                href="#reservieren"
                className="group flex items-center gap-3 rounded-full btn-gild py-1.5 pl-5 pr-1.5 text-sm hover:bg-eth-green hover:bg-none hover:text-cream font-medium text-ink transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
              >
                {t.nav.reserve}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105">
                  <ArrowUpRight size={15} weight="bold" />
                </span>
              </a>
            </Magnetic>
          </div>

          <button
            type="button"
            className="relative h-10 w-10 shrink-0 rounded-full bg-cream/[0.06] lg:hidden"
            aria-label={open ? t.nav.close : t.nav.open}
            aria-expanded={open}
            onClick={() => setOpen((wasOpen) => !wasOpen)}
          >
            <span
              className={`absolute left-3 right-3 h-px bg-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open ? "top-1/2 rotate-45" : "top-[15px]"
              }`}
            />
            <span
              className={`absolute left-3 right-3 h-px bg-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open ? "top-1/2 -rotate-45" : "top-[24px]"
              }`}
            />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-ink/85 px-6 pb-12 pt-28 backdrop-blur-3xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: spring }}
          >
            <ul className="space-y-1">
              {links.map((link, index) => (
                <li key={link.href} className="overflow-hidden">
                  <motion.a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-2 font-display text-5xl text-cream"
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.7, ease: spring, delay: 0.08 + index * 0.05 }}
                  >
                    {link.label}
                  </motion.a>
                </li>
              ))}
            </ul>
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="mt-8 flex items-center gap-3 text-lg text-cream/85"
            >
              <UserCircle size={26} weight={me ? "fill" : "light"} className="text-gold-soft" />
              {accountLabel}
            </Link>
            <LanguageToggle className="mt-6 w-max" layoutId="lang-pill-mobile" />
            <motion.a
              href="#reservieren"
              className="mt-6 flex items-center justify-between rounded-full btn-gild py-2 pl-6 pr-2 font-medium hover:bg-eth-green hover:bg-none hover:text-cream text-ink"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: spring, delay: 0.4 }}
            >
              {t.nav.reserve}
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/10">
                <ArrowUpRight size={18} weight="bold" />
              </span>
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
