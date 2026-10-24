"use server";

import { revalidatePath } from "next/cache";
import {
  createUser,
  findUserByEmail,
  findUserById,
  requireOwner,
  setPassword,
  setPin,
  setRole,
} from "@/lib/server/auth";
import { ONLINE_ORDERING } from "@/lib/features";
import type { Role } from "@/lib/roles";
import { isEmail } from "@/lib/validate";
import { audit } from "@/lib/server/audit";
import { adminText } from "@/lib/server/admin-lang";

export type TeamState = { ok?: string; error?: string } | null;

// Drivers can only be given the role while online ordering is on.
const STAFF: Role[] = ONLINE_ORDERING ? ["owner", "kitchen", "driver", "service"] : ["owner", "kitchen", "service"];
const asRole = (v: FormDataEntryValue | null) => (STAFF.includes(String(v) as Role) ? (String(v) as Role) : null);

/**
  Creates a login for a team member (email = login id, starting password set by the owner).
  An existing guest account with that email gets the role instead, keeping its password.
*/
export async function addStaff(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const text = t.team;
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = asRole(form.get("role"));
  if (!role) return { error: text.errors.role };
  if (!isEmail(email)) return { error: text.errors.email };
  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.role !== "guest") return { error: text.errors.alreadyTeam };
    // Anyone can sign up with any email address. If this guest account never proved it owns the address,
    // whoever registered it must not get team rights with their own password: it gets the starting password instead.
    if (!existing.email_verified) {
      if (password.length < 10 || password.length > 200) {
        return { error: text.errors.unverified };
      }
      await setPassword(Number(existing.id), password);
    }
    await setRole(Number(existing.id), role);
    await audit(me, "team", `Rolle vergeben: ${role}`, email);
    revalidatePath("/admin/team");
    return { ok: text.joined(existing.name, Boolean(existing.email_verified)) };
  }
  if (name.length < 2 || name.length > 80) return { error: text.errors.name };
  if (phone && !/^[+\d][\d\s()/-]{5,24}$/.test(phone)) return { error: text.errors.phone };
  if (password.length < 10 || password.length > 200) return { error: text.errors.startPassword };
  await createUser({ name, email, phone, password, locale: "de", role });
  await audit(me, "team", `Konto angelegt: ${role}`, email);
  revalidatePath("/admin/team");
  return { ok: text.created(name, email) };
}

/** Changes a team member's role, or removes them from the team ("guest"). Owners cannot change their own role. */
export async function changeRole(form: FormData) {
  const me = await requireOwner();
  const id = Number(form.get("id"));
  const role = form.get("role") === "guest" ? "guest" : asRole(form.get("role"));
  if (!Number.isInteger(id) || id === me.id || !role) return;
  const who = await findUserById(id);
  await setRole(id, role);
  await audit(
    me,
    "team",
    role === "guest" ? "Aus dem Team entfernt" : `Rolle geändert: ${who?.role} → ${role}`,
    who?.email ?? `#${id}`,
  );
  revalidatePath("/admin/team");
}

/** Sets a new password for a team member (e.g. forgotten); they are signed out everywhere. */
export async function resetStaffPassword(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const id = Number(form.get("id"));
  const password = String(form.get("password") ?? "");
  const user = Number.isInteger(id) ? await findUserById(id) : null;
  if (!user || user.role === "guest") return { error: t.team.errors.notFound };
  if (password.length < 10 || password.length > 200) return { error: t.team.errors.min10 };
  await setPassword(id, password);
  await audit(me, "team", "Passwort neu gesetzt", user.email);
  return { ok: t.team.passwordSet };
}

/** Sets or removes the PIN a team member uses to take over a shared phone or tablet in the service app. */
export async function setStaffPin(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const id = Number(form.get("id"));
  const pin = String(form.get("pin") ?? "").trim();
  const user = Number.isInteger(id) ? await findUserById(id) : null;
  if (!user || (user.role !== "service" && user.role !== "owner")) return { error: t.team.errors.pinRoles };
  if (form.get("remove") === "1") {
    await setPin(id, null);
    await audit(me, "team", "App-PIN entfernt", user.email);
    revalidatePath("/admin/team");
    return { ok: t.team.pinRemoved };
  }
  if (!/^\d{4,6}$/.test(pin)) return { error: t.team.errors.pinDigits };
  if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin))
    return { error: t.team.errors.pinEasy };
  await setPin(id, pin);
  await audit(me, "team", "App-PIN gesetzt", user.email);
  revalidatePath("/admin/team");
  return { ok: t.team.pinSet };
}
