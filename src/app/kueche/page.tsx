import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import LiveRefresh from "@/components/LiveRefresh";
import { AdminLangProvider } from "@/components/admin/AdminLang";
import LiveAlerts from "@/components/admin/LiveAlerts";
import StaffHeader from "@/components/StaffHeader";
import type { AdminDict, AdminLang } from "@/lib/admin-i18n";
import { ONLINE_ORDERING } from "@/lib/features";
import type { Menu } from "@/lib/menu";
import { adminText } from "@/lib/server/admin-lang";
import { requireRole } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { readMenu } from "@/lib/server/menu";
import { listKitchenOrders, type Order } from "@/lib/server/orders";
import { listKitchenTickets, type KitchenTicket } from "@/lib/server/service";
import { kitchenSoldOut, kitchenStep, tableReady } from "./actions";

export const metadata: Metadata = { title: "Küche | Yetenbi", robots: { index: false, follow: false } };

const time = (iso: string, intl: string) =>
  new Date(iso).toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** The time the food should be done: accepted + the minutes the team promised, or the guest's chosen time. */
function dueBy(order: Order, t: AdminDict) {
  if (order.wanted !== "asap") return t.kitchen.dueAt(order.wanted, order.method === "delivery");
  if (order.acceptedAt && order.etaMinutes)
    return t.kitchen.doneBy(
      time(new Date(new Date(order.acceptedAt).getTime() + order.etaMinutes * 60_000).toISOString(), t.intl),
    );
  return t.kitchen.asap;
}

/** An online order (only while online ordering is on). Only the food: no prices, no guest details. */
function Ticket({ order, t }: { order: Order; t: AdminDict }) {
  const text = t.kitchen;
  const next =
    order.status === "accepted"
      ? { status: "cooked", label: text.cooked }
      : order.status === "cooked"
        ? { status: "packed", label: text.packed }
        : null;
  return (
    <li
      className={`flex flex-col border p-5 ${order.status === "packed" ? "border-cream/15 opacity-60" : order.status === "cooked" ? "border-[#7fcf9c]/60 bg-[#7fcf9c]/[0.05]" : "border-gold bg-gold/[0.05]"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl text-cream">{order.reference}</p>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          {order.method === "delivery" ? t.common.delivery : t.common.pickup}
        </span>
      </div>
      <p className="mt-1 text-sm text-cream/65">
        {text.received(time(order.createdAt, t.intl))} · {dueBy(order, t)}
      </p>
      <ul className="mt-4 space-y-2 border-t border-gold/15 pt-4">
        {order.items.map((line) => (
          <li key={line.id} className="flex gap-3 text-lg text-cream">
            <span className="w-10 shrink-0 font-display text-2xl leading-none text-gold-soft tabular-nums">
              {line.qty}×
            </span>
            <span>{line.name}</span>
          </li>
        ))}
      </ul>
      {order.note && (
        <p className="mt-4 border-l-2 border-[#f0a080] pl-3 text-base text-cream">
          {text.guestNote} {order.note}
        </p>
      )}
      {next ? (
        <form action={kitchenStep} className="mt-auto pt-6">
          <input type="hidden" name="id" value={order.id} />
          <input type="hidden" name="from" value={order.status} />
          <button
            name="status"
            value={next.status}
            className={`w-full rounded-full py-4 text-lg font-semibold text-ink ${next.status === "cooked" ? "bg-gold" : "bg-[#7fcf9c]"}`}
          >
            {next.label}
          </button>
        </form>
      ) : (
        <p className="mt-auto pt-6 text-sm text-cream/60">
          {text.packedAt(order.packedAt ? time(order.packedAt, t.intl) : "–")}
        </p>
      )}
    </li>
  );
}

const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));

/*
  A round from the service app: table, waiter, the dishes with the guest's wishes and seat. Dishes the waiter marked
  "later" show greyed out until called, so the kitchen can plan them.
*/
function TableTicket({ ticket, t, lang }: { ticket: KitchenTicket; t: AdminDict; lang: AdminLang }) {
  const text = t.kitchen;
  const done = ticket.readyAt !== null;
  const waiting = minutesSince(ticket.sentAt);
  return (
    <li
      className={`flex flex-col border p-5 ${ticket.held ? "border-dashed border-cream/25" : done ? "border-cream/15 opacity-60" : waiting >= 20 ? "border-[#f0a080] bg-[#f0a080]/[0.06]" : "border-gold bg-gold/[0.05]"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className={`font-display text-3xl ${ticket.held ? "text-cream/60" : "text-cream"}`}>
          {text.table(ticket.table)}
        </p>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          {ticket.held ? text.later : text.course(ticket.round)}
        </span>
      </div>
      <p className="mt-1 text-sm text-cream/65">
        {time(ticket.sentAt, t.intl)} · {ticket.waiter || text.service} ·{" "}
        {ticket.held ? text.notYet : done ? text.readyAt(time(ticket.readyAt!, t.intl)) : text.since(waiting)}
      </p>
      <ul className={`mt-4 space-y-2 border-t border-gold/15 pt-4 ${ticket.held ? "opacity-60" : ""}`}>
        {ticket.items.map((line) => (
          <li key={line.id} className="text-lg text-cream">
            <div className="flex gap-3">
              <span className="w-10 shrink-0 font-display text-2xl leading-none text-gold-soft tabular-nums">
                {line.qty}×
              </span>
              <span className="flex-1">{line.name[lang] || line.name.de}</span>
              {line.seat !== null && (
                <span className="self-center rounded-full border border-cream/25 px-2 text-xs text-cream/70">
                  P{line.seat}
                </span>
              )}
            </div>
            {line.note && <p className="ml-[3.25rem] text-base text-[#f0a080]">→ {line.note}</p>}
          </li>
        ))}
      </ul>
      {ticket.held ? (
        <p className="mt-auto pt-6 text-sm text-cream/60">{text.waits}</p>
      ) : done ? (
        <p className="mt-auto pt-6 text-sm text-cream/60">{text.atPass}</p>
      ) : (
        <form action={tableReady} className="mt-auto pt-6">
          <input type="hidden" name="check" value={ticket.checkId} />
          <input type="hidden" name="round" value={ticket.round} />
          <button className="w-full rounded-full bg-gold py-4 text-lg font-semibold text-ink">{text.ready}</button>
        </form>
      )}
    </li>
  );
}

function TableTickets({ tickets, t, lang }: { tickets: KitchenTicket[]; t: AdminDict; lang: AdminLang }) {
  const text = t.kitchen;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold text-gold-soft">
        {text.tables}{" "}
        <span className="text-cream/50">({tickets.filter((ticket) => !ticket.readyAt && !ticket.held).length})</span>
      </h2>
      <p className="mt-1 text-sm text-cream/55">{text.tablesLead}</p>
      {tickets.length === 0 ? (
        <p className="mt-6 font-display text-xl italic text-cream/50">{text.noTables}</p>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <TableTicket key={`${ticket.checkId}-${ticket.round}-${ticket.held}`} ticket={ticket} t={t} lang={lang} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* "Sold out": one tap greys a dish out on the website and in the waiters' app (within seconds). */
function SoldOut({ menu, t, lang }: { menu: Menu; t: AdminDict; lang: AdminLang }) {
  const text = t.kitchen;
  const out = menu.flatMap((category) => category.items).filter((dish) => !dish.available);
  return (
    <details className="mt-10 border border-gold/20 bg-ink/40 p-5" open={out.length > 0}>
      <summary className="cursor-pointer font-display text-2xl font-semibold text-gold-soft">
        {text.soldOut} <span className="text-cream/50">({out.length})</span>
      </summary>
      <p className="mt-1 text-sm text-cream/55">{text.soldOutLead}</p>
      {menu
        .filter((category) => category.items.length > 0)
        .map((category) => (
          <div key={category.id} className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/55">{category.title[lang]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {category.items.map((dish) => (
                <form key={dish.id} action={kitchenSoldOut}>
                  <input type="hidden" name="dish" value={dish.id} />
                  <input type="hidden" name="available" value={dish.available ? "0" : "1"} />
                  <button
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${dish.available ? "border-cream/25 text-cream hover:border-gold" : "border-[#f0a080] bg-[#f0a080] text-ink"}`}
                    aria-pressed={!dish.available}
                  >
                    {dish.name[lang]}
                    {!dish.available && text.out}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
    </details>
  );
}

function Column({ title, hint, orders, t }: { title: string; hint: string; orders: Order[]; t: AdminDict }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-gold-soft">
        {title} <span className="text-cream/50">({orders.length})</span>
      </h2>
      <p className="mt-1 text-sm text-cream/55">{hint}</p>
      {orders.length === 0 ? (
        <p className="mt-6 font-display text-xl italic text-cream/50">{t.kitchen.nothing}</p>
      ) : (
        <ul className="mt-5 grid gap-4">
          {orders.map((order) => (
            <Ticket key={order.id} order={order} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

async function Board() {
  await connection();
  const me = await requireRole(["kitchen", "owner"], "/kueche");
  const { t, lang } = await adminText();
  const text = t.kitchen;
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
  // Online orders (cook, pack, packed) only while online ordering is on; otherwise just tables and sold out.
  const [orders, tickets, menu] = await Promise.all([
    ONLINE_ORDERING ? listKitchenOrders() : Promise.resolve([]),
    listKitchenTickets(),
    readMenu(),
  ]);
  return (
    <AdminLangProvider lang={lang}>
      <StaffHeader title={text.title} me={me} />
      <LiveRefresh seconds={15} />
      <LiveAlerts mode="kitchen" />
      <TableTickets tickets={tickets} t={t} lang={lang} />
      <SoldOut menu={menu} t={t} lang={lang} />
      {ONLINE_ORDERING && (
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <Column
            title={text.cook}
            hint={text.cookHint}
            orders={orders.filter((order) => order.status === "accepted")}
            t={t}
          />
          <Column
            title={text.pack}
            hint={text.packHint}
            orders={orders.filter((order) => order.status === "cooked")}
            t={t}
          />
          <Column
            title={text.packedColumn}
            hint={text.packedHint}
            orders={orders.filter((order) => order.status === "packed")}
            t={t}
          />
        </div>
      )}
    </AdminLangProvider>
  );
}

export default function KitchenPage() {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-16">
      {/* The fallback is outside Suspense and cannot read the language cookie, so it stays neutral. */}
      <Suspense fallback={<p className="mt-12 text-cream/60">…</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
