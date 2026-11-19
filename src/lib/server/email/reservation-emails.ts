import "server-only";
import { siteUrl } from "@/lib/site-url";
import { cancelUrl } from "../cancel-token";
import type { Reservation } from "../reservations";
import { calendarFile } from "./calendar";
import { preorderLineTotal, preorderText, preorderTotal } from "@/lib/menu";
import type { Locale } from "@/lib/i18n";
import {
  button,
  detailsTable,
  emailLayout,
  escapeHtml,
  formatLongDate,
  paragraph,
  priceTable,
  quote,
  textLink,
} from "./html";
import { isMailerConfigured, restaurantInbox, sendEmail } from "./send";
import { reservationTexts, type ReservationEmailKind } from "./texts";

/** The dishes chosen with the booking, with prices where the dish has one. Empty when nothing was chosen. */
function preorderBlock(reservation: Reservation, locale: Locale) {
  if (!reservation.preorder.length) return "";
  const text = reservationTexts[locale].preorder;
  const { total, unpriced } = preorderTotal(reservation.preorder);
  const lines: [string, number][] = reservation.preorder.map((item) => [
    preorderText(item, locale),
    item.price > 0 ? preorderLineTotal(item) : NaN, // no price yet: "–"
  ]);
  let html = `<p style="margin:22px 0 0;font-weight:600">${escapeHtml(text.title)}</p>`;
  html += priceTable(lines, [], text.total, total);
  if (unpriced) html += paragraph(text.unpriced, "font-size:13px;color:#b9ab92");
  return html;
}

/** Booking received / confirmed / declined / cancelled by the restaurant, to the guest in the language they booked in. */
export async function sendGuestEmail(kind: ReservationEmailKind, reservation: Reservation, origin = siteUrl()) {
  // Bookings the team enters for phone callers may have no email address.
  if (!isMailerConfigured() || !reservation.email) return;

  const text = reservationTexts[reservation.locale];
  const [dateLabel, timeLabel, guestsLabel, referenceLabel] = text.labels;

  let body = paragraph(text[kind].intro);
  body += detailsTable([
    [dateLabel, formatLongDate(reservation.date, reservation.locale)],
    [timeLabel, reservation.time],
    [guestsLabel, String(reservation.guests)],
    [referenceLabel, reservation.reference],
  ]);
  body += preorderBlock(reservation, reservation.locale);
  if (reservation.staffNote) body += quote(reservation.staffNote, text.staffNote);
  if (kind !== "declined" && kind !== "cancelled") {
    body += `<p style="margin:18px 0 0;font-size:14px">${textLink(cancelUrl(origin, reservation.reference), text.cancel)}</p>`;
  }
  body += paragraph(text.outro, "margin-top:22px;color:#b9ab92");

  const attachments =
    kind === "confirmed"
      ? [
          {
            filename: "yetenbi.ics",
            content: calendarFile(reservation),
            contentType: "text/calendar; charset=utf-8; method=PUBLISH",
          },
        ]
      : [];

  await sendEmail(
    {
      to: reservation.email,
      replyTo: restaurantInbox(),
      subject: text[kind].subject(reservation),
      html: emailLayout(`${escapeHtml(reservation.name)},`, body),
      attachments,
    },
    `guest ${kind} ${reservation.reference}`,
  );
}

/** A new booking request, to the restaurant. */
export async function notifyRestaurant(reservation: Reservation, origin: string) {
  if (!isMailerConfigured()) return;

  const date = formatLongDate(reservation.date, "de");
  const rows: [string, string][] = [
    ["Datum", date],
    ["Uhrzeit", reservation.time],
    ["Personen", String(reservation.guests)],
    ["Name", reservation.name],
    ["Telefon", reservation.phone],
    ["E-Mail", reservation.email],
    ["Sprache", reservation.locale.toUpperCase()],
  ];
  if (reservation.note) rows.push(["Anmerkung", reservation.note]);

  await sendEmail(
    {
      to: restaurantInbox(),
      replyTo: reservation.email,
      subject: `Neue Anfrage: ${reservation.guests} Pers., ${date} ${reservation.time}${reservation.preorder.length ? " mit Vorbestellung" : ""} (${reservation.reference})`,
      html: emailLayout(
        "Neue Reservierungsanfrage",
        detailsTable(rows) +
          preorderBlock(reservation, "de") +
          button(`${origin}/admin/reservierungen`, "Annehmen oder ablehnen"),
      ),
    },
    `restaurant new booking ${reservation.reference}`,
  );
}

/** Tells the restaurant that a guest cancelled through the link in their email. */
export async function notifyRestaurantCancelled(reservation: Reservation, origin = siteUrl()) {
  if (!isMailerConfigured()) return;

  const date = formatLongDate(reservation.date, "de");
  const message =
    `${reservation.name} hat die Reservierung ${reservation.reference} für ${date}, ` +
    `${reservation.time} Uhr (${reservation.guests} Personen) storniert.`;

  await sendEmail(
    {
      to: restaurantInbox(),
      subject: `Storniert: ${reservation.guests} Pers., ${date} ${reservation.time} (${reservation.reference})`,
      html: emailLayout(
        "Ein Gast hat storniert",
        paragraph(message) +
          `<p style="margin:24px 0 0">${textLink(`${origin}/admin/reservierungen`, "Zur Übersicht")}</p>`,
      ),
    },
    `restaurant cancellation ${reservation.reference}`,
  );
}
