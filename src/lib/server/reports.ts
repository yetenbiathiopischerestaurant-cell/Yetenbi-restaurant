import "server-only";
import type { Menu } from "@/lib/menu";
import { db } from "./db";

/*
  Reports over a date range (Berlin calendar days, both ends included). Revenue counts completed orders only,
  as paid at the door: food and drinks + deposit + delivery fee.
*/

type Row = Record<string, unknown>;

type Range = { from: string; to: string };

type Report = {
  orders: {
    completed: number;
    revenue: number;
    average: number;
    deposit: number;
    fees: number;
    rejected: number;
    cancelled: number;
    all: number;
  };
  byMethod: { method: string; count: number; revenue: number }[];
  byPayment: { payment: string; count: number; revenue: number }[];
  perDay: { day: string; revenue: number; orders: number }[];
  perHour: { hour: number; orders: number }[];
  topDishes: { id: string; name: string; qty: number; revenue: number }[];
  reservations: {
    confirmed: number;
    guests: number;
    declined: number;
    cancelled: number;
    website: number;
    phone: number;
  };
};

/** SQL condition: the timestamp column falls on a Berlin calendar day between $1 and $2. */
const inRange = (column: string) => `(${column} at time zone 'Europe/Berlin')::date between $1::date and $2::date`;

export async function getReport({ from, to }: Range): Promise<Report> {
  const query = (sql: string) => db().query(sql, [from, to]) as Promise<Row[]>;
  const [orderTotals, methodRows, paymentRows, dayRows, hourRows, dishRows, reservationRows] = await Promise.all([
    query(`select
         count(*) filter (where status = 'completed')::int as completed,
         coalesce(sum(total) filter (where status = 'completed'), 0)::float as revenue,
         coalesce(sum(deposit) filter (where status = 'completed'), 0)::float as deposit,
         coalesce(sum(delivery_fee) filter (where status = 'completed'), 0)::float as fees,
         count(*) filter (where status = 'rejected')::int as rejected,
         count(*) filter (where status = 'cancelled')::int as cancelled,
         count(*)::int as all
       from orders where ${inRange("created_at")}`),
    query(`select method, count(*)::int as count, coalesce(sum(total), 0)::float as revenue
       from orders where status = 'completed' and ${inRange("created_at")} group by method order by method`),
    query(`select payment, count(*)::int as count, coalesce(sum(total), 0)::float as revenue
       from orders where status = 'completed' and ${inRange("created_at")} group by payment order by payment`),
    query(`select d::date::text as day,
         coalesce(sum(o.total) filter (where o.status = 'completed'), 0)::float as revenue,
         count(o.id) filter (where o.status = 'completed')::int as orders
       from generate_series($1::date, $2::date, interval '1 day') d
       left join orders o on (o.created_at at time zone 'Europe/Berlin')::date = d::date
       group by d order by d`),
    query(`select extract(hour from created_at at time zone 'Europe/Berlin')::int as hour, count(*)::int as orders
       from orders where status = 'completed' and ${inRange("created_at")} group by 1 order by 1`),
    query(`select l->>'id' as id, max(l->>'name') as name, sum((l->>'qty')::int)::int as qty,
         sum((l->>'qty')::int * (l->>'unit')::numeric)::float as revenue
       from orders, jsonb_array_elements(items) l
       where status = 'completed' and ${inRange("created_at")}
       group by l->>'id' order by qty desc, revenue desc limit 12`),
    db().query(
      `select
         count(*) filter (where status = 'confirmed')::int as confirmed,
         coalesce(sum(guests) filter (where status = 'confirmed'), 0)::int as guests,
         count(*) filter (where status = 'declined')::int as declined,
         count(*) filter (where status = 'cancelled')::int as cancelled,
         count(*) filter (where source = 'website')::int as website,
         count(*) filter (where source = 'phone')::int as phone
       from reservations where date between $1::date and $2::date`,
      [from, to],
    ) as Promise<Row[]>,
  ]);
  const totals = orderTotals[0];
  const reservations = reservationRows[0];
  const completed = Number(totals.completed);
  const revenue = Number(totals.revenue);
  return {
    orders: {
      completed,
      revenue,
      average: completed ? revenue / completed : 0,
      deposit: Number(totals.deposit),
      fees: Number(totals.fees),
      rejected: Number(totals.rejected),
      cancelled: Number(totals.cancelled),
      all: Number(totals.all),
    },
    byMethod: methodRows.map((row) => ({
      method: String(row.method),
      count: Number(row.count),
      revenue: Number(row.revenue),
    })),
    byPayment: paymentRows.map((row) => ({
      payment: String(row.payment),
      count: Number(row.count),
      revenue: Number(row.revenue),
    })),
    perDay: dayRows.map((row) => ({ day: String(row.day), revenue: Number(row.revenue), orders: Number(row.orders) })),
    perHour: hourRows.map((row) => ({ hour: Number(row.hour), orders: Number(row.orders) })),
    topDishes: dishRows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      qty: Number(row.qty),
      revenue: Number(row.revenue),
    })),
    reservations: {
      confirmed: Number(reservations.confirmed),
      guests: Number(reservations.guests),
      declined: Number(reservations.declined),
      cancelled: Number(reservations.cancelled),
      website: Number(reservations.website),
      phone: Number(reservations.phone),
    },
  };
}

/* ---------- CSV for the accountant (no names, addresses or contact details) ---------- */

/**
  Amounts with a decimal comma; text quoted when it contains a separator, quote or line break. Text starting with
  = + - @ or a tab gets a leading apostrophe, so Excel shows it instead of running it as a formula (CSV injection).
*/
export function csvCell(value: string | number) {
  let text = typeof value === "number" ? value.toFixed(2).replace(".", ",") : value;
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
/** Semicolons and a byte-order mark, so German Excel opens it with the right columns and umlauts. */
const toCsv = (rows: (string | number)[][]) =>
  "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";

const STATUS_DE: Record<string, string> = {
  new: "neu",
  accepted: "angenommen",
  cooked: "zubereitet",
  packed: "verpackt",
  ready: "abholbereit",
  on_the_way: "unterwegs",
  completed: "abgeschlossen",
  rejected: "abgelehnt",
  cancelled: "storniert",
};

export async function ordersCsv({ from, to }: Range, menu: Menu) {
  // Food and drinks are taxed differently (7 % / 19 %), so the accountant needs them apart.
  const drinkIds = new Set(
    menu.filter((category) => category.drinks).flatMap((category) => category.items.map((dish) => dish.id)),
  );
  const rows = (await db().query(
    `select reference, status, method, payment, items, deposit, delivery_fee, total,
       to_char(created_at at time zone 'Europe/Berlin', 'DD.MM.YYYY') as day,
       to_char(created_at at time zone 'Europe/Berlin', 'HH24:MI') as time
     from orders where ${inRange("created_at")} order by created_at`,
    [from, to],
  )) as Row[];
  const head = [
    "Datum",
    "Uhrzeit",
    "Nummer",
    "Status",
    "Art",
    "Zahlung",
    "Speisen (7 %)",
    "Getränke (19 %)",
    "Pfand",
    "Liefergebühr",
    "Summe",
  ];
  const body = rows.map((order) => {
    const lines = order.items as { id: string; qty: number; unit: number }[];
    const amount = (line: { qty: number; unit: number }) => line.qty * line.unit;
    const food = lines.filter((line) => !drinkIds.has(line.id)).reduce((sum, line) => sum + amount(line), 0);
    const drinks = lines.filter((line) => drinkIds.has(line.id)).reduce((sum, line) => sum + amount(line), 0);
    return [
      String(order.day),
      String(order.time),
      String(order.reference),
      STATUS_DE[String(order.status)] ?? String(order.status),
      order.method === "delivery" ? "Lieferung" : "Abholung",
      order.payment === "cash" ? "bar" : "Karte",
      food,
      drinks,
      Number(order.deposit),
      Number(order.delivery_fee),
      Number(order.total),
    ];
  });
  return toCsv([head, ...body]);
}

export async function reservationsCsv({ from, to }: Range) {
  const rows = (await db().query(
    `select reference, to_char(date, 'DD.MM.YYYY') as day, time, guests, status, source
     from reservations where date between $1::date and $2::date order by date, time`,
    [from, to],
  )) as Row[];
  const status: Record<string, string> = {
    pending: "offen",
    confirmed: "bestätigt",
    declined: "abgelehnt",
    cancelled: "storniert",
  };
  return toCsv([
    ["Datum", "Uhrzeit", "Personen", "Status", "Quelle", "Nummer"],
    ...rows.map((reservation) => [
      String(reservation.day),
      String(reservation.time),
      String(reservation.guests),
      status[String(reservation.status)] ?? String(reservation.status),
      reservation.source === "phone" ? "Telefon" : "Website",
      String(reservation.reference),
    ]),
  ]);
}
