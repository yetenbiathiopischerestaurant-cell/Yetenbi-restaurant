"use client";

import { useCallback, useRef, useState } from "react";
import { logout } from "@/app/account-actions";
import { useLanguage } from "@/lib/language";
import { Tibeb } from "./heritage/Ornaments";

/*
  "Cookie-Einstellungen": shows what this site has stored in the visitor's browser right now and lets them remove it.
  The site only stores what its features need (§ 25 Abs. 2 Nr. 2 TDDDG), so there is nothing to opt in to and no
  banner; this is the place to look and to delete. Keep the list in step with section 12 of /datenschutz.
*/

type Entry = {
  id: string;
  name: { de: string; en: string };
  purpose: { de: string; en: string };
  duration: { de: string; en: string };
  kind: "cookie" | "storage";
  storageKey?: string;
  /** A cookie scripts can read (and delete), unlike the httpOnly sign-in cookie. */
  cookieName?: string;
};

const ENTRIES: Entry[] = [
  {
    id: "session",
    name: { de: "Anmeldung", en: "Sign-in" },
    purpose: { de: "Hält Sie angemeldet (Cookie „yt_session“).", en: "Keeps you signed in (cookie “yt_session”)." },
    duration: { de: "30 Tage oder bis zum Abmelden", en: "30 days or until you sign out" },
    kind: "cookie",
  },
  {
    id: "oauth",
    name: { de: "Anmeldung mit Google", en: "Google sign-in" },
    purpose: {
      de: "Sichert den Wechsel zu Google und zurück ab.",
      en: "Secures the hand-over to Google and back.",
    },
    duration: { de: "höchstens 10 Minuten, nur beim Anmelden", en: "at most 10 minutes, only while signing in" },
    kind: "cookie",
  },
  {
    id: "locale",
    name: { de: "Sprache", en: "Language" },
    purpose: {
      de: "Merkt sich, ob Sie Deutsch, Englisch oder Amharisch gewählt haben.",
      en: "Remembers your language.",
    },
    duration: { de: "bis Sie es löschen", en: "until you delete it" },
    kind: "storage",
    storageKey: "yt-locale",
  },
  {
    id: "intro",
    name: { de: "Intro gesehen", en: "Intro seen" },
    purpose: {
      de: "Merkt sich, dass Sie das Eingangs-Intro schon gesehen haben, damit es nicht bei jedem Besuch abläuft.",
      en: "Remembers that you have seen the opening intro, so it doesn't play on every visit.",
    },
    duration: { de: "bis Sie es löschen", en: "until you delete it" },
    kind: "storage",
    storageKey: "yt-intro-seen",
  },
  {
    id: "cart",
    name: { de: "Warenkorb", en: "Basket" },
    purpose: { de: "Hebt Ihren Warenkorb bis zur Bestellung auf.", en: "Keeps your basket until you order." },
    duration: { de: "bis zur Bestellung oder bis Sie es löschen", en: "until you order or delete it" },
    kind: "storage",
    storageKey: "yt-cart",
  },
  {
    id: "sound",
    name: { de: "Ton für das Team", en: "Sound for the team" },
    purpose: {
      de: "Nur im Verwaltungsbereich: Ton für neue Bestellungen an/aus.",
      en: "Admin area only: alert sound on/off.",
    },
    duration: { de: "bis Sie es löschen", en: "until you delete it" },
    kind: "storage",
    storageKey: "yt-alert-sound",
  },
  {
    id: "adminLang",
    name: { de: "Sprache der Verwaltung", en: "Admin language" },
    purpose: {
      de: "Nur im Team-Bereich: ob Verwaltung und Küche auf Deutsch oder Englisch erscheinen (Cookie „yt-admin-lang“).",
      en: "Team area only: whether the admin and kitchen screens show German or English (cookie “yt-admin-lang”).",
    },
    duration: { de: "1 Jahr", en: "1 year" },
    kind: "cookie",
    cookieName: "yt-admin-lang",
  },
];

const TEXT = {
  de: {
    open: "Cookie-Einstellungen",
    title: "Cookie-Einstellungen",
    lead: "Wir setzen keine Cookies für Werbung oder Statistik und binden keine Tracking-Dienste ein. Gespeichert wird nur, was eine Funktion braucht, die Sie gerade nutzen. Darum gibt es nichts, dem Sie zustimmen müssten.",
    here: "In diesem Browser gespeichert",
    notSet: "nicht gespeichert",
    active: "gespeichert",
    checking: "wird geprüft …",
    during: "nur beim Anmelden",
    clear: "Gespeicherte Daten löschen",
    cleared: "Gelöscht. Beim nächsten Besuch startet die Seite auf Deutsch, mit dem Intro und leerem Warenkorb.",
    nothing: "In diesem Browser ist nichts gespeichert.",
    signOut: "Abmelden und Anmelde-Cookie löschen",
    more: "Mehr dazu in der Datenschutzerklärung, Abschnitt 12.",
    close: "Schließen",
  },
  en: {
    open: "Cookie settings",
    title: "Cookie settings",
    lead: "We use no advertising or analytics cookies and no tracking services. We only store what a feature you are using needs, so there is nothing you have to agree to.",
    here: "Stored in this browser",
    notSet: "not stored",
    active: "stored",
    checking: "checking …",
    during: "only while signing in",
    clear: "Delete stored data",
    cleared: "Deleted. On your next visit the site starts in German, with the intro and an empty basket.",
    nothing: "Nothing is stored in this browser.",
    signOut: "Sign out and delete the sign-in cookie",
    more: "More in the privacy policy, section 12.",
    close: "Close",
  },
};

const readKey = (key: string) => {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};

const hasCookie = (name: string) => document.cookie.split("; ").some((pair) => pair.startsWith(`${name}=`));

export default function CookieSettings({ className = "" }: { className?: string }) {
  const { locale } = useLanguage();
  const lang = locale === "de" ? "de" : "en"; // the legal texts exist in German and English
  const t = TEXT[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const [stored, setStored] = useState<Record<string, boolean | null>>({});
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const local = Object.fromEntries([
      ...ENTRIES.filter((e) => e.storageKey).map((e) => [e.id, readKey(e.storageKey!)]),
      ...ENTRIES.filter((e) => e.cookieName).map((e) => [e.id, hasCookie(e.cookieName!)]),
    ]);
    setStored({ ...local, session: null });
    // The sign-in cookie is invisible to scripts (httpOnly); ask the server whether it is there.
    const signedIn = await fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { user: unknown }) => Boolean(j.user))
      .catch(() => false);
    setStored((s) => ({ ...s, session: signedIn }));
  }, []);

  const open = () => {
    setMessage("");
    void refresh();
    dialog.current?.showModal();
  };

  const clear = () => {
    for (const e of ENTRIES) {
      if (e.cookieName) document.cookie = `${e.cookieName}=; path=/; max-age=0; samesite=lax`;
      if (!e.storageKey) continue;
      try {
        window.localStorage.removeItem(e.storageKey);
      } catch {
        // storage blocked: nothing was stored
      }
    }
    window.dispatchEvent(new Event("storage")); // language and basket hooks re-read
    setMessage(t.cleared);
    void refresh();
  };

  const anyLocal = ENTRIES.some((e) => (e.storageKey || e.cookieName) && stored[e.id]);

  return (
    <>
      <button type="button" onClick={open} className={className}>
        {t.open}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cookie-settings-title"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gold/35 bg-coal p-0 text-left text-cream shadow-2xl backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        <Tibeb className="opacity-80" />
        <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto px-5 pb-6 pt-5 sm:px-7">
          <h2 id="cookie-settings-title" className="font-display text-3xl font-semibold text-cream">
            {t.title}
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/80">{t.lead}</p>

          <h3 className="mt-6 text-sm font-semibold text-gold-soft">{t.here}</h3>
          <ul className="mt-2 divide-y divide-gold/15 border-y border-gold/15">
            {ENTRIES.map((e) => {
              const state =
                e.id === "oauth"
                  ? "during"
                  : stored[e.id] === undefined || stored[e.id] === null
                    ? "checking"
                    : stored[e.id]
                      ? "active"
                      : "notSet";
              return (
                <li key={e.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-cream">{e.name[lang]}</p>
                    <p className="text-sm text-cream/70">{e.purpose[lang]}</p>
                    <p className="text-xs text-sand">{e.duration[lang]}</p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
                      state === "active" ? "bg-gold/20 text-gold-soft" : "text-cream/55 ring-1 ring-cream/15"
                    }`}
                  >
                    {t[state]}
                  </span>
                </li>
              );
            })}
          </ul>

          <p role="status" className="mt-3 min-h-5 text-sm text-gold-soft">
            {message || (!anyLocal && stored.session === false ? t.nothing : "")}
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={clear}
              disabled={!anyLocal}
              className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.clear}
            </button>
            {stored.session && (
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full rounded-md px-4 py-2 text-sm text-cream ring-1 ring-gold/40 transition-colors hover:bg-gold/10 sm:w-auto"
                >
                  {t.signOut}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md px-4 py-2 text-sm text-cream/80 transition-colors hover:text-cream sm:ml-auto"
            >
              {t.close}
            </button>
          </div>
          <p className="mt-5 text-xs text-cream/60">
            <a href="/datenschutz#cookies" className="underline underline-offset-4 hover:text-gold-soft">
              {t.more}
            </a>
          </p>
        </div>
      </dialog>
    </>
  );
}
