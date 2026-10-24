"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language";
import CookieSettings from "./CookieSettings";

/* Impressum, Datenschutz and Bestellbedingungen, reachable from every page (§ 5 DDG, Art. 12 DSGVO). */
export default function LegalLinks({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const links = [
    { href: "/impressum", label: t.footer.imprint },
    { href: "/datenschutz", label: t.footer.privacy },
    { href: "/bestellbedingungen", label: t.footer.terms },
  ];
  return (
    <nav
      aria-label={t.footer.legal}
      className={`flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-cream/60 ${className}`}
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="underline-offset-4 transition-colors hover:text-gold-soft hover:underline"
        >
          {link.label}
        </Link>
      ))}
      <CookieSettings className="cursor-pointer underline-offset-4 transition-colors hover:text-gold-soft hover:underline" />
    </nav>
  );
}
