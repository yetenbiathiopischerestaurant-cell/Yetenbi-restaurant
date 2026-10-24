import { ONLINE_ORDERING } from "./features";

/**
  Account roles. Owners run /admin, kitchen staff see /kueche, drivers see /lieferung (only while online ordering is
  on), guests their profile. Service staff work only in the Android app, which is the restaurant's internal tool: the
  website has no page for it, so on the website they are treated like guests.
*/
export type Role = "guest" | "owner" | "kitchen" | "driver" | "service";

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Gast",
  owner: "Verwaltung",
  kitchen: "Küche",
  driver: "Lieferung",
  service: "Service",
};

/** The team screen a role has on the website, or null (guests, service staff, drivers while delivery is off). */
export const staffScreen = (role: Role): "owner" | "kitchen" | "driver" | null =>
  role === "owner" || role === "kitchen" ? role : role === "driver" && ONLINE_ORDERING ? "driver" : null;

/** Where a role lands after signing in. */
export const homeFor = (role: Role) => {
  const screen = staffScreen(role);
  return screen ? { owner: "/admin", kitchen: "/kueche", driver: "/lieferung" }[screen] : "/profil";
};
