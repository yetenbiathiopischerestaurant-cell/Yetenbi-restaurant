"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition } from "react";
import { ADMIN_LANG_COOKIE, ADMIN_LANGS, adminDict, type AdminLang } from "@/lib/admin-i18n";

/*
  The team area's language for client components. The server reads the cookie and passes the language down through
  this provider, so the first render is already in the right language. The switch writes the cookie and refreshes,
  which re-renders the server parts too.
*/

const AdminLangContext = createContext<AdminLang>("de");

export function AdminLangProvider({ lang, children }: { lang: AdminLang; children: React.ReactNode }) {
  return <AdminLangContext.Provider value={lang}>{children}</AdminLangContext.Provider>;
}

export function useAdminText() {
  const lang = useContext(AdminLangContext);
  return { lang, t: adminDict(lang) };
}

/** Remembers the choice for a year on the whole site (the kitchen screen is outside /admin). */
function saveAdminLang(lang: AdminLang) {
  document.cookie = `${ADMIN_LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/** DE · EN switch for the team area. One year, whole site (the kitchen screen is outside /admin), no tracking. */
export function AdminLanguageToggle({ className = "" }: { className?: string }) {
  const { lang, t } = useAdminText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choose = (next: AdminLang) => {
    if (next === lang) return;
    saveAdminLang(next);
    startTransition(() => router.refresh());
  };
  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={`flex w-max items-center rounded-full border border-cream/15 p-0.5 ${pending ? "opacity-60" : ""} ${className}`}
    >
      {ADMIN_LANGS.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === lang}
          onClick={() => choose(option)}
          className={`rounded-full px-2.5 py-1 text-[0.72rem] font-semibold tracking-wider transition-colors ${
            option === lang ? "bg-gold text-ink" : "text-cream/70 hover:text-cream"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
