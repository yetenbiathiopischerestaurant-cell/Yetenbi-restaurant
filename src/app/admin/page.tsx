import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import ColumnChart from "@/components/admin/ColumnChart";
import LiveRefresh from "@/components/LiveRefresh";
import { todayISO } from "@/lib/booking";
import { APP_PAYMENTS, ONLINE_ORDERING } from "@/lib/features";
import { hasAllergenData } from "@/lib/menu";
import { adminText } from "@/lib/server/admin-lang";
import { requireOwner } from "@/lib/server/auth";
import { isCloudinaryConfigured } from "@/lib/server/cloudinary";
import { getDashboard } from "@/lib/server/dashboard";
import { hasDatabase } from "@/lib/server/db";
import { isMailerConfigured } from "@/lib/server/email";
import { readMenu } from "@/lib/server/menu";
import { readBusiness } from "@/lib/server/business";
import { impressumMissing } from "@/lib/business";
import { getOrderSettings } from "@/lib/server/orders";
import { daySummary, listOpenChecks } from "@/lib/server/service";
import AdminHeader from "./AdminHeader";

function Tile({
  label,
  value,
  sub,
  href,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <div
      className={`h-full border p-5 transition-colors ${alert ? "border-gold bg-gold/[0.08]" : "border-gold/20 bg-ink/40"} ${href ? "hover:border-gold" : ""}`}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold">{label}</p>
      <p className="mt-2 font-display text-4xl tabular-nums text-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-cream/55">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

async function Overview() {
  await connection();
  const me = await requireOwner();
  const { t } = await adminText();
  const text = t.dashboard;
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
  const today = todayISO();
  const [dashboard, settings, menu, business, restaurant, openChecks] = await Promise.all([
    getDashboard(),
    getOrderSettings(),
    readMenu(),
    readBusiness(),
    daySummary(today),
    listOpenChecks(),
  ]);

  const euro = (amount: number) => new Intl.NumberFormat(t.intl, { style: "currency", currency: "EUR" }).format(amount);
  const euroShort = (amount: number) =>
    new Intl.NumberFormat(t.intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(t.intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(t.intl, {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      timeZone: "UTC",
    });

  // Online orders (delivery and pickup) only count while online ordering is switched on.
  const newOrders = ONLINE_ORDERING ? dashboard.actions.newOrders : [];
  const packed = ONLINE_ORDERING ? dashboard.actions.packed : [];
  const diff = dashboard.revenue.today - dashboard.revenue.sameDayLastWeek;
  const todo = newOrders.length + packed.length + dashboard.actions.pendingReservations.length;

  const warnings: { text: string; href: string }[] = [];
  if (ONLINE_ORDERING && settings.ignoreHours)
    warnings.push({ text: text.warnings.ignoreHours, href: "/admin/bestellungen" });
  if (ONLINE_ORDERING && settings.paused) warnings.push({ text: text.warnings.paused, href: "/admin/bestellungen" });
  if (impressumMissing(business)) warnings.push({ text: text.warnings.impressum, href: "/admin/einstellungen" });
  if (!hasAllergenData(menu))
    warnings.push({
      text: ONLINE_ORDERING ? text.warnings.allergensOrders : text.warnings.allergens,
      href: "/admin/speisekarte",
    });
  if (!isMailerConfigured()) warnings.push({ text: text.warnings.mail, href: "/admin" });
  if (!isCloudinaryConfigured()) warnings.push({ text: text.warnings.cloudinary, href: "/admin/fotos" });

  return (
    <>
      <LiveRefresh seconds={30} />
      <p className="mt-3 text-sm text-cream/60">
        {text.hello(
          me.name.split(" ")[0],
          new Date().toLocaleDateString(t.intl, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Berlin",
          }),
        )}
      </p>

      {/* What needs someone now */}
      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">
          {todo ? text.todo(todo) : text.nothingTodo}
        </h2>
        {todo > 0 && (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
            {newOrders.map((order) => (
              <li key={`o${order.id}`}>
                <Link
                  href="/admin/bestellungen"
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-gold/[0.04]"
                >
                  <span className="text-cream">
                    <span className="mr-3 rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-ink">
                      {text.newOrder}
                    </span>
                    {order.reference} · {order.name} ·{" "}
                    {order.method === "delivery" ? t.common.delivery : t.common.pickup}
                  </span>
                  <span className="text-sm tabular-nums text-cream/65">
                    {time(order.createdAt)} · {euro(order.total)}
                  </span>
                </Link>
              </li>
            ))}
            {packed.map((order) => (
              <li key={`p${order.id}`}>
                <Link
                  href="/admin/bestellungen"
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-gold/[0.04]"
                >
                  <span className="text-cream">
                    <span className="mr-3 rounded-full bg-[#7fcf9c] px-2.5 py-0.5 text-xs font-semibold text-ink">
                      {text.packed}
                    </span>
                    {order.reference} · {order.name} ·{" "}
                    {order.method === "delivery" ? text.handToDriver : text.markReady}
                  </span>
                </Link>
              </li>
            ))}
            {dashboard.actions.pendingReservations.map((reservation) => (
              <li key={`r${reservation.id}`}>
                <Link
                  href="/admin/reservierungen"
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-gold/[0.04]"
                >
                  <span className="text-cream">
                    <span className="mr-3 rounded-full border border-gold/60 px-2.5 py-0.5 text-xs font-semibold text-gold-soft">
                      {text.reservationRequest}
                    </span>
                    {reservation.name} · {t.common.persons(reservation.guests)}
                  </span>
                  <span className="text-sm text-cream/65">
                    {dayLabel(reservation.date)} · {t.common.clock(reservation.time)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Today in numbers */}
      <section className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {ONLINE_ORDERING ? (
          <>
            <Tile
              label={text.revenueToday}
              value={euroShort(dashboard.revenue.today)}
              sub={text.vsLastWeek(
                `${diff >= 0 ? "+" : "−"}${euroShort(Math.abs(diff))}`,
                euroShort(dashboard.revenue.sameDayLastWeek),
              )}
              href="/admin/berichte"
            />
            <Tile
              label={text.ordersToday}
              value={String(dashboard.orders.today)}
              sub={text.ordersSub(dashboard.orders.open, dashboard.orders.onTheWay)}
              href="/admin/bestellungen"
              alert={dashboard.orders.new > 0}
            />
          </>
        ) : (
          <>
            <Tile
              label={APP_PAYMENTS ? text.restaurantToday : text.tablesToday}
              value={APP_PAYMENTS ? euroShort(restaurant.total) : String(restaurant.closed + restaurant.paid)}
              sub={
                APP_PAYMENTS
                  ? text.restaurantSub(restaurant.paid, restaurant.guests)
                  : text.tablesTodaySub(restaurant.guests, euroShort(restaurant.orderValue))
              }
              href="/admin/service"
            />
            <Tile
              label={text.openTables}
              value={String(openChecks.length)}
              sub={text.openTablesSub}
              href="/admin/service"
            />
          </>
        )}
        <Tile
          label={text.guestsToday}
          value={String(dashboard.reservations.todayGuests)}
          sub={text.tables(dashboard.reservations.todayCount)}
          href="/admin/reservierungen"
        />
        <Tile
          label={text.openRequests}
          value={String(dashboard.reservations.pending)}
          sub={text.fromToday}
          href="/admin/reservierungen"
          alert={dashboard.reservations.pending > 0}
        />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        {ONLINE_ORDERING && (
          <section className="lg:col-span-3">
            <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">{text.revenue14}</h2>
            <ColumnChart
              title={text.chartTitle}
              data={dashboard.revenue.last14.map((day) => ({
                key: day.day,
                label: dayLabel(day.day),
                value: day.total,
                detail: text.orders(day.orders),
              }))}
              unit="euro"
              labelEvery={3}
            />
          </section>
        )}
        <section className={ONLINE_ORDERING ? "lg:col-span-2" : "lg:col-span-3"}>
          <h2 className="mb-4 font-display text-2xl font-semibold text-gold-soft">{text.bookingsToday}</h2>
          {dashboard.todaysBookings.length === 0 ? (
            <p className="text-cream/55">{text.noBookingsToday}</p>
          ) : (
            <ul className="divide-y divide-gold/10 border-y border-gold/10 text-sm">
              {dashboard.todaysBookings.map((booking) => (
                <li key={booking.id} className="flex justify-between gap-3 py-2">
                  <span className="text-cream">
                    <span className="mr-3 tabular-nums text-gold-soft">{booking.time}</span>
                    {booking.name}
                    {booking.status === "pending" && (
                      <span className="ml-2 text-xs text-[#f0a080]">{text.unconfirmed}</span>
                    )}
                  </span>
                  <span className="text-cream/60">{t.common.personsShort(booking.guests)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {warnings.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-gold-soft">{text.notes}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {warnings.map((warning) => (
              <li key={warning.text}>
                <Link href={warning.href} className="flex gap-2 text-[#f0a080] hover:underline">
                  <span aria-hidden>!</span>
                  {warning.text}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default async function AdminHome() {
  const { t } = await adminText();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="dashboard" />
      <Suspense fallback={<p className="mt-12 text-cream/60">{t.common.loading}</p>}>
        <Overview />
      </Suspense>
    </main>
  );
}
