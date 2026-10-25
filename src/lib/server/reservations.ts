import "server-only";
import { randomInt } from "node:crypto";
import type { BookingRequest } from "@/lib/booking";
import type { Locale } from "@/lib/i18n";
import { db } from "./db";

export type Status = "pending" | "confirmed" | "declined" | "cancelled";

export type Reservation = BookingRequest & {
  id: number;
  reference: string;
  locale: Locale;
  status: Status;
  staffNote: string;
  source: "website" | "phone";
  createdAt: string;
};

type Row = {
  id: string;
  reference: string;
  date: string | Date;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  locale: Locale;
  status: Status;
  staff_note: string;
  source: "website" | "phone";
  created_at: string;
};

/**
  The database driver returns a `date` column as a JS Date at local midnight, not as text, so
  String(date) gave "Thu Oct 29" and broke every date shown to staff and in emails.
*/
export function isoDate(value: string | Date) {
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

const toReservation = (row: Row): Reservation => ({
  id: Number(row.id),
  reference: row.reference,
  date: isoDate(row.date),
  time: row.time,
  guests: row.guests,
  name: row.name,
  email: row.email,
  phone: row.phone,
  note: row.note,
  locale: row.locale,
  status: row.status,
  staffNote: row.staff_note,
  source: row.source ?? "website",
  createdAt: String(row.created_at),
});

// No 0/O/1/I so references can be read out on the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "YT-" + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** Open requests and requests in the last day for an email address (flood protection). */
export async function recentCount(email: string) {
  const [row] = (await db()`
    select count(*) filter (where status = 'pending' and date >= (now() at time zone 'Europe/Berlin')::date)::int as open,
           count(*) filter (where created_at > now() - interval '1 day')::int as day
    from reservations where lower(email) = lower(${email})
  `) as { open: number; day: number }[];
  return row;
}

export async function createReservation(
  input: BookingRequest,
  locale: Locale,
  {
    source = "website",
    status = "pending",
    userId = null,
  }: { source?: "website" | "phone"; status?: Status; userId?: number | null } = {},
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = (await db()`
        insert into reservations (reference, date, time, guests, name, email, phone, note, locale, source, status, user_id)
        values (${newReference()}, ${input.date}, ${input.time}, ${input.guests}, ${input.name}, ${input.email}, ${input.phone}, ${input.note}, ${locale}, ${source}, ${status}, ${userId})
        returning *
      `) as Row[];
      return toReservation(row);
    } catch (error) {
      // reference collision: try another code
      if (!(error instanceof Error && /unique/i.test(error.message))) throw error;
    }
  }
  throw new Error("Could not allocate a reservation reference.");
}

/** Reservations from `fromDate` on (default: today in Berlin), oldest first. */
export async function listReservations(fromDate?: string) {
  const rows = (
    fromDate
      ? await db()`select * from reservations where date >= ${fromDate} order by date, time, id`
      : await db()`select * from reservations where date >= (now() at time zone 'Europe/Berlin')::date order by date, time, id`
  ) as Row[];
  return rows.map(toReservation);
}

/** Reservations in a date range (inclusive), oldest first. */
export async function listBetween(from: string, to: string) {
  const rows =
    (await db()`select * from reservations where date between ${from} and ${to} order by date, time, id`) as Row[];
  return rows.map(toReservation);
}

export async function findByReference(reference: string) {
  const [row] = (await db()`select * from reservations where reference = ${reference}`) as Row[];
  return row ? toReservation(row) : null;
}

export async function setStatus(id: number, status: Status, staffNote: string) {
  const [row] = (await db()`
    update reservations set status = ${status}, staff_note = ${staffNote}, updated_at = now()
    where id = ${id} returning *
  `) as Row[];
  return row ? toReservation(row) : null;
}

/** Data retention: personal data of reservations older than 180 days is removed. */
export async function purgeOld() {
  const rows =
    (await db()`delete from reservations where date < (now() at time zone 'Europe/Berlin')::date - 180 returning id`) as {
      id: string;
    }[];
  return rows.length;
}

/** A guest's own bookings, newest first. */
export async function listForUser(userId: number) {
  const rows =
    (await db()`select * from reservations where user_id = ${userId} order by date desc, time desc`) as Row[];
  return rows.map(toReservation);
}

/** Cancels a booking if it belongs to the user, lies in the future and is still open or confirmed. */
export async function cancelForUser(id: number, userId: number) {
  const [row] = (await db()`
    update reservations set status = 'cancelled', updated_at = now()
    where id = ${id} and user_id = ${userId} and status in ('pending', 'confirmed')
      and date >= (now() at time zone 'Europe/Berlin')::date
    returning *
  `) as Row[];
  return row ? toReservation(row) : null;
}

/** Cancels a booking by reference (signed link from the guest's email). */
export async function cancelByReference(reference: string) {
  const [row] = (await db()`
    update reservations set status = 'cancelled', updated_at = now()
    where reference = ${reference} and status in ('pending', 'confirmed')
      and date >= (now() at time zone 'Europe/Berlin')::date
    returning *
  `) as Row[];
  return row ? toReservation(row) : null;
}
