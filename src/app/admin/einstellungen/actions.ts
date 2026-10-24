"use server";

import { revalidatePath, updateTag } from "next/cache";
import { DAY_NAMES, type Business } from "@/lib/business";
import type { DayHours } from "@/lib/hours";
import { isEmail } from "@/lib/validate";
import { audit } from "@/lib/server/audit";
import { requireOwner } from "@/lib/server/auth";
import { readBusiness, saveBusiness } from "@/lib/server/business";

type SettingsState = { ok?: string; error?: string } | null;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Opening hours and legal details. Hours apply at once to the website, reservations, ordering and search engines. */
export async function saveBusinessSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const me = await requireOwner();
  const hours: DayHours[] = [];
  for (let day = 0; day < 7; day++) {
    if (form.get(`open-${day}`) !== "on") {
      hours.push(null);
      continue;
    }
    const open = String(form.get(`from-${day}`) ?? "");
    const close = String(form.get(`to-${day}`) ?? "");
    if (!TIME.test(open) || !TIME.test(close))
      return { error: `${DAY_NAMES[day]}: bitte Uhrzeiten wie 11:00 eingeben.` };
    if (open >= close)
      return { error: `${DAY_NAMES[day]}: Schluss muss nach der Öffnung liegen (über Mitternacht geht nicht).` };
    hours.push({ open, close });
  }
  if (hours.every((dayHours) => !dayHours)) return { error: "Mindestens ein Tag muss geöffnet sein." };

  const contactEmail = String(form.get("contactEmail") ?? "")
    .trim()
    .toLowerCase();
  if (contactEmail && !isEmail(contactEmail)) return { error: "Die E-Mail-Adresse ist ungültig." };
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
  const changed: string[] = [];
  if (JSON.stringify(before.hours) !== JSON.stringify(next.hours)) changed.push("Öffnungszeiten");
  if (before.ownerName !== next.ownerName) changed.push("Inhaber");
  if (before.contactEmail !== next.contactEmail) changed.push("Kontakt-E-Mail");
  if (before.vatId !== next.vatId) changed.push("USt-IdNr.");
  if (changed.length) await audit(me, "settings", "Betriebsdaten geändert", changed.join(", "));
  updateTag("business");
  revalidatePath("/admin/einstellungen");
  return {
    ok: changed.length ? `Gespeichert: ${changed.join(", ")}. Auf der Website sofort gültig.` : "Keine Änderungen.",
  };
}
