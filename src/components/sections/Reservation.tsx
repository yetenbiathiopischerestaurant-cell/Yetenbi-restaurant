"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle, Minus, Plus, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { restaurant } from "@/lib/data";
import {
  addDays,
  BOOKING,
  slotsFor,
  todayISO,
  validateBooking,
  whatsappLink,
  type BookingErrorCode,
  type BookingErrors,
  type BookingRequest,
} from "@/lib/booking";
import { useLanguage } from "@/lib/language";
import { useAccount, useClosures } from "@/lib/account-client";
import Embers from "../motion/Embers";
import { ease, FlagWash, Heading, Rise } from "../ui/primitives";
import { AksumFrame, LalibelaCross, Tibeb } from "../heritage/Ornaments";
import { useHours } from "@/components/Business";
import BackHomeLink from "@/components/BackHomeLink";
import VerifyNotice from "@/components/account/VerifyNotice";

const inputClass =
  "w-full border-0 border-b bg-transparent px-0 pb-3 pt-1 font-display text-2xl text-cream placeholder:text-cream/35 transition-colors duration-500 focus:outline-none [color-scheme:dark] disabled:opacity-50";
/** Underline colour: red when the field has an error. */
const underline = (error?: string) => (error ? "border-[#f0a080]/70" : "border-gold/30 focus:border-gold");

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-[#f0a080]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

type Outcome = { kind: "booked"; reference: string; email: string } | { kind: "whatsapp"; link: string };

/** The ticket mirrors the form as you type. */
function Ticket({ form }: { form: BookingRequest }) {
  const { t, locale } = useLanguage();
  const dateLabel = form.date
    ? new Date(`${form.date}T12:00:00Z`).toLocaleDateString(t.dateLocale, {
        weekday: "short",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "";
  const cells = [
    { label: t.reserve.date, value: dateLabel },
    { label: t.reserve.time, value: form.time ? t.clock(form.time) : "" },
    { label: t.reserve.name, value: form.name.trim() },
    { label: t.reserve.phone, value: form.phone.trim() },
  ];
  return (
    <AksumFrame>
      <div className="relative bg-coal bg-[radial-gradient(ellipse_at_top,rgba(201,162,74,0.16),transparent_65%)]">
        <Tibeb className="absolute inset-x-0 top-0 opacity-70" />
        <div className="px-7 pb-6 pt-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-2xl font-bold tracking-[0.2em] text-gold-soft">YETENBI</p>
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-cream/55">Restaurant & Café</p>
            </div>
            <LalibelaCross className="h-10 w-10 text-gold" />
          </div>
          <p className="mt-8 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-cream/55">
            {t.reserve.ticketFor}
          </p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={form.guests}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="font-display text-7xl font-semibold leading-none text-cream"
            >
              {form.guests}
            </motion.p>
          </AnimatePresence>
        </div>
        <div aria-hidden className="relative h-6">
          <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-ink ring-1 ring-gold/30" />
          <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-ink ring-1 ring-gold/30" />
          <span className="absolute inset-x-5 top-1/2 border-t border-dashed border-gold/40" />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-7 pb-8 pt-4" lang={locale}>
          {cells.map((cell) => (
            <div key={cell.label} className="min-w-0">
              <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-cream/55">{cell.label}</dt>
              <dd
                className={`mt-1 truncate font-display text-lg ${cell.value ? "text-cream" : "italic text-cream/55"}`}
              >
                {cell.value || t.reserve.open}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between border-t border-gold/20 px-7 py-4 text-xs text-cream/55">
          <span>{restaurant.street}</span>
          <span>Würzburg</span>
        </div>
      </div>
    </AksumFrame>
  );
}

const EMPTY: BookingRequest = { name: "", email: "", phone: "", date: "", time: "", guests: 2, note: "" };

export default function Reservation() {
  const reduceMotion = useReducedMotion();
  const { t, locale } = useLanguage();
  const [form, setForm] = useState<BookingRequest>(EMPTY);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [today, setToday] = useState<string>();
  const [honeypot, setHoneypot] = useState("");
  const account = useAccount();
  const closures = useClosures();
  const week = useHours();
  const closedDates = useMemo(() => closures.map((closure) => closure.date), [closures]);
  // Booking needs an account with a confirmed email (undefined = still asking the server).
  const signedOut = account === null;
  const unverified = !!account && !account.emailVerified;

  // Signed-in guests get their details filled in (only into empty fields).
  useEffect(() => {
    if (!account) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({
      ...current,
      name: current.name || account.name,
      email: current.email || account.email,
      phone: current.phone || account.phone,
    }));
  }, [account]);

  // "Today" is only known in the browser; the static prerender must not depend on it.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setToday(todayISO()), []);

  const slots = useMemo(() => slotsFor(form.date, closedDates, week), [form.date, closedDates, week]);
  const errorText = (code?: BookingErrorCode) => (code ? t.reserve.errors[code] : undefined);

  const updateField = <K extends keyof BookingRequest>(key: K, value: BookingRequest[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      // A new day may not offer the chosen time: switch to 19:00, or else the first free time.
      if (key === "date") {
        const daySlots = slotsFor(String(value), closedDates, week);
        if (!daySlots.includes(next.time)) next.time = daySlots.includes("19:00") ? "19:00" : (daySlots[0] ?? "");
      }
      return next;
    });
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError(undefined);
  };

  const dateLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateBooking(form, undefined, closedDates, { week });
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale, website: honeypot }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 201) {
        setOutcome({ kind: "booked", reference: data.reference, email: form.email });
      } else if (response.status === 503) {
        // No booking database: hand the request over as a WhatsApp message instead.
        const link = whatsappLink(form, dateLabel(form.date));
        window.open(link, "_blank", "noopener,noreferrer");
        setOutcome({ kind: "whatsapp", link });
      } else if (response.status === 422 && data.errors) {
        setErrors(data.errors);
      } else if (response.status === 429) {
        setServerError(t.reserve.errors.busy);
      } else if (response.status === 401 || response.status === 403) {
        setServerError(t.reserve.loginText);
      } else {
        setServerError(t.reserve.errors.server);
      }
    } catch {
      setServerError(t.reserve.errors.server);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setOutcome(null);
    setForm((current) => ({ ...EMPTY, name: current.name, email: current.email, phone: current.phone }));
  };

  return (
    <section
      id="reservieren"
      className="relative overflow-hidden py-32 md:py-44 [content-visibility:auto] [contain-intrinsic-size:auto_900px]"
    >
      <FlagWash tone="red" className="-left-[25%] top-[15%] h-[80%] w-[65%]" />
      <div className="pointer-events-none absolute right-[10%] top-[35%] h-[80vmin] w-[80vmin] rounded-full bg-[radial-gradient(circle,rgba(201,162,74,0.18),rgba(218,90,26,0.06)_45%,transparent_70%)]" />
      <Embers count={16} />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Heading key={locale} label={t.reserve.label} title={t.reserve.title} em={t.reserve.em} size="md" />

        <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            {account && !account.emailVerified && !outcome && (
              <div className="mb-10">
                <VerifyNotice email={account.email} />
              </div>
            )}
            <AnimatePresence mode="wait">
              {outcome ? (
                <motion.div
                  key="done"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease }}
                  role="status"
                  className="flex min-h-[420px] flex-col justify-center"
                >
                  <CheckCircle size={52} weight="thin" className="text-gold-soft" />
                  {outcome.kind === "booked" ? (
                    <>
                      <h3 className="mt-6 font-display text-5xl font-semibold leading-[1.05] text-cream">
                        {t.reserve.sentTitle}
                      </h3>
                      <p className="mt-4 max-w-md font-display text-2xl italic leading-snug text-cream/85">
                        {t.reserve.sentText(outcome.email)}
                      </p>
                      <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
                        {t.reserve.sentRef}
                      </p>
                      <p className="font-display text-4xl tracking-[0.15em] text-gold-soft">{outcome.reference}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="mt-6 font-display text-5xl font-semibold text-cream">{t.reserve.waTitle}</h3>
                      <p className="mt-4 max-w-md font-display text-2xl italic leading-snug text-cream/85">
                        {t.reserve.waText}
                      </p>
                      <a
                        href={outcome.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex items-center gap-2 text-gold-soft underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
                      >
                        <WhatsappLogo size={18} /> {t.reserve.waAgain}
                      </a>
                    </>
                  )}
                  <BackHomeLink className="mt-8 w-max" />
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-8 w-max text-sm text-cream/70 underline decoration-cream/20 underline-offset-4 hover:text-cream"
                  >
                    {t.reserve.another}
                  </button>
                </motion.div>
              ) : signedOut ? (
                <ReserveSignIn key="signin" />
              ) : (
                <motion.form
                  key="form"
                  noValidate
                  onSubmit={submit}
                  initial={false}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid gap-x-10 gap-y-10 md:grid-cols-2"
                >
                  <Field id="res-name" label={t.reserve.name} error={errorText(errors.name)}>
                    <input
                      id="res-name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? "res-name-error" : undefined}
                      className={`${inputClass} ${underline(errors.name)}`}
                      placeholder={t.reserve.namePh}
                    />
                  </Field>
                  <Field id="res-email" label={t.reserve.email} error={errorText(errors.email)}>
                    <input
                      id="res-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={form.email}
                      readOnly={!!account}
                      onChange={(event) => updateField("email", event.target.value)}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "res-email-error" : undefined}
                      className={`${inputClass} ${underline(errors.email)}`}
                      placeholder={t.reserve.emailPh}
                    />
                  </Field>
                  <Field id="res-phone" label={t.reserve.phone} error={errorText(errors.phone)}>
                    <input
                      id="res-phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? "res-phone-error" : undefined}
                      className={`${inputClass} ${underline(errors.phone)}`}
                      placeholder="0176 1234567"
                    />
                  </Field>
                  <Field id="res-date" label={t.reserve.date} error={errorText(errors.date)}>
                    <input
                      id="res-date"
                      type="date"
                      min={today}
                      max={today ? addDays(today, BOOKING.maxDaysAhead) : undefined}
                      value={form.date}
                      onChange={(event) => updateField("date", event.target.value)}
                      aria-invalid={!!errors.date}
                      aria-describedby={errors.date ? "res-date-error" : undefined}
                      className={`${inputClass} ${underline(errors.date)}`}
                    />
                  </Field>
                  <Field id="res-time" label={t.reserve.time} error={errorText(errors.time)}>
                    <select
                      id="res-time"
                      value={form.time}
                      disabled={!slots.length}
                      onChange={(event) => updateField("time", event.target.value)}
                      aria-invalid={!!errors.time}
                      aria-describedby={errors.time ? "res-time-error" : undefined}
                      className={`${inputClass} ${underline(errors.time)} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2012%2012%22%3E%3Cpath%20d=%22M2%204l4%204%204-4%22%20fill=%22none%22%20stroke=%22%23c9a24a%22%20stroke-width=%221.5%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_4px_center] bg-no-repeat`}
                    >
                      {!slots.length && (
                        <option value="">{form.date ? t.reserve.errors.closed : t.reserve.chooseDate}</option>
                      )}
                      {slots.map((slot) => (
                        <option key={slot} value={slot} className="bg-coal text-base">
                          {t.clock(slot)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="res-guests" label={t.reserve.guests} error={errorText(errors.guests)}>
                    <div className="flex items-center justify-between border-b border-gold/30 pb-2">
                      <button
                        type="button"
                        aria-label={t.reserve.less}
                        onClick={() => updateField("guests", Math.max(1, form.guests - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold-soft transition-colors hover:bg-gold hover:text-ink active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <output
                        id="res-guests"
                        aria-live="polite"
                        className="font-display text-3xl tabular-nums text-cream"
                      >
                        {form.guests}
                      </output>
                      <button
                        type="button"
                        aria-label={t.reserve.more}
                        onClick={() => updateField("guests", Math.min(BOOKING.maxGuests + 1, form.guests + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold-soft transition-colors hover:bg-gold hover:text-ink active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </Field>
                  <div className="md:col-span-2">
                    <Field id="res-note" label={t.reserve.note} error={errorText(errors.note)}>
                      <input
                        id="res-note"
                        value={form.note}
                        maxLength={280}
                        onChange={(event) => updateField("note", event.target.value)}
                        className={`${inputClass} ${underline(errors.note)}`}
                        placeholder={t.reserve.notePh}
                      />
                    </Field>
                  </div>
                  {/* honeypot for bots: hidden from people and screen readers */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />
                  <div className="flex flex-col items-start gap-4 md:col-span-2">
                    {serverError && (
                      <p role="alert" className="text-sm text-[#f0a080]">
                        {serverError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={sending || !account || unverified}
                      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full btn-gild px-8 py-4 font-semibold text-ink hover:text-cream active:scale-[0.98] disabled:opacity-70"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-eth-green transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
                      <span className="relative">{sending ? t.reserve.sending : t.reserve.submit}</span>
                      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 transition-transform duration-500 group-hover:translate-x-1">
                        <ArrowRight size={14} weight="bold" />
                      </span>
                    </button>
                    <p className="text-xs text-cream/60">
                      {t.reserve.viaEmail} {t.reserve.orCall(restaurant.phone)}
                    </p>
                    <p className="text-xs text-cream/60">
                      {t.reserve.privacyNote}{" "}
                      <Link href="/datenschutz" className="text-gold-soft underline underline-offset-4">
                        {t.footer.privacy}
                      </Link>
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <Rise className="lg:col-span-5" delay={0.15}>
            <div className="lg:sticky lg:top-28">
              <Ticket form={form} />
            </div>
          </Rise>
        </div>
      </div>
    </section>
  );
}

/** Shown instead of the form to visitors who aren't signed in: booking a table needs an account. */
function ReserveSignIn() {
  const { t } = useLanguage();
  const next = encodeURIComponent("/#reservieren");
  return (
    <div className="flex min-h-[420px] flex-col justify-center">
      <div className="border border-gold/40 bg-gold/[0.05] p-6">
        <p className="font-display text-2xl text-cream">{t.reserve.loginTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-cream/75">{t.reserve.loginText}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/login?next=${next}`}
            className="rounded-full btn-gild px-6 py-3 text-sm font-semibold text-ink hover:bg-eth-green hover:bg-none hover:text-cream"
          >
            {t.order.loginButton}
          </Link>
          <Link
            href={`/login?mode=register&next=${next}`}
            className="rounded-full border border-gold/60 px-6 py-3 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink"
          >
            {t.order.registerButton}
          </Link>
        </div>
        <p className="mt-4 text-xs text-cream/60">{t.reserve.orCall(restaurant.phone)}</p>
      </div>
    </div>
  );
}
