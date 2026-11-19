import type { L, Tag } from "./data";

/*
  The menu as it comes from the database (tables menu_categories / menu_items, edited in /admin → Speisekarte),
  shared by the menu card, the order page and the server. Besides names and prices each item carries what food and
  price law ask for online: allergens (LMIV Annex II, letters A–N), additives that must be named for loose food
  (LMIDV), the volume of drinks (price per litre, PAngV), the deposit (Pfand) and the gluten claim.
*/

export type GlutenClaim = "free" | "noGluten" | "none";
export type DishTag = Exclude<Tag, "glutenfree">;

/** Something a guest can ask for with a dish ("mit Sauce", "leicht angebraten"); price = surcharge, 0 = free. */
export type DishOption = { name: L; price: number };

export type Dish = {
  id: string;
  categoryId: string;
  name: L;
  amharic: string;
  description: L | null;
  price: number;
  tags: DishTag[];
  gluten: GlutenClaim;
  allergens: string[];
  additives: number[];
  volume: number | null;
  deposit: number;
  orderable: boolean;
  available: boolean;
  options: DishOption[];
};

export type MenuCategory = { id: string; title: L; note: L | null; drinks: boolean; items: Dish[] };
export type Menu = MenuCategory[];

export const DISH_TAGS: DishTag[] = ["special", "spicy", "mild", "vegan"];

export const ALLERGENS: { code: string; label: L }[] = [
  { code: "A", label: { de: "Glutenhaltiges Getreide", en: "Cereals containing gluten", am: "ግሉተን ያለው እህል" } },
  { code: "B", label: { de: "Krebstiere", en: "Crustaceans", am: "ክራስቴሽያን" } },
  { code: "C", label: { de: "Eier", en: "Eggs", am: "እንቁላል" } },
  { code: "D", label: { de: "Fisch", en: "Fish", am: "ዓሣ" } },
  { code: "E", label: { de: "Erdnüsse", en: "Peanuts", am: "ኦቾሎኒ" } },
  { code: "F", label: { de: "Soja", en: "Soy", am: "አኩሪ አተር" } },
  { code: "G", label: { de: "Milch (inkl. Laktose)", en: "Milk (incl. lactose)", am: "ወተት" } },
  { code: "H", label: { de: "Schalenfrüchte (Nüsse)", en: "Tree nuts", am: "ለውዝ" } },
  { code: "I", label: { de: "Sellerie", en: "Celery", am: "ሴሌሪ" } },
  { code: "J", label: { de: "Senf", en: "Mustard", am: "ሰናፍጭ" } },
  { code: "K", label: { de: "Sesam", en: "Sesame", am: "ሰሊጥ" } },
  { code: "L", label: { de: "Schwefeldioxid / Sulfite", en: "Sulphur dioxide / sulphites", am: "ሰልፋይት" } },
  { code: "M", label: { de: "Lupinen", en: "Lupin", am: "ሉፒን" } },
  { code: "N", label: { de: "Weichtiere", en: "Molluscs", am: "ሞለስክ" } },
];

export const ADDITIVES: { code: number; label: L }[] = [
  { code: 1, label: { de: "mit Farbstoff", en: "with colouring", am: "ቀለም ያለው" } },
  { code: 2, label: { de: "mit Konservierungsstoff", en: "with preservative", am: "ማቆያ ያለው" } },
  { code: 3, label: { de: "mit Antioxidationsmittel", en: "with antioxidant", am: "አንቲኦክሲዳንት ያለው" } },
  { code: 4, label: { de: "mit Geschmacksverstärker", en: "with flavour enhancer", am: "ጣዕም አሻሻይ ያለው" } },
  { code: 5, label: { de: "geschwefelt", en: "sulphured", am: "ሰልፈር የተደረገበት" } },
  { code: 6, label: { de: "geschwärzt", en: "blackened", am: "የጠቆረ" } },
  { code: 7, label: { de: "gewachst", en: "waxed", am: "ሰም የተቀባ" } },
  { code: 8, label: { de: "mit Phosphat", en: "with phosphate", am: "ፎስፌት ያለው" } },
  { code: 9, label: { de: "mit Süßungsmittel", en: "with sweetener", am: "ጣፋጭ ማድረጊያ ያለው" } },
  {
    code: 10,
    label: { de: "enthält eine Phenylalaninquelle", en: "contains a source of phenylalanine", am: "ፌኒላላኒን ያለው" },
  },
  { code: 11, label: { de: "koffeinhaltig", en: "contains caffeine", am: "ካፌይን ያለው" } },
  { code: 12, label: { de: "chininhaltig", en: "contains quinine", am: "ኪኒን ያለው" } },
];

/** Dishes that can be ordered online right now, by id (prices and names for the order and the server). */
export const catalogOf = (menu: Menu) =>
  new Map(
    menu.flatMap((category) =>
      // price 0 = not set yet, so not orderable
      category.items
        .filter((dish) => dish.orderable && dish.available && dish.price > 0)
        .map((dish) => [dish.id, dish] as const),
    ),
  );
export type Catalog = ReturnType<typeof catalogOf>;

/** The tags to show, including the gluten wording. */
export const tagsOf = (dish: Dish): (DishTag | "glutenfree" | "noGluten")[] =>
  dish.gluten === "free"
    ? [...dish.tags, "glutenfree"]
    : dish.gluten === "noGluten"
      ? [...dish.tags, "noGluten"]
      : dish.tags;

/** Whether any allergen or additive has been entered at all (switches the menu's note and shows the legend). */
export const hasAllergenData = (menu: Menu) =>
  menu.some((category) => category.items.some((dish) => dish.allergens.length || dish.additives.length));

/** "18,00" style price for the menu card. */
/** 12.5 → "12,50" (German price format without the € sign). */
export const priceText = (amount: number) => amount.toFixed(2).replace(".", ",");
