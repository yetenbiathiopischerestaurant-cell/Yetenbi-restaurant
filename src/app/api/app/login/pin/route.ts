import { APP_ROLES, appUser, createAppToken, revokeAppToken } from "@/lib/server/app-auth";
import { audit } from "@/lib/server/audit";
import { findUserById, verifyPin } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { isLimited, recordHit, visitorKey } from "@/lib/server/rate-limit";

const PIN_TRIES = { max: 5, minutes: 15 };
// A 4-digit PIN has only 10,000 values: at most 10 wrong tries a day, so guessing one would take years.
const PIN_TRIES_DAY = { max: 10, minutes: 24 * 60 };

/*
  POST /api/app/login/pin { userId, pin } -> { token, user }
  Switching waiters on a phone or tablet that is already signed in: tap your name, type your PIN (set in
  /admin/team). Only works from a signed-in app; 5 wrong PINs lock that person's PIN for 15 minutes, 10 in a day
  until the next day.
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  if (!(await appUser(request))) return Response.json({ code: "unauthorized" }, { status: 401 });
  let input: { userId?: unknown; pin?: unknown };
  try {
    input = await request.json();
  } catch {
    return Response.json({ code: "invalid_json" }, { status: 400 });
  }
  const userId = Number(input.userId);
  const pin = String(input.pin ?? "");
  if (!Number.isSafeInteger(userId) || userId <= 0 || !/^\d{4,6}$/.test(pin))
    return Response.json({ code: "pin_wrong" }, { status: 401 });
  const ip = await visitorKey(request);
  if (
    (await isLimited("pin-user", String(userId), PIN_TRIES)) ||
    (await isLimited("pin-user", String(userId), PIN_TRIES_DAY)) ||
    (await isLimited("pin-ip", ip, { max: 20, minutes: 15 }))
  )
    return Response.json({ code: "too_many" }, { status: 429 });

  const user = await findUserById(userId);
  if (!user || !APP_ROLES.includes(user.role) || !(await verifyPin(userId, pin))) {
    await Promise.all([recordHit("pin-user", String(userId)), recordHit("pin-ip", ip)]);
    return Response.json({ code: "pin_wrong" }, { status: 401 });
  }
  // The phone's previous sign-in ends; the new person's begins.
  await revokeAppToken(request);
  const token = await createAppToken(user.id);
  await audit(user, "login", "In der Service-App übernommen (PIN)", user.email);
  return Response.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
  });
}
