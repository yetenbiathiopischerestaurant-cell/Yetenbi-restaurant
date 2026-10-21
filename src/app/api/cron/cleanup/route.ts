import { timingSafeEqual } from "node:crypto";
import { hasDatabase } from "@/lib/server/db";
import { purgeRateHits } from "@/lib/server/rate-limit";
import { purgeOld } from "@/lib/server/reservations";
import { purgeExpiredAuth } from "@/lib/server/auth";
import { purgeOldOrders } from "@/lib/server/orders";
import { purgeGuardData } from "@/lib/server/order-guard";
import { purgeAudit } from "@/lib/server/audit";
import { purgeOrphanNotes } from "@/lib/server/customers";
import { purgeServiceData } from "@/lib/server/service";

/* Daily data-retention job (Vercel Cron, see vercel.json): removes reservations and orders after 180 days,
   expired sessions, device hashes, blocks, attempt counters, old audit entries, notes about guests no longer
   stored, app feedback and crash reports after 90 days, and finished table bills after 10 years. */
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasDatabase()) return Response.json({ removed: 0 });
  const removed = await purgeOld();
  await purgeExpiredAuth();
  await purgeOldOrders();
  await purgeGuardData();
  await purgeRateHits();
  await purgeAudit();
  await purgeOrphanNotes();
  await purgeServiceData();
  return Response.json({ removed });
}
