import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/server/reports";
import { safeNext } from "@/lib/validate";

describe("csvCell (Excel export)", () => {
  it("keeps formulas typed by guests from running in Excel", () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(csvCell("+49 176 1234")).toBe("'+49 176 1234");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
  });
  it("leaves normal text and amounts alone", () => {
    expect(csvCell("Kitfo")).toBe("Kitfo");
    expect(csvCell(-12.5)).toBe("-12,50");
    expect(csvCell("a;b")).toBe('"a;b"');
  });
});

describe("safeNext (where to go after sign-in)", () => {
  it("allows paths on this site", () => {
    expect(safeNext("/#reservieren")).toBe("/#reservieren");
    expect(safeNext("/profil")).toBe("/profil");
  });
  it("refuses other sites", () => {
    for (const bad of ["https://evil.com", "//evil.com", String.raw`/\evil.com`, "javascript:alert(1)", "/\u0000x"])
      expect(safeNext(bad)).toBe("");
  });
});
