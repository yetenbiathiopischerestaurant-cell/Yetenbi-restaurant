"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { Business } from "@/lib/business";
import type { DayHours } from "@/lib/hours";
import { isEmail } from "@/lib/validate";
import { audit } from "@/lib/server/audit";
import { adminText } from "@/lib/server/admin-lang";
import { requireOwner } from "@/lib/server/auth";
import { readBusiness, saveBusiness } from "@/lib/server/business";

type SettingsState = { ok?: string; error?: string } | null;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Opening hours and legal details. Hours apply at once to the website, reservations, ordering and search engines. */
export async function saveBusinessSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const text = t.settings;
  const hours: DayHours[] = [];
  for (let day = 0; day < 7; day++) {
    if (form.get(`open-${day}`) !== "on") {
      hours.push(null);
      continue;
    }
    const open = String(form.get(`from-${day}`) ?? "");
    const close = String(form.get(`to-${day}`) ?? "");
    if (!TIME.test(open) || !TIME.test(close)) return { error: text.errors.timeFormat(text.days[day]) };
    if (open >= close) return { error: text.errors.closeAfterOpen(text.days[day]) };
    hours.push({ open, close });
  }
  if (hours.every((dayHours) => !dayHours)) return { error: text.errors.oneDayOpen };

  const contactEmail = String(form.get("contactEmail") ?? "")
    .trim()
    .toLowerCase();
  if (contactEmail && !isEmail(contactEmail)) return { error: text.errors.email };
  const next: Business = {
    hours,
    ownerName: String(form.get("ownerName") ?? "")
      .trim()
      .slice(0, 120),
    contactEmail,
    vatId: String(form.get("vatId") ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 20),
  };
  const before = await readBusiness();
  await saveBusiness(next);
  // What changed. The log keeps the German names (it is a record); the message uses the chosen language.
  const changed: ("hours" | "owner" | "email" | "vat")[] = [];
  if (JSON.stringify(before.hours) !== JSON.stringify(next.hours)) changed.push("hours");
  if (before.ownerName !== next.ownerName) changed.push("owner");
  if (before.contactEmail !== next.contactEmail) changed.push("email");
  if (before.vatId !== next.vatId) changed.push("vat");
  const german = { hours: "Öffnungszeiten", owner: "Inhaber", email: "Kontakt-E-Mail", vat: "USt-IdNr." };
  if (changed.length)
    await audit(me, "settings", "Betriebsdaten geändert", changed.map((key) => german[key]).join(", "));
  updateTag("business");
  revalidatePath("/admin/einstellungen");
  return {
    ok: changed.length ? text.saved(changed.map((key) => text.changed[key]).join(", ")) : text.noChanges,
  };
}
