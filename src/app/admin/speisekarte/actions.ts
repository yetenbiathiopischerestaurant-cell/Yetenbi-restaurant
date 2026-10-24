"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { L } from "@/lib/data";
import { ADDITIVES, ALLERGENS, DISH_TAGS, type GlutenClaim } from "@/lib/menu";
import { requireOwner } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { adminText } from "@/lib/server/admin-lang";
import {
  createCategory,
  createDish,
  deleteCategory,
  deleteDish,
  move,
  readMenu,
  setAvailable,
  updateCategory,
  updateDish,
  type DishInput,
} from "@/lib/server/menu";

/* Create, edit, delete and reorder the menu. Every change refreshes the website's cached menu ("menu" tag). */

export type MenuState = { ok?: string; error?: string } | null;

const ALLERGEN_CODES = new Set(ALLERGENS.map((allergen) => allergen.code));
const ADDITIVE_NUMBERS = new Set(ADDITIVES.map((additive) => additive.code));
const GLUTEN_CLAIMS: GlutenClaim[] = ["free", "noGluten", "none"];

function readText(form: FormData, key: string, maxLength: number) {
  return String(form.get(key) ?? "")
    .trim()
    .slice(0, maxLength);
}

/** A number typed with a comma or a dot. Empty → null, invalid or negative → NaN. */
function readNumber(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "")
    .replace(",", ".")
    .trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : NaN;
}

/** A text in three languages. German is required; English and Amharic fall back to it when left empty. */
function readTranslated(form: FormData, key: string, maxLength: number): L | null {
  const de = readText(form, `${key}_de`, maxLength);
  if (!de) return null;
  return {
    de,
    en: readText(form, `${key}_en`, maxLength) || de,
    am: readText(form, `${key}_am`, maxLength) || de,
  };
}

async function findDish(id: string) {
  return (await readMenu()).flatMap((category) => category.items).find((dish) => dish.id === id);
}

function refresh() {
  updateTag("menu");
  revalidatePath("/admin/speisekarte");
}

/* ---------- categories ---------- */

export async function saveCategory(_: MenuState, form: FormData): Promise<MenuState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const id = readText(form, "id", 60);
  const title = readTranslated(form, "title", 60);
  if (!title || title.de.length < 2) return { error: t.menu.errors.name };
  const data = { title, note: readTranslated(form, "note", 400), drinks: form.get("drinks") === "on" };
  if (id) await updateCategory(id, data);
  else await createCategory(data);
  await audit(me, "menu", id ? "Kategorie geändert" : "Kategorie angelegt", title.de);
  refresh();
  return { ok: id ? t.menu.categorySaved : t.menu.categoryCreated };
}

export async function removeCategory(_: MenuState, form: FormData): Promise<MenuState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const catId = readText(form, "id", 60);
  if (!(await deleteCategory(catId))) return { error: t.menu.errors.categoryNotEmpty };
  await audit(me, "menu", "Kategorie gelöscht", catId);
  refresh();
  return { ok: t.menu.categoryDeleted };
}

/* ---------- dishes ---------- */

export async function saveDish(_: MenuState, form: FormData): Promise<MenuState> {
  const me = await requireOwner();
  const id = readText(form, "id", 60);
  const { t } = await adminText();
  const errors = t.menu.errors;
  const categoryId = readText(form, "categoryId", 60);
  const category = (await readMenu()).find((candidate) => candidate.id === categoryId);
  if (!category) return { error: errors.pickCategory };
  const name = readTranslated(form, "name", 80);
  if (!name || name.de.length < 2) return { error: errors.name };
  const price = readNumber(form, "price");
  if (price === null || Number.isNaN(price) || price > 999) return { error: errors.price };
  const volume = readNumber(form, "volume");
  const deposit = readNumber(form, "deposit");
  if (Number.isNaN(volume) || (volume !== null && volume > 5)) return { error: errors.volume };
  if (Number.isNaN(deposit) || (deposit !== null && deposit > 5)) return { error: errors.deposit };

  const dish: DishInput = {
    categoryId,
    name,
    amharic: readText(form, "amharic", 80),
    description: readTranslated(form, "description", 400),
    price: Math.round(price * 100) / 100,
    tags: form
      .getAll("tags")
      .map(String)
      .filter((tag): tag is DishInput["tags"][number] => (DISH_TAGS as string[]).includes(tag)),
    gluten: GLUTEN_CLAIMS.find((claim) => claim === form.get("gluten")) ?? "none",
    allergens: form
      .getAll("allergens")
      .map(String)
      .filter((code) => ALLERGEN_CODES.has(code))
      .sort(),
    additives: form
      .getAll("additives")
      .map(Number)
      .filter((number) => ADDITIVE_NUMBERS.has(number))
      .sort((a, b) => a - b),
    volume: category.drinks && volume ? Math.round(volume * 1000) / 1000 : null,
    deposit: category.drinks && deposit ? Math.round(deposit * 100) / 100 : 0,
    orderable: form.get("orderable") === "on",
    available: form.get("available") === "on",
  };
  const before = id ? await findDish(id) : undefined;
  if (id) await updateDish(id, dish);
  else await createDish(dish);

  let action = id ? "Gericht geändert" : "Gericht angelegt";
  if (before && before.price !== dish.price) {
    action = `Preis geändert: ${before.price.toFixed(2)} → ${dish.price.toFixed(2)} €`;
  }
  await audit(me, "menu", action, dish.name.de);
  refresh();
  return { ok: id ? t.menu.dishSaved : t.menu.dishCreated };
}

export async function removeDish(_: MenuState, form: FormData): Promise<MenuState> {
  const me = await requireOwner();
  const { t } = await adminText();
  const dishId = readText(form, "id", 60);
  const gone = await findDish(dishId);
  await deleteDish(dishId);
  await audit(me, "menu", "Gericht gelöscht", gone?.name.de ?? dishId);
  refresh();
  return { ok: t.menu.deleted };
}

/** Quick switch: sold out today / available again. */
export async function toggleAvailable(form: FormData) {
  const me = await requireOwner();
  const dishId = readText(form, "id", 60);
  const available = form.get("available") === "true";
  await setAvailable(dishId, available);
  const dish = await findDish(dishId);
  await audit(me, "menu", available ? "Wieder verfügbar" : "Ausverkauft gemeldet", dish?.name.de ?? dishId);
  refresh();
}

export async function moveEntry(form: FormData) {
  await requireOwner();
  const kind = form.get("kind") === "category" ? "category" : "item";
  await move(kind, readText(form, "id", 60), form.get("dir") === "up" ? -1 : 1);
  refresh();
}
