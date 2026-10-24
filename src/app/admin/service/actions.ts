"use server";

import { revalidatePath } from "next/cache";
import { setFeedbackDone } from "@/lib/server/app-feedback";
import { setReleaseFlags } from "@/lib/server/app-releases";
import { audit } from "@/lib/server/audit";
import { adminText } from "@/lib/server/admin-lang";
import { requireOwner } from "@/lib/server/auth";
import { saveTables } from "@/lib/server/service";

export type PlanState = { ok?: string; error?: string } | null;

/**
  The table plan, one table per line: "4", "4 | 6" (name | seats) or "4 | 6 | Terrasse" (name | seats | area).
  Order of the lines = order in the app, which groups the tables by area. Each name once; 1–60 tables.
*/
export async function saveTablePlan(_: PlanState, form: FormData): Promise<PlanState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const text = t.service;
  const lines = String(form.get("plan") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > 60) return { error: text.errors.count };
  const plan: { label: string; area: string; seats: number }[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const [rawLabel, rawSeats, rawArea] = line.split("|").map((part) => part.trim());
    const label = rawLabel.slice(0, 24);
    const seats = rawSeats ? Number(rawSeats) : 4;
    const area = (rawArea ?? "").slice(0, 24);
    if (!label) return { error: text.errors.name(line) };
    if (!Number.isInteger(seats) || seats < 1 || seats > 40) return { error: text.errors.seats(line) };
    if (seen.has(label.toLowerCase())) return { error: text.errors.duplicate(label) };
    seen.add(label.toLowerCase());
    plan.push({ label, area, seats });
  }
  await saveTables(me, plan);
  revalidatePath("/admin/service");
  return { ok: text.planSaved(plan.length) };
}

/** Feedback from the app: ticked off when dealt with (or back). */
export async function feedbackDone(form: FormData) {
  await requireOwner();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await setFeedbackDone(id, form.get("done") === "1");
  revalidatePath("/admin/service");
}

/** Switch a version on or off for the devices, or make it mandatory. */
export async function releaseFlag(form: FormData) {
  const me = await requireOwner();
  const id = Number(form.get("id"));
  const flag = String(form.get("flag"));
  const value = form.get("value") === "1";
  if (!Number.isInteger(id) || (flag !== "published" && flag !== "mandatory")) return;
  await setReleaseFlags(id, { [flag]: value });
  await audit(
    me,
    "service",
    flag === "published"
      ? value
        ? "App-Version freigegeben"
        : "App-Version zurückgezogen"
      : value
        ? "App-Update verpflichtend"
        : "App-Update freiwillig",
    String(form.get("name") ?? ""),
  );
  revalidatePath("/admin/service");
}
