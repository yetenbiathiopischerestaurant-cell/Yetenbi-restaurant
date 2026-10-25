import "server-only";
import { randomBytes } from "node:crypto";
import type { L } from "@/lib/data";
import {
  checkDue,
  checkTotal,
  CLIENT_KEY,
  parseSplit,
  validatePayment,
  type Check,
  type CheckItem,
  type CheckPayment,
  type DiningTable,
  type RoundLine,
} from "@/lib/service";
import { ApiError, type AppUser } from "./app-auth";
import { audit } from "./audit";
import { APP_PAYMENTS } from "@/lib/features";
import { db } from "./db";
import { readMenu } from "./menu";

/*
  Table service in Neon (dining_tables, table_checks, table_check_items, table_check_payments): what the waiters' app
  and the kitchen screen read and change. Every change re-reads the check, so the app always gets the whole current
  state back.
*/

type Row = Record<string, unknown>;
type Actor = Pick<AppUser, "id" | "name" | "role">;

const iso = (value: unknown) => (value == null ? null : new Date(String(value)).toISOString());
const cents = (euros: number) => Math.round(euros * 100);

const toItem = (row: Row): CheckItem => ({
  id: Number(row.id),
  round: Number(row.round),
  itemId: String(row.item_id),
  name: row.name as L,
  unit: Number(row.unit),
  qty: Number(row.qty),
  note: String(row.note ?? ""),
  kitchen: Boolean(row.kitchen),
  status: row.status as CheckItem["status"],
  voidReason: String(row.void_reason ?? ""),
  addedBy: String(row.added_by_name ?? ""),
  createdAt: iso(row.created_at)!,
  readyAt: iso(row.ready_at),
  servedAt: iso(row.served_at),
  seat: row.seat == null ? null : Number(row.seat),
  paymentId: row.payment_id == null ? null : Number(row.payment_id),
});

const toPayment = (row: Row): CheckPayment => ({
  id: Number(row.id),
  method: row.method as CheckPayment["method"],
  amount: Number(row.amount),
  tip: Number(row.tip ?? 0),
  given: row.given == null ? null : Number(row.given),
  label: String(row.label ?? ""),
  by: String(row.by_name ?? ""),
  createdAt: iso(row.created_at)!,
});

const toCheck = (row: Row, items: CheckItem[], payments: CheckPayment[]): Check => ({
  id: Number(row.id),
  number: Number(row.number),
  tableId: String(row.table_id),
  tableLabel: String(row.table_label),
  guests: Number(row.guests),
  note: String(row.note ?? ""),
  status: row.status as Check["status"],
  openedBy: String(row.opened_by_name ?? ""),
  openedAt: iso(row.opened_at)!,
  closedAt: iso(row.closed_at),
  closedBy: String(row.closed_by_name ?? ""),
  payment: (row.payment as Check["payment"]) ?? null,
  total: row.status === "open" ? checkTotal(items) : Number(row.total),
  tip: row.status === "open" ? payments.reduce((sum, p) => sum + cents(p.tip), 0) / 100 : Number(row.tip ?? 0),
  given: row.given == null ? null : Number(row.given),
  items,
  payments,
  due: row.status === "open" ? checkDue(items, payments) : 0,
  receiptToken: row.receipt_token == null ? null : String(row.receipt_token),
});

async function withItems(rows: Row[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => Number(row.id));
  const [itemRows, paymentRows] = (await Promise.all([
    db()`select * from table_check_items where check_id = any(${ids}::bigint[]) order by round, id`,
    db()`select * from table_check_payments where check_id = any(${ids}::bigint[]) order by id`,
  ])) as [Row[], Row[]];
  return rows.map((row) => {
    const id = Number(row.id);
    return toCheck(
      row,
      itemRows.filter((item) => Number(item.check_id) === id).map(toItem),
      paymentRows.filter((payment) => Number(payment.check_id) === id).map(toPayment),
    );
  });
}

/* ---------- tables ---------- */

export async function listTables(): Promise<DiningTable[]> {
  const rows = (await db()`select * from dining_tables where active order by position, id`) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    label: String(row.label),
    area: String(row.area),
    seats: Number(row.seats),
  }));
}

/**
  Replaces the table plan from the admin form. Tables keep their id when their label stays, so open checks stay put;
  tables no longer listed are switched off (old checks keep them), never deleted.
*/
export async function saveTables(user: Actor, plan: { label: string; area: string; seats: number }[]) {
  const sql = db();
  const existing = (await sql`select id, label, area from dining_tables`) as Row[];
  const key = (label: string) => label.toLowerCase();
  const byKey = new Map(existing.map((row) => [key(String(row.label)), String(row.id)]));
  const keep: string[] = [];
  for (const [position, table] of plan.entries()) {
    const id = byKey.get(key(table.label)) ?? `x${Date.now().toString(36)}${position}`;
    keep.push(id);
    await sql`
      insert into dining_tables (id, label, area, seats, position, active)
      values (${id}, ${table.label}, ${table.area}, ${table.seats}, ${position}, true)
      on conflict (id) do update set label = excluded.label, area = excluded.area, seats = excluded.seats,
                                     position = excluded.position, active = true
    `;
  }
  await sql`update dining_tables set active = false where not (id = any(${keep}::text[]))`;
  await audit(user, "service", "Tischplan geändert", `${plan.length} Tische`);
}

/**
  Changes when the menu or the table plan last changed. The app compares it on every refresh and reloads the menu
  at once when it differs, so a dish the kitchen marks sold out is greyed out on every phone within seconds.
*/
export async function menuStamp() {
  const [row] = (await db()`
    select md5(
      coalesce((select max(updated_at)::text from menu_items), '') ||
      coalesce((select count(*)::text from menu_items), '') ||
      coalesce((select string_agg(id || label || area || seats || position, ',' order by id) from dining_tables where active), '')
    ) as stamp
  `) as Row[];
  return String(row.stamp);
}

/** The dishes ordered most at the tables in the last 30 days (ids, most first), for the top of the app's menu. */
export async function popularDishes(limit = 12) {
  const rows = (await db()`
    select item_id from table_check_items
    where status <> 'void' and created_at > now() - interval '30 days'
    group by item_id order by sum(qty) desc limit ${limit}
  `) as Row[];
  return rows.map((row) => String(row.item_id));
}

/* ---------- checks ---------- */

export async function listOpenChecks() {
  return withItems((await db()`select * from table_checks where status = 'open' order by opened_at`) as Row[]);
}

export async function getCheck(id: number) {
  const [check] = await withItems((await db()`select * from table_checks where id = ${id}`) as Row[]);
  if (!check) throw new ApiError(404, "check_not_found");
  return check;
}

/** The paid check behind a receipt link, or null. */
export async function checkByReceipt(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [check] = await withItems(
    (await db()`select * from table_checks where receipt_token = ${token} and status = 'paid'`) as Row[],
  );
  return check ?? null;
}

async function openOnly(id: number) {
  const check = await getCheck(id);
  if (check.status !== "open") throw new ApiError(409, "check_closed");
  return check;
}

/** The checks closed on one day (Berlin time), newest first, for the app's "Heute" and the admin page. */
export async function listClosedChecks(date: string) {
  return withItems(
    (await db()`
      select * from table_checks
      where status <> 'open' and (closed_at at time zone 'Europe/Berlin')::date = ${date}::date
      order by closed_at desc
    `) as Row[],
  );
}

/** The day's figures from the payments of the checks closed that day (a split bill counts each part's method). */
export async function daySummary(date: string) {
  const [row] = (await db()`
    with closed as (
      select * from table_checks
      where status <> 'open' and (closed_at at time zone 'Europe/Berlin')::date = ${date}::date
    )
    select (select count(*) from closed where status = 'paid')::int as paid,
           (select count(*) from closed where status = 'closed')::int as closed,
           (select coalesce(sum(total), 0) from closed where status = 'closed') as order_value,
           (select count(*) from closed where status = 'void')::int as voided,
           (select coalesce(sum(guests), 0) from closed where status in ('paid', 'closed'))::int as guests,
           coalesce(sum(p.amount), 0) as total,
           coalesce(sum(p.tip), 0) as tips,
           coalesce(sum(p.amount) filter (where p.method = 'cash'), 0) as cash,
           coalesce(sum(p.amount) filter (where p.method = 'card'), 0) as card
    from table_check_payments p join closed c on c.id = p.check_id and c.status = 'paid'
  `) as Row[];
  return {
    date,
    paid: Number(row.paid),
    /** Tables closed without payment in the app, and the value of what they ordered (not takings). */
    closed: Number(row.closed),
    orderValue: Number(row.order_value),
    voided: Number(row.voided),
    total: Number(row.total),
    tips: Number(row.tips),
    cash: Number(row.cash),
    card: Number(row.card),
    guests: Number(row.guests),
  };
}

const guestsOf = (value: unknown, fallback?: number) => {
  if (value === undefined && fallback !== undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 40) throw new ApiError(422, "guests_invalid");
  return n;
};
const noteOf = (value: unknown, fallback = "") =>
  value === undefined
    ? fallback
    : String(value ?? "")
        .trim()
        .slice(0, 300);

async function tableOf(tableId: unknown) {
  const [table] = (await db()`select * from dining_tables where id = ${String(tableId ?? "")} and active`) as Row[];
  if (!table) throw new ApiError(404, "table_not_found");
  return table;
}

export async function openCheck(user: Actor, input: Record<string, unknown>) {
  const table = await tableOf(input.tableId);
  const guests = guestsOf(input.guests ?? 2);
  try {
    const [row] = (await db()`
      insert into table_checks (table_id, table_label, guests, note, opened_by, opened_by_name)
      values (${String(table.id)}, ${String(table.label)}, ${guests}, ${noteOf(input.note)}, ${user.id}, ${user.name})
      returning id
    `) as Row[];
    return getCheck(Number(row.id));
  } catch (error) {
    // The unique index allows one open check per table: someone else opened it a moment ago.
    if (String((error as { code?: string }).code) === "23505") throw new ApiError(409, "table_busy");
    throw error;
  }
}

/** Guests, note, or moving the whole check to another (free) table. */
export async function updateCheck(user: Actor, id: number, input: Record<string, unknown>) {
  const check = await openOnly(id);
  let tableId = check.tableId;
  let tableLabel = check.tableLabel;
  if (input.tableId !== undefined && input.tableId !== check.tableId) {
    const table = await tableOf(input.tableId);
    tableId = String(table.id);
    tableLabel = String(table.label);
  }
  try {
    await db()`
      update table_checks
      set guests = ${guestsOf(input.guests, check.guests)}, note = ${noteOf(input.note, check.note)},
          table_id = ${tableId}, table_label = ${tableLabel}, updated_at = now()
      where id = ${id}
    `;
  } catch (error) {
    if (String((error as { code?: string }).code) === "23505") throw new ApiError(409, "table_busy");
    throw error;
  }
  if (tableId !== check.tableId) {
    await audit(user, "service", "Tisch gewechselt", `${check.tableLabel} → ${tableLabel}`, { check: check.number });
  }
  return getCheck(id);
}

/**
  Two tables pushed together: everything on the other table's check moves onto this one (its rounds after this
  one's), the guests are added up and the other table is free again. Not for a check that is partly paid.
*/
export async function mergeChecks(user: Actor, targetId: number, sourceId: number) {
  if (targetId === sourceId) throw new ApiError(422, "merge_same");
  const target = await openOnly(targetId);
  const source = await openOnly(sourceId);
  if (source.payments.length > 0) throw new ApiError(409, "check_has_payments");
  const sql = db();
  await sql.transaction([
    sql`update table_checks set updated_at = now() where id in (${targetId}, ${sourceId})`,
    sql`
      update table_check_items
      set check_id = ${targetId}, round = round + (select rounds from table_checks where id = ${targetId})
      where check_id = ${sourceId}
    `,
    sql`
      update table_checks
      set rounds = rounds + (select rounds from table_checks where id = ${sourceId}),
          guests = least(40, guests + (select guests from table_checks where id = ${sourceId}))
      where id = ${targetId}
    `,
    sql`delete from table_checks where id = ${sourceId}`,
  ]);
  await audit(user, "service", "Tische zusammengelegt", `${source.tableLabel} → ${target.tableLabel}`, {
    check: target.number,
    from: source.number,
  });
  return getCheck(targetId);
}

/**
  Books a round: every line re-priced from the menu (the app's prices are never trusted). Food is sent to the kitchen
  (or held, when marked "later"), drinks count as served straight away.
  With a key (the app sends one per round) the same round arriving twice, e.g. a retry after a dropped connection
  whose first attempt did get through, is booked once: the second time the check is just returned.
*/
export async function addRound(user: Actor, id: number, lines: RoundLine[], key: string | null) {
  if (key !== null && !CLIENT_KEY.test(key)) throw new ApiError(422, "key_invalid");
  if (key !== null && (await roundKeyUsed(key))) return getCheck(id);
  await openOnly(id);
  const menu = await readMenu();
  const dishes = new Map(
    menu.flatMap((category) => category.items.map((dish) => [dish.id, { dish, drinks: category.drinks }] as const)),
  );
  const rows = lines.map((line) => {
    const entry = dishes.get(line.itemId);
    if (!entry) throw new ApiError(422, "dish_not_found");
    if (!entry.dish.available) throw new ApiError(409, "dish_sold_out");
    const kitchen = !entry.drinks;
    return {
      item_id: entry.dish.id,
      name: entry.dish.name,
      unit: entry.dish.price,
      qty: line.qty,
      note: line.note,
      kitchen,
      seat: line.seat,
      status: !kitchen ? "served" : line.hold ? "held" : "sent",
    };
  });
  // One statement: the key, the round number and the dishes are booked together or not at all.
  const inserted = (await db()`
    with k as (
      insert into table_round_keys (key, check_id)
      select ${key ?? `none-${randomBytes(12).toString("base64url")}`}, ${id}
      where exists (select 1 from table_checks where id = ${id} and status = 'open')
      on conflict (key) do nothing
      returning check_id
    ), b as (
      update table_checks set rounds = rounds + 1, updated_at = now()
      where id = ${id} and status = 'open' and exists (select 1 from k)
      returning rounds
    )
    insert into table_check_items (check_id, round, item_id, name, unit, qty, note, kitchen, status, seat, added_by_name, served_at)
    select ${id}, b.rounds, x.item_id, x.name, x.unit, x.qty, x.note, x.kitchen, x.status, x.seat, ${user.name},
           case when x.status = 'served' then now() else null end
    from b, jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      as x(item_id text, name jsonb, unit numeric, qty int, note text, kitchen boolean, seat int, status text)
    returning id
  `) as Row[];
  if (inserted.length === 0) {
    if (key !== null && (await roundKeyUsed(key))) return getCheck(id);
    throw new ApiError(409, "check_closed");
  }
  if (key === null) await db()`delete from table_round_keys where check_id = ${id} and key like 'none-%'`;
  return getCheck(id);
}

async function roundKeyUsed(key: string) {
  const rows = (await db()`select 1 from table_round_keys where key = ${key}`) as Row[];
  return rows.length > 0;
}

/** "Abrufen": the dishes waiting as "later" go to the kitchen now. */
export async function fireHeld(checkId: number) {
  await openOnly(checkId);
  await db()`
    update table_check_items set status = 'sent', fired_at = now()
    where check_id = ${checkId} and status = 'held'
  `;
  await db()`update table_checks set updated_at = now() where id = ${checkId}`;
  return getCheck(checkId);
}

/** serve: carried to the table. void: taken off the bill (with a reason, logged). */
export async function changeItem(user: Actor, checkId: number, itemId: number, input: Record<string, unknown>) {
  const check = await openOnly(checkId);
  const item = check.items.find((entry) => entry.id === itemId);
  if (!item) throw new ApiError(404, "item_not_found");
  if (item.status === "void") throw new ApiError(409, "item_void");
  if (input.action === "serve") {
    await db()`update table_check_items set status = 'served', served_at = now(), fired_at = coalesce(fired_at, case when status = 'held' then now() end) where id = ${itemId} and status <> 'void' and check_id = ${checkId} and exists (select 1 from table_checks where id = ${checkId} and status = 'open')`;
  } else if (input.action === "void") {
    const reason = String(input.reason ?? "")
      .trim()
      .slice(0, 140);
    if (!reason) throw new ApiError(422, "reason_required");
    // Paid in a split bill: it can't come off any more.
    if (item.paymentId !== null) throw new ApiError(409, "item_paid");
    if (cents(check.due) < cents(item.unit) * item.qty) throw new ApiError(409, "item_paid");
    await db()`update table_check_items set status = 'void', void_reason = ${reason} where id = ${itemId} and check_id = ${checkId} and payment_id is null and exists (select 1 from table_checks where id = ${checkId} and status = 'open')`;
    await audit(user, "service", "Position storniert", `Tisch ${check.tableLabel}: ${item.qty}× ${item.name.de}`, {
      check: check.number,
      reason,
    });
  } else throw new ApiError(422, "action_invalid");
  await db()`update table_checks set updated_at = now() where id = ${checkId}`;
  // The rest of a split bill was already paid: taking this line off leaves nothing to pay.
  await closeIfPaid(user, checkId);
  return getCheck(checkId);
}

/** "Alles serviert": everything waiting at the pass has been carried out. */
export async function serveReady(checkId: number) {
  await openOnly(checkId);
  await db()`
    update table_check_items set status = 'served', served_at = now()
    where status = 'ready' and check_id = ${checkId} and exists (select 1 from table_checks where id = ${checkId} and status = 'open')
  `;
  return getCheck(checkId);
}

/**
  Takes payment: the whole rest of the bill, or one part of it (split bill).
  - { method, tip?, given?, key? }: everything still due.
  - { method, amount, due, items?: [{ id, qty }], label?, tip?, given?, key? }: a part. With items, the amount is
    what those lines cost (e.g. "everything on seat 2" or "1 of the 3 beers"); without, any amount up to what is due
    (e.g. one of three equal shares). `due` is what the waiter's screen showed as still to pay.
  The waiter charges what their screen shows: if the bill or the payments changed meanwhile, they must look again
  ("total_changed"). The check closes when the payments add up to the bill.
*/
export async function payCheck(user: Actor, id: number, input: Record<string, unknown>) {
  // Payments off: nothing is booked. Apps from before 1.2 still send "pay"; for them it just closes the table.
  if (!APP_PAYMENTS) return closeCheck(user, id);
  const key = typeof input.key === "string" ? input.key : null;
  if (key !== null && !CLIENT_KEY.test(key)) throw new ApiError(422, "key_invalid");
  if (key !== null && (await paymentKeyUsed(key))) return getCheck(id);

  const check = await openOnly(id);
  const totalCents = cents(checkTotal(check.items));
  if (totalCents <= 0) throw new ApiError(409, "nothing_to_pay");
  const paidCents = check.payments.reduce((sum, payment) => sum + cents(payment.amount), 0);
  const dueCents = totalCents - paidCents;
  // The 1.0 app sends "expected" = the whole bill.
  if (input.expected !== undefined && cents(Number(input.expected)) !== totalCents)
    throw new ApiError(409, "total_changed");
  if (input.due !== undefined && cents(Number(input.due)) !== dueCents) throw new ApiError(409, "total_changed");

  const split = parseSplit(input.items);
  if (!split) throw new ApiError(422, "items_invalid");
  let amountCents = input.amount === undefined ? dueCents : cents(Number(input.amount));
  if (split.length > 0) {
    let linesCents = 0;
    for (const line of split) {
      const item = check.items.find((entry) => entry.id === line.id);
      if (!item || item.status === "void" || item.paymentId !== null || line.qty > item.qty)
        throw new ApiError(409, "total_changed");
      linesCents += cents(item.unit) * line.qty;
    }
    if (input.amount === undefined) amountCents = linesCents;
    if (amountCents !== linesCents) throw new ApiError(422, "amount_invalid");
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > dueCents)
    throw new ApiError(422, "amount_invalid");
  const payment = validatePayment(amountCents / 100, input);
  if ("error" in payment) throw new ApiError(422, payment.error!);
  const label = String(input.label ?? "")
    .trim()
    .slice(0, 40);

  // Booked only if the bill and the payments so far are still what the waiter saw. The first statement locks the
  // check, so two phones paying the same table at the same moment are booked one after the other.
  const sql = db();
  const [, inserted] = (await sql.transaction([
    sql`update table_checks set updated_at = now() where id = ${id} and status = 'open'`,
    sql`
      insert into table_check_payments (check_id, method, amount, tip, given, label, client_key, by_name)
      select ${id}, ${payment.method}, ${amountCents / 100}, ${payment.tip}, ${payment.given}, ${label}, ${key}, ${user.name}
      where exists (select 1 from table_checks where id = ${id} and status = 'open')
        and (select coalesce(sum(round(unit * 100) * qty), 0) from table_check_items where check_id = ${id} and status <> 'void') = ${totalCents}
        and (select coalesce(sum(round(amount * 100)), 0) from table_check_payments where check_id = ${id}) = ${paidCents}
      on conflict (client_key) do nothing
      returning id
    `,
  ])) as [Row[], Row[]];
  const paymentId = inserted[0] ? Number(inserted[0].id) : null;
  if (paymentId === null) {
    if (key !== null && (await paymentKeyUsed(key))) return getCheck(id);
    throw new ApiError(409, (await getCheck(id)).status === "open" ? "total_changed" : "check_closed");
  }

  // The lines this part paid; "1 of 3 beers" splits the line into the paid one and the rest.
  for (const line of split) {
    const item = check.items.find((entry) => entry.id === line.id)!;
    if (line.qty === item.qty) {
      await db()`update table_check_items set payment_id = ${paymentId} where id = ${item.id} and payment_id is null`;
    } else {
      await db()`
        with rest as (update table_check_items set qty = qty - ${line.qty} where id = ${item.id} returning *)
        insert into table_check_items (check_id, round, item_id, name, unit, qty, note, kitchen, status, void_reason,
                                       added_by_name, created_at, ready_at, served_at, seat, fired_at, payment_id)
        select check_id, round, item_id, name, unit, ${line.qty}, note, kitchen, status, void_reason,
               added_by_name, created_at, ready_at, served_at, seat, fired_at, ${paymentId}
        from rest
      `;
    }
  }
  await closeIfPaid(user, id);
  return getCheck(id);
}

async function paymentKeyUsed(key: string) {
  const rows = (await db()`select 1 from table_check_payments where client_key = ${key}`) as Row[];
  return rows.length > 0;
}

/** Closes the check once its payments cover the bill: one method or "mixed", tips added up, a receipt link made. */
async function closeIfPaid(user: Actor, id: number) {
  const token = randomBytes(18).toString("base64url");
  const [closed] = (await db()`
    with p as (
      select coalesce(sum(round(amount * 100)), 0) as paid, coalesce(sum(tip), 0) as tip, count(*) as n,
             count(distinct method) as methods, min(method) as method, max(given) as given
      from table_check_payments where check_id = ${id}
    ), t as (
      select coalesce(sum(round(unit * 100) * qty), 0) as total
      from table_check_items where check_id = ${id} and status <> 'void'
    )
    update table_checks c
    set status = 'paid', payment = case when p.methods > 1 then 'mixed' else p.method end,
        total = t.total / 100.0, tip = p.tip, given = case when p.n = 1 then p.given else null end,
        closed_at = now(), closed_by_name = ${user.name}, receipt_token = ${token}, updated_at = now()
    from p, t
    where c.id = ${id} and c.status = 'open' and p.n > 0 and t.total > 0 and p.paid >= t.total
    returning c.id
  `) as Row[];
  // Food nobody marked as served is served by now.
  if (closed)
    await db()`update table_check_items set status = 'served', served_at = coalesce(served_at, now()) where check_id = ${id} and status in ('held', 'sent', 'ready')`;
}

/** Cancels a check. Service staff only when nothing is left on it; owners always (logged). Not once partly paid. */
export async function voidCheck(user: Actor, id: number, reason: string) {
  const check = await openOnly(id);
  if (check.payments.length > 0) throw new ApiError(409, "check_has_payments");
  const owing = checkTotal(check.items);
  if (owing > 0 && user.role !== "owner") throw new ApiError(403, "void_owner_only");
  await db()`
    update table_checks set status = 'void', closed_at = now(), closed_by_name = ${user.name}, updated_at = now()
    where id = ${id} and status = 'open'
  `;
  await db()`update table_check_items set status = 'void', void_reason = ${reason.slice(0, 140) || "Tisch storniert"} where check_id = ${id} and status <> 'void'`;
  if (owing > 0)
    await audit(user, "service", "Tisch storniert", `Tisch ${check.tableLabel}`, {
      check: check.number,
      owing,
      reason,
    });
  return getCheck(id);
}

/**
  "Tisch schließen": the table is free again; no payment, tip, method or receipt is recorded (payment is taken
  outside the app). Unserved food counts as served. Closing twice is harmless: a closed check is returned as is.
*/
export async function closeCheck(user: Actor, id: number) {
  const check = await getCheck(id);
  if (check.status === "closed") return check;
  if (check.status !== "open") throw new ApiError(409, "check_closed");
  const [closed] = (await db()`
    update table_checks c
    set status = 'closed', total = coalesce((
          select sum(round(unit * 100) * qty) / 100.0 from table_check_items where check_id = c.id and status <> 'void'
        ), 0),
        closed_at = now(), closed_by_name = ${user.name}, updated_at = now()
    where c.id = ${id} and c.status = 'open'
    returning c.id
  `) as Row[];
  if (!closed) {
    const now = await getCheck(id);
    if (now.status === "closed") return now;
    throw new ApiError(409, "check_closed");
  }
  await db()`update table_check_items set status = 'served', served_at = coalesce(served_at, now()) where check_id = ${id} and status in ('held', 'sent', 'ready')`;
  return getCheck(id);
}

/** Owners: a check paid by mistake goes back to its table (if the table is free); its payments are undone. */
export async function reopenCheck(user: Actor, id: number) {
  if (user.role !== "owner") throw new ApiError(403, "owner_only");
  const check = await getCheck(id);
  if (check.status !== "paid") throw new ApiError(409, "check_not_paid");
  try {
    await db()`
      update table_checks set status = 'open', payment = null, total = 0, tip = 0, given = null, closed_at = null,
                              closed_by_name = '', receipt_token = null, updated_at = now()
      where id = ${id}
    `;
  } catch (error) {
    if (String((error as { code?: string }).code) === "23505") throw new ApiError(409, "table_busy");
    throw error;
  }
  await db()`update table_check_items set payment_id = null where check_id = ${id}`;
  await db()`delete from table_check_payments where check_id = ${id}`;
  await audit(user, "service", "Bezahlte Rechnung wieder geöffnet", `Tisch ${check.tableLabel}`, {
    check: check.number,
    total: check.total,
  });
  return getCheck(id);
}

/* ---------- kitchen ---------- */

export type KitchenTicket = {
  checkId: number;
  round: number;
  table: string;
  waiter: string;
  sentAt: string;
  readyAt: string | null;
  /** Dishes the waiter will call later ("held"): for planning, not to cook yet. */
  held: boolean;
  /** The dish name in every language; the kitchen shows it in the team area's language. */
  items: { id: number; qty: number; name: L; note: string; seat: number | null }[];
};

/*
  Food for the kitchen screen: open rounds (oldest first), rounds done in the last 20 minutes still at the pass, and
  dishes waiting to be called.
*/
export async function listKitchenTickets(): Promise<KitchenTicket[]> {
  const rows = (await db()`
    select i.*, c.table_label from table_check_items i join table_checks c on c.id = i.check_id
    where i.kitchen and c.status = 'open'
      and (i.status in ('sent', 'held') or (i.status = 'ready' and i.ready_at > now() - interval '20 minutes'))
    order by coalesce(i.fired_at, i.created_at), i.id
  `) as Row[];
  const tickets = new Map<string, KitchenTicket>();
  for (const row of rows) {
    const held = row.status === "held";
    const key = `${row.check_id}-${row.round}-${held ? "h" : "k"}`;
    const ticket = tickets.get(key) ?? {
      checkId: Number(row.check_id),
      round: Number(row.round),
      table: String(row.table_label),
      waiter: String(row.added_by_name ?? ""),
      sentAt: iso(row.fired_at ?? row.created_at)!,
      readyAt: row.status === "ready" ? iso(row.ready_at) : null,
      held,
      items: [],
    };
    if (row.status === "sent") ticket.readyAt = null;
    ticket.items.push({
      id: Number(row.id),
      qty: Number(row.qty),
      name: row.name as L,
      note: String(row.note ?? ""),
      seat: row.seat == null ? null : Number(row.seat),
    });
    tickets.set(key, ticket);
  }
  // Held dishes after everything to cook now.
  return [...tickets.values()].sort((a, b) => Number(a.held) - Number(b.held));
}

/** "Fertig": the round is at the pass; the waiters' app rings. */
export async function markRoundReady(checkId: number, round: number) {
  await db()`
    update table_check_items set status = 'ready', ready_at = now()
    where check_id = ${checkId} and round = ${round} and kitchen and status = 'sent'
  `;
}

/*
  Retention (nightly cleanup): app feedback and crash reports after 90 days; finished bills, with their dishes and
  payments, after the 10-year tax retention period (§ 147 AO). Open bills are never touched.
*/
export async function purgeServiceData() {
  await db()`delete from app_feedback where created_at < now() - interval '90 days'`;
  await db()`delete from app_crashes where created_at < now() - interval '90 days'`;
  await db()`delete from table_checks where status <> 'open' and closed_at < now() - interval '10 years'`;
}
