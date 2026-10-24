"use client";

import Link from "next/link";
import Jebena from "../Jebena";
import LanguageToggle from "../LanguageToggle";
import { AksumFrame, Tibeb } from "../heritage/Ornaments";
import { useHtmlLang } from "@/lib/language";
import LegalLinks from "../LegalLinks";
import BackHomeLink from "../BackHomeLink";

/** Frame for the account pages: brand link home, language switch, and the gold-framed card. */
export default function AccountShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  useHtmlLang();
  return (
    <main id="main" className="relative min-h-[100dvh] px-5 pb-24 pt-8 md:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5 text-gold">
          <Jebena className="h-8 w-6 transition-transform duration-700 group-hover:-rotate-12" />
          <span className="font-display text-xl font-bold tracking-[0.2em] text-gold-soft">YETENBI</span>
        </Link>
        <LanguageToggle layoutId="lang-pill-account" />
      </div>
      <div className={`mx-auto mt-10 md:mt-14 ${wide ? "max-w-5xl" : "max-w-xl"}`}>
        <BackHomeLink className="mb-6" />
        <AksumFrame>
          <div className="relative bg-ink/80 bg-[radial-gradient(ellipse_at_top,rgba(201,162,74,0.12),transparent_60%)] px-6 pb-12 pt-14 md:px-12">
            <Tibeb className="absolute inset-x-0 top-0 opacity-60" />
            {children}
          </div>
        </AksumFrame>
        <LegalLinks className="mt-10" />
      </div>
    </main>
  );
}

export const fieldClass =
  "w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-3 pt-1 font-display text-2xl text-cream placeholder:text-cream/35 transition-colors duration-500 focus:border-gold focus:outline-none";

export function AuthField({
  id,
  label,
  hint,
  ...input
}: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
        {label}
      </label>
      <input id={id} name={id} className={fieldClass} aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-cream/55">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, pending }: { children: React.ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full btn-gild px-8 py-4 font-semibold text-ink hover:text-cream active:scale-[0.98] disabled:opacity-60"
    >
      <span className="absolute inset-0 -translate-x-full bg-eth-green transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
      <span className="relative">{children}</span>
    </button>
  );
}

export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error)
    return (
      <p role="alert" className="text-sm text-[#f0a080]">
        {error}
      </p>
    );
  if (ok)
    return (
      <p role="status" className="text-sm text-[#9fe0b6]">
        {ok}
      </p>
    );
  return null;
}
