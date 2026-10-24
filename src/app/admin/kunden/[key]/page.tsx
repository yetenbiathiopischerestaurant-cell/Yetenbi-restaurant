import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ONLINE_ORDERING } from "@/lib/features";
import { adminText } from "@/lib/server/admin-lang";
import { requireOwner } from "@/lib/server/auth";
import { decodeKey, encodeKey, getCustomer } from "@/lib/server/customers";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../../AdminHeader";
import { blockCustomer } from "../actions";
import NoteForm from "../NoteForm";

const euro = (n: number, intl: string) => new Intl.NumberFormat(intl, { style: "currency", currency: "EUR" }).format(n);
const when = (iso: string, intl: string) =>
  new Date(iso).toLocaleString(intl, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
const date = (iso: string, intl: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(intl, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "UTC",
  });

async function Detail({ params }: { params: Promise<{ key: string }> }) {
  await connection();
  await requireOwner();
  const { t } = await adminText();
  const text = t.customers;
  const intl = t.intl;
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
  const key = decodeKey((await params).key);
  const customer = key ? await getCustomer(key) : null;
  if (!customer) notFound();

  const stat = "text-[0.62rem] uppercase tracking-[0.22em] text-gold";
  const reservations = (
    <section>
      <h3 className="font-display text-xl font-semibold text-gold-soft">{text.reservations}</h3>
      {customer.bookings.length === 0 ? (
        <p className="mt-3 text-sm text-cream/55">{t.common.none}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gold/10 border-y border-gold/10 text-sm">
          {customer.bookings.map((booking) => (
            <li key={booking.reference} className="flex flex-wrap justify-between gap-3 py-2">
              <span className="text-cream">
                {date(booking.date, intl)} · {t.common.clock(booking.time)} · {t.common.personsShort(booking.guests)}
              </span>
              <span className="text-cream/65">
                {text.bookingStatus[booking.status] ?? booking.status}
                {booking.source === "phone" && text.byPhone}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <Link
        href="/admin/kunden"
        className="mt-6 inline-block text-sm text-cream/60 underline underline-offset-4 hover:text-cream"
      >
        {text.back}
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h2 className="font-display text-3xl font-semibold text-cream">{customer.name || text.noName}</h2>
          <p className="mt-1 text-cream/70">
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="underline decoration-gold/40 underline-offset-4">
                {customer.email}
              </a>
            )}
            {customer.email && customer.phone && " · "}
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="underline decoration-gold/40 underline-offset-4">
                {customer.phone}
              </a>
            )}
          </p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-cream/20 px-2.5 py-0.5 text-cream/65">
              {customer.hasAccount ? text.withAccount : text.withoutAccount}
            </span>
            {ONLINE_ORDERING && customer.blocked && (
              <span className="rounded-full border border-[#f0a080]/70 px-2.5 py-0.5 text-[#f0a080]">
                {text.blockedOnline}
              </span>
            )}
          </p>
        </div>
        <dl className={`grid gap-6 text-right ${ONLINE_ORDERING ? "grid-cols-3" : "grid-cols-1"}`}>
          {ONLINE_ORDERING && (
            <>
              <div>
                <dt className={stat}>{text.orders}</dt>
                <dd className="font-display text-3xl tabular-nums text-cream">{customer.completed}</dd>
              </div>
              <div>
                <dt className={stat}>{text.revenue}</dt>
                <dd className="font-display text-3xl tabular-nums text-cream">{euro(customer.revenue, intl)}</dd>
              </div>
            </>
          )}
          <div>
            <dt className={stat}>{text.reservations}</dt>
            <dd className="font-display text-3xl tabular-nums text-cream">{customer.bookings.length}</dd>
          </div>
        </dl>
      </div>

      {ONLINE_ORDERING ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <section>
            <h3 className="font-display text-xl font-semibold text-gold-soft">{text.orders}</h3>
            {customer.orders.length === 0 ? (
              <p className="mt-3 text-sm text-cream/55">{t.common.none}</p>
            ) : (
              <ul className="mt-3 divide-y divide-gold/10 border-y border-gold/10 text-sm">
                {customer.orders.map((order) => (
                  <li key={order.reference} className="flex flex-wrap justify-between gap-3 py-2">
                    <span className="text-cream">
                      {order.reference}{" "}
                      <span className="text-cream/50">
                        · {order.method === "delivery" ? t.common.delivery : t.common.pickup}
                      </span>
                    </span>
                    <span className="tabular-nums text-cream/65">
                      {when(order.createdAt, intl)} · {text.orderStatus[order.status] ?? order.status} ·{" "}
                      {euro(order.total, intl)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {reservations}
        </div>
      ) : (
        <div className="mt-10 max-w-2xl">{reservations}</div>
      )}

      <section className="mt-10 max-w-2xl">
        <h3 className="font-display text-xl font-semibold text-gold-soft">{text.teamNote}</h3>
        <div className="mt-3">
          <NoteForm customer={encodeKey(customer.key)} note={customer.note} />
        </div>
      </section>

      {ONLINE_ORDERING && customer.phone && !customer.blocked && (
        <form action={blockCustomer} className="mt-8">
          <input type="hidden" name="key" value={encodeKey(customer.key)} />
          <button className="rounded-full border border-[#f0a080]/70 px-4 py-1.5 text-xs font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink">
            {text.blockPhone}
          </button>
        </form>
      )}
    </>
  );
}

export default async function CustomerPage({ params }: { params: Promise<{ key: string }> }) {
  const { t } = await adminText();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="customers" />
      <Suspense fallback={<p className="mt-12 text-cream/60">{t.common.loading}</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
