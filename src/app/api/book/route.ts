import { after } from "next/server";
import { validateBooking, type BookingRequest } from "@/lib/booking";
import { LOCALES, type Locale } from "@/lib/i18n";
import { hasDatabase } from "@/lib/server/db";
import { notifyRestaurant, sendGuestEmail } from "@/lib/server/email";
import { createReservation, recentCount } from "@/lib/server/reservations";
import { upcomingClosures } from "@/lib/server/closures";
import { getCurrentUser } from "@/lib/server/auth";
import { isLimited, RATE, recordHit, visitorKey } from "@/lib/server/rate-limit";
import { getBusiness } from "@/lib/server/business";

/*
  Reservation requests from the website, from signed-in guests with a confirmed email address only (like online
  orders). A valid request is stored as "pending", the guest gets a receipt and the restaurant a notification; the
  owner accepts or declines it in /admin. The receipt goes to the account's address, not to one typed into the form.
  Without a database the form falls back to WhatsApp (the client sees 503 "unavailable").
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return Response.json({ code: "login" }, { status: 401 });
  if (!me.emailVerified) return Response.json({ code: "verify" }, { status: 403 });

  let body: Partial<BookingRequest> & { locale?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid" }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill the "website" field.
  if (body.website) return Response.json({ reference: "YT-0000" }, { status: 201 });

  const clean: BookingRequest = {
    date: String(body.date ?? ""),
    time: String(body.time ?? ""),
    guests: Number(body.guests),
    name: String(body.name ?? "").trim(),
    email: me.email.trim().toLowerCase(),
    phone: String(body.phone ?? "").trim(),
    note: String(body.note ?? "").trim(),
  };
  const locale: Locale = (LOCALES as readonly string[]).includes(body.locale ?? "") ? (body.locale as Locale) : "de";

  const [closureList, business] = await Promise.all([upcomingClosures(), getBusiness()]);
  const closures = closureList.map((closure) => closure.date);
  const errors = validateBooking(clean, undefined, closures, { week: business.hours });
  if (Object.keys(errors).length) return Response.json({ code: "errors", errors }, { status: 422 });

  // Each request emails the restaurant, so one address can't flood it: 3 open requests, 10 a day.
  // …and one connection can't flood it with ever-new addresses.
  const recent = await recentCount(clean.email);
  const ip = await visitorKey(request);
  if (recent.open >= 3 || recent.day >= 10 || (await isLimited("book-ip", ip, RATE.bookPerIp)))
    return Response.json({ code: "busy" }, { status: 429 });
  await recordHit("book-ip", ip);

  const reservation = await createReservation(clean, locale, { userId: me.id });
  const origin = new URL(request.url).origin;
  after(async () => {
    await notifyRestaurant(reservation, origin);
    await sendGuestEmail("received", reservation, origin);
  });

  return Response.json({ reference: reservation.reference }, { status: 201 });
}
