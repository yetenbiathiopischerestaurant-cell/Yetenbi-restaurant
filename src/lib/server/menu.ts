import "server-only";
import { randomBytes } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import type { L } from "@/lib/data";
import type { Dish, GlutenClaim, Menu } from "@/lib/menu";
import { db, hasDatabase } from "./db";

/* The menu in Neon (menu_categories, menu_items). Pages read the cached copy; every change refreshes it ("menu" tag). */

type Row = Record<string, unknown>;

const toDish = (row: Row): Dish => ({
  id: String(row.id),
  categoryId: String(row.category_id),
  name: row.name as L,
  amharic: String(row.amharic ?? ""),
  description: (row.description as L | null) ?? null,
  price: Number(row.price),
  tags: (row.tags as Dish["tags"]) ?? [],
  gluten: row.gluten as GlutenClaim,
  allergens: (row.allergens as string[]) ?? [],
  additives: ((row.additives as number[]) ?? []).map(Number),
  volume: row.volume == null ? null : Number(row.volume),
  deposit: Number(row.deposit ?? 0),
  orderable: Boolean(row.orderable),
  available: Boolean(row.available),
  options: ((row.options as Dish["options"]) ?? []).map((option) => ({
    name: option.name,
    price: Number(option.price),
  })),
});

/** The whole menu, categories and items in their order. Uncached; for the admin pages. */
export async function readMenu(): Promise<Menu> {
  const [categoryRows, dishRows] = (await Promise.all([
    db()`select * from menu_categories order by position, id`,
    db()`select * from menu_items order by position, id`,
  ])) as [Row[], Row[]];
  const dishes = dishRows.map(toDish);
  return categoryRows.map((category) => ({
    id: String(category.id),
    title: category.title as L,
    note: (category.note as L | null) ?? null,
    drinks: Boolean(category.drinks),
    items: dishes.filter((dish) => dish.categoryId === category.id),
  }));
}

/** The menu for the website, cached until it is edited. */
export async function getMenu(): Promise<Menu> {
  "use cache";
  cacheTag("menu");
  cacheLife("max");
  if (!hasDatabase()) return [];
  try {
    return await readMenu();
  } catch (error) {
    console.error("Could not load the menu", error);
    return [];
  }
}

/* ---------- categories ---------- */

const jsonOrNull = (value: L | null) => (value ? JSON.stringify(value) : null);

/** A readable id for a new category, e.g. "Vorspeisen" → "vorspeisen" (umlauts become "a-", "o-", …). */
const slug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "kategorie";

type CategoryInput = { title: L; note: L | null; drinks: boolean };

export async function createCategory(category: CategoryInput) {
  const base = slug(category.title.de);
  const [taken] = (await db()`select 1 from menu_categories where id = ${base}`) as Row[];
  const id = taken ? `${base}-${randomBytes(2).toString("hex")}` : base;
  await db()`
    insert into menu_categories (id, title, note, drinks, position)
    values (${id}, ${JSON.stringify(category.title)}::jsonb, ${jsonOrNull(category.note)}::jsonb, ${category.drinks},
            (select coalesce(max(position), -1) + 1 from menu_categories))
  `;
  return id;
}

export async function updateCategory(id: string, category: CategoryInput) {
  await db()`
    update menu_categories
    set title = ${JSON.stringify(category.title)}::jsonb, note = ${jsonOrNull(category.note)}::jsonb, drinks = ${category.drinks}
    where id = ${id}
  `;
}

/** Only empty categories can be deleted; returns false otherwise. */
export async function deleteCategory(id: string) {
  const [{ dishes }] = (await db()`select count(*)::int as dishes from menu_items where category_id = ${id}`) as {
    dishes: number;
  }[];
  if (dishes > 0) return false;
  await db()`delete from menu_categories where id = ${id}`;
  return true;
}

/* ---------- items ---------- */

export type DishInput = Omit<Dish, "id" | "categoryId"> & { categoryId: string };

export async function createDish(dish: DishInput) {
  const id = `i-${randomBytes(4).toString("hex")}`;
  await db()`
    insert into menu_items (id, category_id, name, amharic, description, price, tags, gluten, allergens, additives, volume, deposit, orderable, available, options, position)
    values (${id}, ${dish.categoryId}, ${JSON.stringify(dish.name)}::jsonb, ${dish.amharic}, ${jsonOrNull(dish.description)}::jsonb, ${dish.price},
            ${dish.tags}, ${dish.gluten}, ${dish.allergens}, ${dish.additives}, ${dish.volume}, ${dish.deposit}, ${dish.orderable}, ${dish.available},
            ${JSON.stringify(dish.options)}::jsonb,
            (select coalesce(max(position), -1) + 1 from menu_items where category_id = ${dish.categoryId}))
  `;
  return id;
}

export async function updateDish(id: string, dish: DishInput) {
  await db()`
    update menu_items set
      category_id = ${dish.categoryId}, name = ${JSON.stringify(dish.name)}::jsonb, amharic = ${dish.amharic},
      description = ${jsonOrNull(dish.description)}::jsonb, price = ${dish.price}, tags = ${dish.tags}, gluten = ${dish.gluten},
      allergens = ${dish.allergens}, additives = ${dish.additives}, volume = ${dish.volume}, deposit = ${dish.deposit},
      orderable = ${dish.orderable}, available = ${dish.available}, options = ${JSON.stringify(dish.options)}::jsonb,
      updated_at = now()
    where id = ${id}
  `;
}

export async function deleteDish(id: string) {
  await db()`delete from menu_items where id = ${id}`;
}

export async function setAvailable(id: string, available: boolean) {
  await db()`update menu_items set available = ${available}, updated_at = now() where id = ${id}`;
}

/** Moves a category or an item one place up or down (swaps positions with its neighbour). */
export async function move(kind: "category" | "item", id: string, direction: -1 | 1) {
  const rows = (
    kind === "category"
      ? await db()`select id, position from menu_categories order by position, id`
      : await db()`select id, position from menu_items where category_id = (select category_id from menu_items where id = ${id}) order by position, id`
  ) as { id: string; position: number }[];
  const from = rows.findIndex((row) => row.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= rows.length) return;
  // Renumber the whole list, so equal or missing positions never get stuck.
  const order = rows.map((row) => row.id);
  [order[from], order[to]] = [order[to], order[from]];
  for (const [position, rowId] of order.entries()) {
    if (kind === "category") await db()`update menu_categories set position = ${position} where id = ${rowId}`;
    else await db()`update menu_items set position = ${position} where id = ${rowId}`;
  }
}
