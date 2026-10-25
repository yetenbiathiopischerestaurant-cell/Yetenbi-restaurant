import { describe, expect, it } from "vitest";
import { isoDate } from "@/lib/server/reservations";

// The Postgres driver hands back `date` columns as JS Date objects (local midnight), not as text.
describe("isoDate", () => {
  it("turns a driver Date into YYYY-MM-DD", () => {
    expect(isoDate(new Date(2026, 9, 29))).toBe("2026-10-29");
  });
  it("keeps a text date", () => {
    expect(isoDate("2026-10-29")).toBe("2026-10-29");
    expect(isoDate("2026-10-29T00:00:00.000Z")).toBe("2026-10-29");
  });
});
