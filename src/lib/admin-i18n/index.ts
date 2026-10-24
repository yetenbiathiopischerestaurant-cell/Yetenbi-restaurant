/*
  Language of the team area (/admin and the kitchen screen): German or English, chosen with the switch in the admin
  and kept in the "yt-admin-lang" cookie so server-rendered pages and server actions can read it. It is separate from
  the public website's language (which lives only in the visitor's browser).
*/
import { adminDe, type AdminDict } from "./de";
import { adminEn } from "./en";

export type { AdminDict };
export const ADMIN_LANGS = ["de", "en"] as const;
export type AdminLang = (typeof ADMIN_LANGS)[number];
export const ADMIN_LANG_COOKIE = "yt-admin-lang";

const DICTS: Record<AdminLang, AdminDict> = { de: adminDe, en: adminEn };

export const asAdminLang = (value: string | undefined | null): AdminLang => (value === "en" ? "en" : "de");
export const adminDict = (lang: AdminLang) => DICTS[lang];

/*
  The activity log stores what happened in German (it is a record, written once). In English it is shown translated:
  fixed phrases from this list, and the few phrases that carry a value by their German prefix.
*/
const AUDIT_EN: Record<string, string> = {
  Angemeldet: "Signed in",
  "In der Service-App angemeldet": "Signed in to the service app",
  "In der Service-App angemeldet (Google)": "Signed in to the service app (Google)",
  "In der Service-App übernommen (PIN)": "Took over the service app (PIN)",
  "Reservierung bestätigt": "Reservation confirmed",
  "Reservierung abgelehnt": "Reservation declined",
  "Reservierung storniert": "Reservation cancelled",
  "Reservierung wieder offen": "Reservation reopened",
  "Telefonische Reservierung eingetragen": "Phone reservation entered",
  "Schließtag eingetragen": "Closed day added",
  "Schließtag entfernt": "Closed day removed",
  "Kategorie angelegt": "Category created",
  "Kategorie geändert": "Category changed",
  "Kategorie gelöscht": "Category deleted",
  "Gericht angelegt": "Dish created",
  "Gericht geändert": "Dish changed",
  "Gericht gelöscht": "Dish deleted",
  "Wieder verfügbar": "Available again",
  "Ausverkauft gemeldet": "Marked sold out",
  "Wieder verfügbar (Küche)": "Available again (kitchen)",
  "Ausverkauft gemeldet (Küche)": "Marked sold out (kitchen)",
  "Foto hochgeladen": "Photo uploaded",
  "Foto zurückgesetzt": "Photo reset",
  "Betriebsdaten geändert": "Business details changed",
  "Notiz gespeichert": "Note saved",
  "Notiz gelöscht": "Note deleted",
  "Gast gesperrt": "Guest blocked",
  "Telefonnummer gesperrt": "Phone number blocked",
  "Sperre aufgehoben": "Block lifted",
  "Aus dem Team entfernt": "Removed from the team",
  "Passwort neu gesetzt": "New password set",
  "App-PIN gesetzt": "App PIN set",
  "App-PIN entfernt": "App PIN removed",
  "App-Version freigegeben": "App version released",
  "App-Version zurückgezogen": "App version withdrawn",
  "App-Update verpflichtend": "App update made mandatory",
  "App-Update freiwillig": "App update made optional",
  "Tischplan geändert": "Table plan changed",
  "Tisch gewechselt": "Table changed",
  "Tische zusammengelegt": "Tables merged",
  "Position storniert": "Item voided",
  "Tisch storniert": "Table voided",
  "Bezahlte Rechnung wieder geöffnet": "Paid bill reopened",
  "Bestellung abgelehnt": "Order declined",
  "Bestellung storniert": "Order cancelled",
  "Essen fertig": "Food ready",
  Verpackt: "Packed",
  "Zur Lieferung übergeben": "Handed over for delivery",
  Abholbereit: "Ready for pick-up",
  Zugestellt: "Delivered",
  Abgeholt: "Picked up",
};

const AUDIT_PREFIX_EN: [string, string][] = [
  ["Preis geändert: ", "Price changed: "],
  ["Rolle vergeben: ", "Role given: "],
  ["Rolle geändert: ", "Role changed: "],
  ["Konto angelegt: ", "Account created: "],
  ["Bestellung angenommen ", "Order accepted "],
  ["An ", "Handed to "],
];

export function auditText(action: string, lang: AdminLang) {
  if (lang === "de") return action;
  if (AUDIT_EN[action]) return AUDIT_EN[action];
  const prefix = AUDIT_PREFIX_EN.find(([german]) => action.startsWith(german));
  return prefix ? prefix[1] + action.slice(prefix[0].length).replace(" übergeben", "") : action;
}
