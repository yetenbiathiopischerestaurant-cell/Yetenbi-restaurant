"use server";

import { revalidatePath } from "next/cache";
import { validateBooking, type BookingRequest } from "@/lib/booking";
import { requireOwner } from "@/lib/server/auth";
import { addClosure, removeClosure, upcomingClosures } from "@/lib/server/closures";
import { sendGuestEmail } from "@/lib/server/email";
import { createReservation, setStatus, type Status } from "@/lib/server/reservations";
import { audit } from "@/lib/server/audit";
import { readBusiness } from "@/lib/server/business";
import { adminText } from "@/lib/server/admin-lang";

export type AdminState = { error?: string; ok?: string } | null;

/** Accept, decline or cancel a request; the guest is emailed in their language. */
export async function decide(form: FormData) {
  const me = await requireOwner();
  const id = Number(form.get("id"));
  const status = String(form.get("status")) as Status;
  const note = String(form.get("note") ?? "")
    .slice(0, 400)
    .trim();
  if (!Number.isInteger(id) || !["confirmed", "declined", "cancelled", "pending"].includes(status)) return;
  const reservation = await setStatus(id, status, note);
  if (reservation && (status === "confirmed" || status === "declined")) await sendGuestEmail(status, reservation);
  if (reservation) {
    const what = {
      confirmed: "Reservierung bestätigt",
      declined: "Reservierung abgelehnt",
      cancelled: "Reservierung storniert",
      pending: "Reservierung wieder offen",
    }[status];
    await audit(
      me,
      "reservations",
      what,
      `${reservation.reference} · ${reservation.date} ${reservation.time} · ${reservation.guests} P.`,
    );
  }
  revalidatePath("/admin/reservierungen");
  revalidatePath("/admin");
}

/** A reservation taken by phone: confirmed straight away, email optional. */
export async function addPhoneBooking(_: AdminState, form: FormData): Promise<AdminState> {
  const me = await requireOwner();
  const input: BookingRequest = {
    date: String(form.get("date") ?? ""),
    time: String(form.get("time") ?? ""),
    guests: Number(form.get("guests")),
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
    phone: String(form.get("phone") ?? "").trim(),
    note: String(form.get("note") ?? "").trim(),
  };
  const closures = (await upcomingClosures()).map((closure) => closure.date);
  const errors = validateBooking(input, undefined, closures, {
    emailOptional: true,
    week: (await readBusiness()).hours,
  });
  const { t } = await adminText();
  const first = Object.values(errors)[0];
  if (first) return { error: t.reservations.errors[first] ?? first };
  const reservation = await createReservation(input, "de", { source: "phone", status: "confirmed" });
  if (reservation.email) await sendGuestEmail("confirmed", reservation);
  await audit(
    me,
    "reservations",
    "Telefonische Reservierung eingetragen",
    `${reservation.reference} · ${reservation.date} ${reservation.time} · ${reservation.guests} P.`,
  );
  revalidatePath("/admin/reservierungen");
  revalidatePath("/admin");
  return { ok: t.reservations.added(reservation.reference) };
}

export async function addClosedDay(_: AdminState, form: FormData): Promise<AdminState> {
  const me = await requireOwner();
  const date = String(form.get("date") ?? "");
  const note = String(form.get("note") ?? "")
    .trim()
    .slice(0, 120);
  const { t } = await adminText();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: t.reservations.pickDate };
  await addClosure(date, note);
  await audit(me, "settings", "Schließtag eingetragen", `${date}${note ? ` · ${note}` : ""}`);
  revalidatePath("/admin/reservierungen");
  revalidatePath("/admin");
  return { ok: t.reservations.closedSaved };
}

export async function removeClosedDay(form: FormData) {
  const me = await requireOwner();
  const date = String(form.get("date") ?? "");
  await removeClosure(date);
  await audit(me, "settings", "Schließtag entfernt", date);
  revalidatePath("/admin/reservierungen");
  revalidatePath("/admin");
}
