// Brings the menu in the database at DATABASE_URL in line with db/menu-seed.mts: categories and dishes in the
// card's order, names and descriptions from the file. For dishes that already exist (same id) it keeps what was
// entered in /admin: price, allergens, additives, volume, deposit, orderable and sold-out (options too, unless the
// file lists some for the dish). New dishes get the
// file's price (0,00 = not set yet). Dishes and categories no longer on the card are removed.
// Usage: npm run menu:sync            (shows what would change)
//        npm run menu:sync -- --apply (writes it)
// The website picks it up once the menu cache is refreshed (any save in /admin → Speisekarte, or a deploy).
import { neon } from "@neondatabase/serverless";
import { seedMenu } from "../db/menu-seed.mts";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env.local).");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const sql = neon(process.env.DATABASE_URL);
const json = (value) => (value ? JSON.stringify(value) : null);

const existing = new Map((await sql`select id, name from menu_items`).map((row) => [row.id, row]));
const keepIds = new Set(seedMenu.flatMap((category) => category.items.map((item) => item.id)));
const keepCategories = new Set(seedMenu.map((category) => category.id));
const removed = [...existing.values()].filter((row) => !keepIds.has(row.id));

for (const [c, category] of seedMenu.entries()) {
  console.log(`${category.title.de}`);
  if (apply) {
    await sql`
      insert into menu_categories (id, title, note, drinks, position)
      values (${category.id}, ${JSON.stringify(category.title)}::jsonb, ${json(category.note)}::jsonb, ${Boolean(category.drinks)}, ${c})
      on conflict (id) do update set title = excluded.title, note = excluded.note, drinks = excluded.drinks, position = excluded.position
    `;
  }
  for (const [i, item] of category.items.entries()) {
    const tags = (item.tags ?? []).filter((tag) => tag !== "glutenfree");
    const gluten = item.tags?.includes("glutenfree") ? "free" : "none";
    const known = existing.has(item.id);
    const options = (item.options ?? []).map((option) => ({
      name: option.name,
      price: Number(option.price.replace(",", ".")),
    }));
    console.log(`  ${known ? "update" : "new   "} ${item.name.de}`);
    if (!apply) continue;
    if (known) {
      await sql`
        update menu_items set category_id = ${category.id}, name = ${JSON.stringify(item.name)}::jsonb, amharic = ${item.amharic ?? ""},
          description = ${json(item.description)}::jsonb, tags = ${tags}, gluten = ${gluten}, position = ${i}, updated_at = now(),
          options = case when ${options.length > 0} then ${JSON.stringify(options)}::jsonb else options end
        where id = ${item.id}
      `;
    } else {
      await sql`
        insert into menu_items (id, category_id, name, amharic, description, price, tags, gluten, orderable, options, position)
        values (${item.id}, ${category.id}, ${JSON.stringify(item.name)}::jsonb, ${item.amharic ?? ""}, ${json(item.description)}::jsonb,
                ${Number(item.price.replace(",", "."))}, ${tags}, ${gluten}, ${!item.cardOnly}, ${JSON.stringify(options)}::jsonb, ${i})
      `;
    }
  }
}
for (const row of removed) {
  console.log(`remove ${row.name.de}`);
  if (apply) await sql`delete from menu_items where id = ${row.id}`;
}
if (apply) {
  const categories = await sql`select id from menu_categories`;
  for (const { id } of categories) if (!keepCategories.has(id)) await sql`delete from menu_categories where id = ${id}`;
}
console.log(apply ? "Menu updated." : "Dry run. Add -- --apply to write it.");
