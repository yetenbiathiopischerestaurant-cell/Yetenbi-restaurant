"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/server/audit";
import { adminText } from "@/lib/server/admin-lang";
import { requireOwner } from "@/lib/server/auth";
import { decodeKey, encodeKey, getCustomer, saveNote } from "@/lib/server/customers";
import { blockPhone } from "@/lib/server/order-guard";

type NoteState = { ok?: string; error?: string } | null;

/** The team's note about a guest (e.g. "always call before delivery"; no health data, see NoteForm). */
export async function saveCustomerNote(_: NoteState, form: FormData): Promise<NoteState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const key = decodeKey(String(form.get("key") ?? ""));
  const note = String(form.get("note") ?? "")
    .slice(0, 1000)
    .trim();
  if (!key || !(await getCustomer(key))) return { error: t.customers.notFound };
  await saveNote(key, note, me.name);
  await audit(me, "customers", note ? "Notiz gespeichert" : "Notiz gelöscht", key);
  revalidatePath(`/admin/kunden/${encodeKey(key)}`);
  return { ok: t.customers.saved };
}

/** Blocks the guest's phone number for online orders (lifted again in Bestellungen → Gesperrte Gäste). */
export async function blockCustomer(form: FormData) {
  const me = await requireOwner();
  const key = decodeKey(String(form.get("key") ?? ""));
  const customer = key ? await getCustomer(key) : null;
  if (!customer?.phone) return;
  await blockPhone(customer.phone, `Gesperrt in Kunden (${me.name})`);
  await audit(me, "customers", "Gast gesperrt", customer.phone);
  revalidatePath(`/admin/kunden/${encodeKey(key)}`);
}
