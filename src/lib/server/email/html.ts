import "server-only";
import { restaurant } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

// Building blocks for the HTML emails. Email clients ignore <style> tags,
// so every element carries its styles inline.

const colors = {
  page: "#1c1712",
  card: "#27201a",
  border: "#6b5426",
  divider: "#3a2f24",
  text: "#f4ecdc",
  body: "#e0d6c3",
  muted: "#b9ab92",
  gold: "#c9a24a",
  goldLight: "#e7cd8a",
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function formatEuro(amount: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

const dateLocales: Record<Locale, string> = { de: "de-DE", en: "en-GB", am: "am-ET" };

/** "Freitag, 16. Oktober 2026" for a date like "2026-10-16". */
export function formatLongDate(date: string, locale: Locale) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(dateLocales[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The dark card every email is wrapped in: logo, heading, body and the restaurant's address. */
export function emailLayout(heading: string, body: string) {
  const footer = `${escapeHtml(restaurant.street)}, ${escapeHtml(restaurant.city)} · ${escapeHtml(restaurant.phone)}`;
  return `<!doctype html>
<html>
<body style="margin:0;background:${colors.page};font-family:Georgia,'Times New Roman',serif;color:${colors.text}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.page};padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid ${colors.border};background:${colors.card}">
        <tr><td style="padding:28px 32px 8px;text-align:center;letter-spacing:6px;font-size:22px;color:${colors.goldLight};font-weight:bold">YETENBI</td></tr>
        <tr><td style="padding:0 32px 18px;text-align:center;font-size:11px;letter-spacing:3px;color:${colors.muted};text-transform:uppercase">Restaurant &amp; Café · Würzburg</td></tr>
        <tr><td style="padding:0 32px"><div style="border-top:1px solid ${colors.border}"></div></td></tr>
        <tr><td style="padding:26px 32px 4px;font-size:22px;color:${colors.text}">${heading}</td></tr>
        <tr><td style="padding:8px 32px 30px;font-size:16px;line-height:1.6;color:${colors.body}">${body}</td></tr>
        <tr><td style="padding:16px 32px 26px;font-size:12px;color:${colors.muted};border-top:1px solid ${colors.divider}">${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** A paragraph of plain text (escaped). */
export function paragraph(text: string, style = "") {
  return `<p style="margin:0;${style}">${escapeHtml(text)}</p>`;
}

/** Small grey print, e.g. the closing line or the ordering terms. `html` must already be escaped. */
export function smallPrint(html: string) {
  return `<p style="margin:20px 0 0;font-size:12px;color:${colors.muted}">${html}</p>`;
}

export function textLink(href: string, text: string) {
  return `<a href="${escapeHtml(href)}" style="color:${colors.goldLight}">${escapeHtml(text)}</a>`;
}

export function button(href: string, text: string) {
  const style = `display:inline-block;background:${colors.gold};color:${colors.page};padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold`;
  return `<p style="margin:20px 0 0"><a href="${escapeHtml(href)}" style="${style}">${escapeHtml(text)}</a></p>`;
}

/** A highlighted quote, e.g. the guest's note or a message from the restaurant. */
export function quote(text: string, label?: string) {
  const heading = label ? `<em>${escapeHtml(label)}:</em><br>` : "";
  return `<p style="margin:16px 0 0;padding:12px 16px;border-left:2px solid ${colors.gold}">${heading}${escapeHtml(text)}</p>`;
}

/** Label/value rows, e.g. date, time and number of guests. */
export function detailsTable(rows: [label: string, value: string][]) {
  const labelStyle = `padding:6px 0;color:${colors.gold};font-size:12px;letter-spacing:2px;text-transform:uppercase;width:40%`;
  const html = rows
    .map(
      ([label, value]) =>
        `<tr><td style="${labelStyle}">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:17px;color:${colors.text}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;width:100%">${html}</table>`;
}

/** Item lines with prices, then the total. `extras` are lines like deposit or delivery fee. NaN shows as "–". */
export function priceTable(
  lines: [label: string, amount: number][],
  extras: [string, number][],
  totalLabel: string,
  total: number,
) {
  const row = (label: string, amount: number, color: string) =>
    `<tr><td style="padding:4px 0;color:${color}">${escapeHtml(label)}</td><td style="padding:4px 0;text-align:right;color:${color}">${Number.isFinite(amount) ? formatEuro(amount) : "–"}</td></tr>`;
  const totalStyle = `padding:10px 0 0;border-top:1px solid ${colors.border};color:${colors.goldLight}`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;font-size:15px">
  ${lines.map(([label, amount]) => row(label, amount, colors.body)).join("")}
  ${extras.map(([label, amount]) => row(label, amount, colors.muted)).join("")}
  <tr><td style="${totalStyle}">${escapeHtml(totalLabel)}</td><td style="${totalStyle};text-align:right;font-size:18px">${formatEuro(total)}</td></tr>
</table>`;
}

/** A bulleted list of plain text items. */
export function list(items: string[]) {
  return `<ul style="margin:12px 0 0;padding-left:18px">${items.map((item) => `<li style="padding:2px 0">${escapeHtml(item)}</li>`).join("")}</ul>`;
}
