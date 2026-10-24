import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ONLINE_ORDERING } from "@/lib/features";
import { adminText } from "@/lib/server/admin-lang";
import { requireOwner } from "@/lib/server/auth";
import { encodeKey, listCustomers } from "@/lib/server/customers";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../AdminHeader";

type Params = Promise<Record<string, string | string[] | undefined>>;

const euro = (n: number, intl: string) => new Intl.NumberFormat(intl, { style: "currency", currency: "EUR" }).format(n);
const day = (iso: string, intl: string) =>
  new Date(iso).toLocaleDateString(intl, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Berlin",
  });

async function List({ searchParams }: { searchParams: Params }) {
  await connection();
  await requireOwner();
  const { t } = await adminText();
  const text = t.customers;
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const all = await listCustomers(search);
  const shown = all.slice(0, 200);

  return (
    <>
      <form action="/admin/kunden" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-cream/60">
          {text.searchLabel}
          <input
            name="q"
            defaultValue={search}
            placeholder={text.searchPlaceholder}
            className="w-72 border-0 border-b border-gold/30 bg-transparent pb-1 text-base text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none"
          />
        </label>
        <button className="rounded-full border border-cream/25 px-4 py-1.5 text-sm text-cream hover:border-gold">
          {text.search}
        </button>
        {search && (
          <Link href="/admin/kunden" className="text-sm text-cream/55 underline underline-offset-4">
            {text.showAll}
          </Link>
        )}
      </form>
      <p className="mt-4 text-xs text-cream/50">
        {text.count(all.length)}
        {all.length > shown.length && text.lastShown(shown.length)} ·{" "}
        {ONLINE_ORDERING ? text.retention : text.retentionNoOrders}
      </p>

      {shown.length === 0 ? (
        <p className="mt-8 font-display text-xl italic text-cream/60">{text.noneFound}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className={`w-full text-sm ${ONLINE_ORDERING ? "min-w-[720px]" : "min-w-[560px]"}`}>
            <thead>
              <tr className="border-b border-gold/30 text-left text-[0.62rem] uppercase tracking-[0.22em] text-gold">
                <th className="py-2 pr-4 font-semibold">{text.columns.guest}</th>
                <th className="py-2 pr-4 font-semibold">{text.columns.contact}</th>
                {ONLINE_ORDERING && (
                  <>
                    <th className="py-2 pr-4 text-right font-semibold">{text.columns.orders}</th>
                    <th className="py-2 pr-4 text-right font-semibold">{text.columns.revenue}</th>
                  </>
                )}
                <th className="py-2 pr-4 text-right font-semibold">{text.columns.reservations}</th>
                <th className="py-2 text-right font-semibold">{text.columns.last}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((customer) => (
                <tr key={customer.key} className="border-b border-cream/[0.07] hover:bg-gold/[0.04]">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/admin/kunden/${encodeKey(customer.key)}`}
                      className="font-semibold text-cream underline decoration-gold/30 underline-offset-4 hover:decoration-gold"
                    >
                      {customer.name || text.noName}
                    </Link>
                    <span className="ml-2 inline-flex gap-1.5 align-middle">
                      {customer.hasAccount && (
                        <span className="rounded-full border border-cream/20 px-2 text-[0.65rem] text-cream/60">
                          {text.account}
                        </span>
                      )}
                      {ONLINE_ORDERING && customer.blocked && (
                        <span className="rounded-full border border-[#f0a080]/70 px-2 text-[0.65rem] text-[#f0a080]">
                          {text.blocked}
                        </span>
                      )}
                      {ONLINE_ORDERING && customer.rejected > 0 && (
                        <span className="rounded-full border border-[#f0a080]/40 px-2 text-[0.65rem] text-[#f0a080]/90">
                          {text.rejected(customer.rejected)}
                        </span>
                      )}
                      {customer.note && (
                        <span className="rounded-full border border-gold/40 px-2 text-[0.65rem] text-gold-soft">
                          {text.note}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-cream/65">
                    {customer.email || "–"}
                    {customer.phone && <span className="block text-xs text-cream/45">{customer.phone}</span>}
                  </td>
                  {ONLINE_ORDERING && (
                    <>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-cream">{customer.completed}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-cream">
                        {customer.revenue ? euro(customer.revenue, t.intl) : "–"}
                      </td>
                    </>
                  )}
                  <td className="py-2.5 pr-4 text-right tabular-nums text-cream">{customer.bookings.length || "–"}</td>
                  <td className="py-2.5 text-right tabular-nums text-cream/60">{day(customer.lastSeen, t.intl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default async function CustomersPage({ searchParams }: { searchParams: Params }) {
  const { t } = await adminText();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="customers" />
      <Suspense fallback={<p className="mt-12 text-cream/60">{t.common.loading}</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
