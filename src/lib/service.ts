import type { L } from "./data";

/*
  Table service: what the waiters' app sends and gets back. A check (Rechnung) belongs to one table visit; each
  time the waiter sends a round, food goes to the kitchen (sent -> ready -> served) and drinks are served at once.
  Food marked "later" waits (held) until the waiter calls it, e.g. the mains after the starters.
  Prices always come from the menu on the server; the app only sends dish ids, quantities, notes and seats.
*/

export type CheckStatus = "open" | "paid" | "void";
export type ItemStatus = "held" | "sent" | "ready" | "served" | "void";
export type PayMethod = "cash" | "card";

export type CheckItem = {
  id: number;
  round: number;
  itemId: string;
  name: L;
  unit: number;
  qty: number;
  note: string;
  kitchen: boolean;
  status: ItemStatus;
  voidReason: string;
  addedBy: string;
  createdAt: string;
  readyAt: string | null;
  servedAt: string | null;
  /** The guest's seat (1, 2, …), or null for the whole table. */
  seat: number | null;
  /** Set once the dish is paid in a split bill. */
  paymentId: number | null;
};

export type CheckPayment = {
  id: number;
  method: PayMethod;
  amount: number;
  tip: number;
  given: number | null;
  label: string;
  by: string;
  createdAt: string;
};

export type Check = {
  id: number;
  number: number;
  tableId: string;
  tableLabel: string;
  guests: number;
  note: string;
  status: CheckStatus;
  openedBy: string;
  openedAt: string;
  closedAt: string | null;
  closedBy: string;
  payment: PayMethod | "mixed" | null;
  total: number;
  tip: number;
  given: number | null;
  items: CheckItem[];
  /** Split bill: what has been paid so far (a check paid at once has one payment). */
  payments: CheckPayment[];
  /** Still to pay: the bill minus the payments so far. */
  due: number;
  /** Link to the guest's copy of the bill, once paid. */
  receiptToken: string | null;
};

export type DiningTable = { id: string; label: string; area: string; seats: number };

export type RoundLine = { itemId: string; qty: number; note: string; seat: number | null; hold: boolean };

const MAX_LINES = 40;
const MAX_NOTE = 140;

/** Cents-exact sum of the lines still on the bill (voided lines are free). */
export function checkTotal(items: Pick<CheckItem, "unit" | "qty" | "status">[]) {
  const cents = items
    .filter((item) => item.status !== "void")
    .reduce((sum, item) => sum + Math.round(item.unit * 100) * item.qty, 0);
  return cents / 100;
}

/** Euros still to pay: the bill minus the payments so far (never below 0). */
export function checkDue(
  items: Pick<CheckItem, "unit" | "qty" | "status">[],
  payments: Pick<CheckPayment, "amount">[],
) {
  const paid = payments.reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0);
  return Math.max(0, Math.round(checkTotal(items) * 100) - paid) / 100;
}

/** What the kitchen still has to cook, and what is waiting at the pass to be carried out. */
export function kitchenCounts(items: Pick<CheckItem, "kitchen" | "status" | "qty">[]) {
  let cooking = 0;
  let ready = 0;
  for (const item of items) {
    if (!item.kitchen) continue;
    if (item.status === "sent") cooking += item.qty;
    if (item.status === "ready") ready += item.qty;
  }
  return { cooking, ready };
}

/** Checks the round the app sends: known shape, 1–99 of each, short notes. Returns null when it is unusable. */
export function parseRound(input: unknown): RoundLine[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_LINES) return null;
  const lines: RoundLine[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const { itemId, qty, note, seat, hold } = raw as Record<string, unknown>;
    if (typeof itemId !== "string" || !/^[a-z0-9-]{1,40}$/i.test(itemId)) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) return null;
    if (note !== undefined && typeof note !== "string") return null;
    if (seat != null && (typeof seat !== "number" || !Number.isInteger(seat) || seat < 1 || seat > 40)) return null;
    lines.push({
      itemId,
      qty,
      note: (note ?? "").trim().slice(0, MAX_NOTE),
      seat: typeof seat === "number" ? seat : null,
      hold: hold === true,
    });
  }
  return lines;
}

/** The key the app sends with a round or a payment, so a repeat of the same request is booked once. */
export const CLIENT_KEY = /^[A-Za-z0-9_-]{16,64}$/;

/**
  What a split payment covers: lines of the bill with how many of each ("1 of the 3 beers"). Empty: just an amount,
  e.g. one of three equal shares. Null when the request is unusable.
*/
export function parseSplit(input: unknown): { id: number; qty: number }[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > 200) return null;
  const lines: { id: number; qty: number }[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const { id, qty } = raw as Record<string, unknown>;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) return null;
    if (lines.some((line) => line.id === id)) return null;
    lines.push({ id, qty });
  }
  return lines;
}

/** Tip and cash handed over must make sense for the amount due. */
export function validatePayment(total: number, input: { method?: unknown; tip?: unknown; given?: unknown }) {
  const method = input.method === "cash" || input.method === "card" ? input.method : null;
  if (!method) return { error: "method_invalid" as const };
  const tip = input.tip === undefined ? 0 : Number(input.tip);
  if (!Number.isFinite(tip) || tip < 0 || tip > 1000) return { error: "tip_invalid" as const };
  let given: number | null = null;
  if (method === "cash" && input.given !== undefined && input.given !== null) {
    given = Number(input.given);
    if (!Number.isFinite(given) || given < 0 || given > 10_000) return { error: "given_invalid" as const };
    if (Math.round(given * 100) < Math.round((total + tip) * 100)) return { error: "given_too_low" as const };
  }
  return { method, tip: Math.round(tip * 100) / 100, given };
}
