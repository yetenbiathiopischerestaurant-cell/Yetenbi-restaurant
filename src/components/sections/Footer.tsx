"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";
import { restaurant } from "@/lib/data";
import CookieSettings from "../CookieSettings";
import FooterWordmark from "../FooterWordmark";
import { Jebena3D } from "../three/Scenes";
import Stela from "../heritage/Stela";
import { Tibeb } from "../heritage/Ornaments";

export default function Footer() {
  const { t, locale } = useLanguage();
  return (
    <footer className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[70vmin] w-[70vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.16),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-center pb-10 text-center">
          <Jebena3D className="h-[260px] w-full max-w-xs md:h-[320px]" />
          <p className="-mt-4 font-display text-4xl italic text-cream md:text-5xl">{t.footer.bye}</p>
          {locale !== "am" && (
            <p className="mt-2 font-ethiopic text-lg text-gold/80" lang="am">
              በሰላም ይመለሱ
            </p>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="flex flex-col gap-8 py-14 md:flex-row md:items-end md:justify-between">
          <p className="max-w-sm font-display text-2xl italic leading-snug text-cream/85">{t.footer.thanks}</p>
          <div className="flex flex-col gap-1 text-sm text-cream/68 md:items-end">
            <span>
              {restaurant.street}, {restaurant.city}
            </span>
            <a href={restaurant.phoneHref} className="transition-colors hover:text-gold-soft">
              {restaurant.phone}
            </a>
            <span className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              <Link href="/impressum" className="transition-colors hover:text-gold-soft">
                {t.footer.imprint}
              </Link>
              <Link href="/datenschutz" className="transition-colors hover:text-gold-soft">
                {t.footer.privacy}
              </Link>
              <Link href="/bestellbedingungen" className="transition-colors hover:text-gold-soft">
                {t.footer.terms}
              </Link>
              <CookieSettings className="cursor-pointer transition-colors hover:text-gold-soft" />
            </span>
          </div>
        </div>
      </div>
      <div className="relative">
        <Stela
          className="pointer-events-none absolute bottom-0 left-[2%] hidden h-[160%] w-auto text-gold/40 md:block"
          glow={false}
        />
        <Stela
          className="pointer-events-none absolute bottom-0 right-[2%] hidden h-[160%] w-auto text-gold/40 md:block"
          glow={false}
        />
        <FooterWordmark />
      </div>
      <Tibeb className="opacity-70" />
      <p className="pb-6 pt-2 text-center text-xs text-cream/55">
        © 2026 Yetenbi Äthiopisches Restaurant & Café, Würzburg
      </p>
    </footer>
  );
}
