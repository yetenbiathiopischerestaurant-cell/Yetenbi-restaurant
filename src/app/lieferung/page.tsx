import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ONLINE_ORDERING } from "@/lib/features";
import LiveRefresh from "@/components/LiveRefresh";
import { AdminLangProvider } from "@/components/admin/AdminLang";
import StaffHeader from "@/components/StaffHeader";
import { adminText } from "@/lib/server/admin-lang";
import { requireRole } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { listDriverOrders, type Order } from "@/lib/server/orders";
import { markDelivered } from "./actions";

export const metadata: Metadata = { title: "Lieferungen | Yetenbi", robots: { index: false, follow: false } };

const euro = (sum: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(sum);
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const mapsUrl = (order: Order) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.street}, ${order.postcode} ${order.city}`)}`;

function Delivery({ order, showDriver }: { order: Order; showDriver: boolean }) {
  const pieces = order.items.reduce((sum, line) => sum + line.qty, 0);
  return (
    <li className="border border-gold bg-gold/[0.05] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-3xl text-cream">{order.reference}</p>
        <span className="text-sm text-cream/60">los {order.outAt ? time(order.outAt) : "–"}</span>
      </div>
      <p className="mt-3 text-lg text-cream">
        <strong className="font-semibold">{order.name}</strong>
      </p>
      <a
        href={mapsUrl(order)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block text-lg text-cream underline decoration-gold/50 underline-offset-4"
      >
        {order.street}, {order.postcode} {order.city}
      </a>
      {order.addressNote && <p className="mt-1 text-cream/75">{order.addressNote}</p>}
      <a
        href={`tel:${order.phone}`}
        className="mt-3 inline-block rounded-full border border-cream/30 px-4 py-1.5 text-sm font-semibold text-cream"
      >
        Anrufen: {order.phone}
      </a>
      <p className="mt-4 border-t border-gold/15 pt-4 text-cream">
        {order.payment === "cash" ? "Bar kassieren" : "Kartenzahlung an der Tür"}:{" "}
        <span className="font-display text-2xl text-gold-soft">{euro(order.total)}</span>
      </p>
      <p className="mt-1 text-sm text-cream/60">
        {pieces} {pieces === 1 ? "Gericht" : "Gerichte"}:{" "}
        {order.items.map((line) => `${line.qty}× ${line.name}`).join(", ")}
      </p>
      {order.note && <p className="mt-2 border-l-2 border-gold/50 pl-3 text-sm text-cream/80">{order.note}</p>}
      {showDriver && <p className="mt-2 text-sm text-cream/60">Fahrer: {order.driverName ?? "ohne Konto"}</p>}
      <form action={markDelivered} className="mt-5">
        <input type="hidden" name="id" value={order.id} />
        <button className="w-full rounded-full bg-[#7fcf9c] py-4 text-lg font-semibold text-ink">Zugestellt</button>
      </form>
    </li>
  );
}

async function Board() {
  await connection();
  const me = await requireRole(["driver", "owner"], "/lieferung");
  const { lang } = await adminText();
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">Keine Datenbank verbunden.</p>;
  const owner = me.role === "owner";
  const orders = await listDriverOrders(owner ? null : me.id);
  const open = orders.filter((order) => order.status === "on_the_way");
  const done = orders.filter((order) => order.status === "completed");
  const cash = done.filter((order) => order.payment === "cash").reduce((sum, order) => sum + order.total, 0);
  return (
    <>
      {/* the header's language switch needs the team area's language */}
      <AdminLangProvider lang={lang}>
        <StaffHeader title="Lieferungen" me={me} />
      </AdminLangProvider>
      <LiveRefresh seconds={20} />
      {open.length === 0 ? (
        <p className="mt-12 font-display text-2xl italic text-cream/70">
          Gerade keine Lieferungen{owner ? " unterwegs" : " für dich"}.
        </p>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {open.map((order) => (
            <Delivery key={order.id} order={order} showDriver={owner} />
          ))}
        </ul>
      )}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">Heute zugestellt ({done.length})</h2>
        <p className="mt-1 text-sm text-cream/60">Bar kassiert: {euro(cash)}</p>
        {done.length > 0 && (
          <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10 text-sm">
            {done.map((order) => (
              <li key={order.id} className="flex flex-wrap justify-between gap-3 py-3 text-cream/80">
                <span>
                  {order.reference} · {order.street}
                  {owner && order.driverName ? ` · ${order.driverName}` : ""}
                </span>
                <span className="tabular-nums">
                  {order.completedAt ? time(order.completedAt) : ""} · {euro(order.total)}{" "}
                  {order.payment === "cash" ? "bar" : "Karte"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function DeliveryPage() {
  // no deliveries while online ordering is off (src/lib/features.ts)
  if (!ONLINE_ORDERING) redirect("/");
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10 md:px-5 md:py-16">
      <Suspense fallback={<p className="mt-12 text-cream/60">Lade Lieferungen …</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
