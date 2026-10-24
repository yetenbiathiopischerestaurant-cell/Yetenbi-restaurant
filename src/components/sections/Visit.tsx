"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import jebenaSet from "../../../public/img/jebena-set.jpg";
import cups from "../../../public/img/cups.jpg";
import { restaurant } from "@/lib/data";
import HoursTable from "../heritage/HoursTable";
import { useLanguage } from "@/lib/language";
import Embers from "../motion/Embers";
import { Ambient, CinematicImage, FlagWash, GoldButton, Heading, Rise } from "../ui/primitives";
import { AksumFrame } from "../heritage/Ornaments";
import EthiopianNow from "../heritage/EthiopianNow";
import { Photo } from "@/components/Photos";
import SiteMap from "@/components/SiteMap";

export default function Visit() {
  const { t, locale } = useLanguage();
  const rows = [
    { term: t.visit.phone, value: restaurant.phone, href: restaurant.phoneHref },
    { term: t.visit.service, value: t.visit.serviceValue },
  ];

  return (
    <section
      id="besuch"
      className="relative overflow-hidden py-32 md:py-44 [content-visibility:auto] [contain-intrinsic-size:auto_900px]"
    >
      <FlagWash tone="green" className="-right-[20%] bottom-[0%] h-[70%] w-[60%]" />
      <Ambient src={jebenaSet} className="-left-[20%] top-[10%] h-[80%] w-[60%]" opacity={0.45} />
      <Ambient src={cups} className="-right-[15%] top-[30%] h-[70%] w-[60%]" opacity={0.3} />
      <Embers count={12} />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Heading key={locale} label={t.visit.label} title={t.visit.title} em={t.visit.em} size="md" />

        <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Arch photo with the facts */}
          <div className="grid grid-cols-1 items-end gap-8 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:col-span-5 lg:grid-cols-1">
            <AksumFrame>
              <CinematicImage
                src={jebenaSet}
                alt={t.visit.photoAlt}
                className="aspect-[4/5] lg:aspect-[5/4]"
                sizes="(min-width: 1024px) 35vw, 45vw"
              />
            </AksumFrame>
            <div className="space-y-5">
              <dl className="space-y-5">
                <Rise>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">
                    {t.visit.hours}
                  </dt>
                  <dd className="mt-2">
                    <HoursTable />
                  </dd>
                </Rise>
                {rows.map((row, index) => (
                  <Rise key={row.term} delay={index * 0.08}>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">{row.term}</dt>
                    <dd className="mt-1 font-display text-xl text-cream md:text-2xl">
                      {row.href ? (
                        <a href={row.href} className="transition-colors duration-500 hover:text-gold-soft">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </Rise>
                ))}
              </dl>
              <Rise delay={0.25} className="border-t border-gold/20 pt-6">
                <EthiopianNow />
              </Rise>
              <Rise delay={0.3} className="pt-2">
                <GoldButton href={restaurant.mapsUrl} external>
                  {t.visit.route}
                </GoldButton>
              </Rise>
            </div>
          </div>

          {/* Framed map */}
          <Rise className="lg:col-span-7" delay={0.15}>
            <AksumFrame className="h-full shadow-[0_60px_140px_-40px_rgba(201,162,74,0.28)]" inner="h-full">
              <div className="relative h-full">
                <SiteMap label={t.visit.mapLabel} className="h-[420px] w-full lg:h-full lg:min-h-[600px]" />
                <a
                  href={restaurant.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group absolute bottom-4 left-4 z-10 flex items-center gap-3 border border-gold/40 bg-ink/90 py-2 pl-2 pr-4"
                >
                  <span className="relative h-12 w-12 overflow-hidden">
                    <Photo src={cups} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span>
                    <span className="block font-display text-lg leading-tight text-cream">Yetenbi</span>
                    <span className="text-xs text-cream/68">{t.visit.near}</span>
                  </span>
                  <ArrowUpRight
                    size={16}
                    className="text-gold-soft transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </a>
              </div>
            </AksumFrame>
          </Rise>
        </div>
      </div>
    </section>
  );
}
