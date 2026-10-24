"use client";

import VerifyNotice from "@/components/account/VerifyNotice";
import Link from "next/link";
import { useActionState } from "react";
import { cancelMyBooking, changePassword, deleteAccount, logout, updateProfile } from "@/app/account-actions";
import { content, LOCALES, type Locale } from "@/lib/i18n";
import { formatEuro, type OrderStatus } from "@/lib/ordering";
import { useLanguage } from "@/lib/language";
import { homeFor, staffScreen, type Role } from "@/lib/roles";
import { AuthField, fieldClass, FormMessage, SubmitButton } from "@/components/account/AccountShell";

type ProfileBooking = {
  id: number;
  reference: string;
  date: string;
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "declined" | "cancelled";
};

type Props = {
  user: { name: string; email: string; phone: string; role: Role; locale: Locale; emailVerified: boolean };
  bookings: ProfileBooking[];
  today: string;
  /** false for accounts that only sign in with Google */
  hasPassword: boolean;
  orders: {
    reference: string;
    status: OrderStatus;
    total: number;
    createdAt: string;
    method: "delivery" | "pickup";
    url: string;
  }[];
};

const tone: Record<ProfileBooking["status"], string> = {
  pending: "border-gold/60 text-gold-soft",
  confirmed: "border-[#7fcf9c]/60 text-[#9fe0b6]",
  declined: "border-[#f0a080]/60 text-[#f0a080]",
  cancelled: "border-cream/30 text-cream/60",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gold/20 pt-10">
      <h2 className="font-display text-3xl font-semibold text-gold-soft">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function ProfileView({ user, bookings, today, hasPassword, orders }: Props) {
  const { t } = useLanguage();
  const text = t.account;
  const screen = staffScreen(user.role as Role);
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, null);
  const [pwState, pwAction, pwPending] = useActionState(changePassword, null);
  const [delState, delAction, delPending] = useActionState(deleteAccount, null);

  const upcoming = bookings
    .filter((booking) => booking.date >= today)
    .sort((first, second) => (first.date + first.time).localeCompare(second.date + second.time));
  const past = bookings.filter((booking) => booking.date < today);
  const dateLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(t.dateLocale, {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const renderList = (items: ProfileBooking[], canCancel: boolean) =>
    items.length === 0 ? (
      <p className="font-display text-xl italic text-cream/65">{text.none}</p>
    ) : (
      <ul className="space-y-3">
        {items.map((booking) => (
          <li
            key={booking.id}
            className="flex flex-wrap items-center justify-between gap-4 border border-gold/20 bg-ink/40 px-5 py-4"
          >
            <div>
              <p className="font-display text-xl text-cream">
                {dateLabel(booking.date)}, {t.clock(booking.time)}
              </p>
              <p className="text-sm text-cream/65">
                {t.reserve.guests}: {booking.guests} · {booking.reference}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${tone[booking.status]}`}>
                {text.status[booking.status]}
              </span>
              {canCancel && (booking.status === "pending" || booking.status === "confirmed") && (
                <form action={cancelMyBooking}>
                  <input type="hidden" name="id" value={booking.id} />
                  <button className="text-sm text-cream/70 underline underline-offset-4 hover:text-[#f0a080]">
                    {text.cancel}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-12">
      {!user.emailVerified && <VerifyNotice email={user.email} />}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{text.hello(user.name)}</h1>
          <p className="mt-2 text-cream/65">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {screen && (
            <Link
              href={homeFor(user.role)}
              className="rounded-full border border-gold/60 px-5 py-2 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink"
            >
              {{ owner: text.adminLink, kitchen: text.kitchenLink, driver: text.driverLink }[screen]}
            </Link>
          )}
          <form action={logout}>
            <button className="text-sm text-cream/70 underline underline-offset-4 hover:text-cream">
              {text.signOut}
            </button>
          </form>
        </div>
      </div>

      <Section title={text.upcoming}>
        {renderList(upcoming, true)}
        <Link
          href="/#reservieren"
          className="mt-6 inline-block text-sm font-semibold text-gold-soft underline decoration-gold/40 underline-offset-4"
        >
          {text.bookNow}
        </Link>
      </Section>

      {orders.length > 0 && (
        <Section title={t.order.orders}>
          <ul className="space-y-3">
            {orders.map((order) => (
              <li
                key={order.reference}
                className="flex flex-wrap items-center justify-between gap-4 border border-gold/20 bg-ink/40 px-5 py-4"
              >
                <div>
                  <p className="font-display text-xl text-cream">
                    {new Date(order.createdAt).toLocaleDateString(t.dateLocale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {formatEuro(order.total, t.dateLocale)}
                  </p>
                  <p className="text-sm text-cream/65">
                    {order.method === "delivery" ? t.order.delivery : t.order.pickup} · {order.reference} ·{" "}
                    {t.order.status[order.status]}
                  </p>
                </div>
                <a
                  href={order.url}
                  className="text-sm font-semibold text-gold-soft underline decoration-gold/40 underline-offset-4"
                >
                  {t.order.viewStatus}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {past.length > 0 && <Section title={text.past}>{renderList(past, false)}</Section>}

      <Section title={text.details}>
        <form action={profileAction} className="grid gap-8 md:grid-cols-2">
          <AuthField id="name" label={text.name} defaultValue={user.name} autoComplete="name" required />
          <AuthField id="phone" label={text.phone} defaultValue={user.phone} type="tel" autoComplete="tel" />
          <div className="flex flex-col gap-2">
            <label htmlFor="locale" className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
              {text.language}
            </label>
            <select
              id="locale"
              name="locale"
              defaultValue={user.locale}
              className={`${fieldClass} [color-scheme:dark]`}
            >
              {LOCALES.map((option) => (
                <option key={option} value={option} className="bg-coal text-base">
                  {content[option].langName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-start justify-end gap-3">
            <FormMessage
              error={profileState?.error && text.errors[profileState.error]}
              ok={profileState?.ok ? text.saved : undefined}
            />
            <SubmitButton pending={profilePending}>{text.save}</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title={text.changePw}>
        {!hasPassword && <p className="mb-6 text-cream/75">{text.noPassword}</p>}
        <form action={pwAction} className="grid gap-8 md:grid-cols-2">
          {hasPassword && (
            <AuthField id="current" label={text.currentPw} type="password" autoComplete="current-password" required />
          )}
          <AuthField
            id="password"
            label={text.newPassword}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            hint={text.passwordHint}
          />
          <div className="flex flex-col items-start gap-3 md:col-span-2">
            <FormMessage
              error={pwState?.error && text.errors[pwState.error]}
              ok={pwState?.ok ? text.pwChanged : undefined}
            />
            <SubmitButton pending={pwPending}>{text.changePw}</SubmitButton>
          </div>
        </form>
      </Section>

      <Section title={text.data}>
        <p className="text-cream/75">{text.dataText}</p>
        <a
          href="/api/me/export"
          className="mt-4 inline-block text-sm font-semibold text-gold-soft underline decoration-gold/40 underline-offset-4"
        >
          {text.export}
        </a>
      </Section>

      <Section title={text.deleteTitle}>
        <p className="max-w-xl text-cream/75">{text.deleteText}</p>
        <form action={delAction} className="mt-6 grid max-w-md gap-6">
          {hasPassword ? (
            <AuthField id="current" label={text.currentPw} type="password" autoComplete="current-password" required />
          ) : (
            <AuthField id="current" label={text.email} type="email" placeholder={user.email} required />
          )}
          <FormMessage error={delState?.error && text.errors[delState.error]} />
          <button
            disabled={delPending}
            className="w-max rounded-full border border-[#f0a080]/60 px-6 py-3 text-sm font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink disabled:opacity-60"
          >
            {text.deleteConfirm}
          </button>
        </form>
      </Section>
    </div>
  );
}
