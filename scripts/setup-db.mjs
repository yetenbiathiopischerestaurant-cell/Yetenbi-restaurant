// Creates or updates the tables in the database at DATABASE_URL (see db/migrations) and, the first time,
// copies the starting menu in. Usage: npm run db:setup   (reads .env.local if present; safe to run repeatedly)
import { neon } from "@neondatabase/serverless";
import { migrate } from "../db/migrate.mjs";
import { seedMenu } from "../db/menu-seed.mts";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env.local).");
  process.exit(1);
}
await migrate(process.env.DATABASE_URL);
const sql = neon(process.env.DATABASE_URL);

// Menu: only when the menu tables are still empty, so edits made in /admin are never overwritten.
const [{ n }] = await sql`select count(*)::int as n from menu_categories`;
if (n === 0) {
  // Details entered earlier in /admin (stored as settings 'menu_info' before the menu moved to the database).
  const [old] = await sql`select value from settings where key = 'menu_info'`;
  const info = old?.value ?? {};
  for (const [c, category] of seedMenu.entries()) {
    const drinks = Boolean(category.drinks);
    await sql`insert into menu_categories (id, title, note, drinks, position)
              values (${category.id}, ${JSON.stringify(category.title)}::jsonb, ${category.note ? JSON.stringify(category.note) : null}::jsonb, ${drinks}, ${c})`;
    for (const [i, item] of category.items.entries()) {
      const id = item.id;
      const d = info[id] ?? {};
      const glutenTag = item.tags?.includes("glutenfree");
      const gluten = d.gluten && d.gluten !== "keep" ? d.gluten : glutenTag ? "free" : "none";
      await sql`insert into menu_items (id, category_id, name, amharic, description, price, tags, gluten, allergens, additives, volume, deposit, orderable, options, position)
        values (${id}, ${category.id}, ${JSON.stringify(item.name)}::jsonb, ${item.amharic ?? ""}, ${item.description ? JSON.stringify(item.description) : null}::jsonb,
                ${Number(item.price.replace(",", "."))}, ${(item.tags ?? []).filter((t) => t !== "glutenfree")}, ${gluten},
                ${d.allergens ?? []}, ${d.additives ?? []}, ${d.volume ?? null}, ${d.deposit ?? 0},
                ${!item.cardOnly},
                ${JSON.stringify((item.options ?? []).map((o) => ({ name: o.name, price: Number(o.price.replace(",", ".")) })))}::jsonb, ${i})`;
    }
  }
}
