"use client";

import Link from "next/link";
import { LalibelaCross } from "@/components/heritage/Ornaments";
import LegalLinks from "@/components/LegalLinks";
import { useLanguage } from "@/lib/language";

/** "Page not found" in the visitor's language (German until their saved choice is read). */
export default function NotFoundView() {
  const { t } = useLanguage();
  return (
    <main
      id="main"
      className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-5 text-center"
    >
      <LalibelaCross className="h-10 w-10 text-gold" />
      <p className="mt-8 font-ethiopic text-xl text-gold/85" lang="am">
        ይቅርታ
      </p>
      <h1 className="mt-2 font-display text-5xl font-semibold text-cream md:text-6xl">{t.notFound.title}</h1>
      <p className="mt-4 font-display text-xl italic text-cream/75">{t.notFound.lead}</p>
      <Link
        href="/"
        className="mt-10 rounded-full btn-gild px-8 py-4 font-semibold text-ink hover:bg-eth-green hover:bg-none hover:text-cream"
      >
        {t.notFound.home}
      </Link>
      <LegalLinks className="mt-16" />
    </main>
  );
}
