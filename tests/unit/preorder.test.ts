import { describe, expect, it } from "vitest";
import { preorderFrom, preorderTotal, preorderText, type Dish, type Menu } from "@/lib/menu";

const L = (de: string) => ({ de, en: de, am: de });
const dish = (id: string, price: number, changes: Partial<Dish> = {}): Dish => ({
  id,
  categoryId: "c",
  name: L(id),
  amharic: "",
  description: null,
  price,
  tags: [],
  gluten: "none",
  allergens: [],
  additives: [],
  volume: null,
  deposit: 0,
  orderable: true,
  available: true,
  options: [],
  ...changes,
});
const menu: Menu = [
  {
    id: "c",
    title: L("Tab"),
    note: null,
    drinks: false,
    items: [
      dish("sambusa", 2.5, {
        options: [
          { name: L("mit Sauce"), price: 0 },
          { name: L("extra scharf"), price: 1 },
        ],
      }),
      dish("doro", 0),
      dish("gone", 5, { available: false }),
    ],
  },
];

describe("preorderFrom", () => {
  it("keeps known dishes with name and price from the menu, not from the request", () => {
    const items = preorderFrom(menu, [{ id: "sambusa", qty: 2, options: [1], price: 0, name: "hack" }]);
    expect(items).toEqual([
      { id: "sambusa", name: L("sambusa"), qty: 2, price: 2.5, options: [{ name: L("extra scharf"), price: 1 }] },
    ]);
  });

  it("drops unknown or sold-out dishes, bad amounts and options the dish does not have", () => {
    const items = preorderFrom(menu, [
      { id: "nope", qty: 1, options: [] },
      { id: "gone", qty: 1, options: [] },
      { id: "sambusa", qty: 0, options: [] },
      { id: "sambusa", qty: -3, options: [] },
      { id: "sambusa", qty: 1, options: [7, -1, 0, 0] },
      "junk",
      null,
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].options).toEqual([{ name: L("mit Sauce"), price: 0 }]);
  });

  it("merges the same dish with the same options and caps the amount", () => {
    const items = preorderFrom(menu, [
      { id: "sambusa", qty: 15, options: [] },
      { id: "sambusa", qty: 15, options: [] },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(20);
  });

  it("accepts nothing that is not a list", () => {
    expect(preorderFrom(menu, "sambusa")).toEqual([]);
    expect(preorderFrom(menu, undefined)).toEqual([]);
  });
});

describe("preorderTotal", () => {
  it("adds surcharges and leaves dishes without a price out of the sum", () => {
    const items = preorderFrom(menu, [
      { id: "sambusa", qty: 2, options: [1] },
      { id: "doro", qty: 1, options: [] },
    ]);
    expect(preorderTotal(items)).toEqual({ total: 7, unpriced: true });
    expect(preorderText(items[0], "de")).toBe("2 × sambusa (extra scharf)");
  });
});
