import { Suspense } from "react";
import { connection } from "next/server";
import { hasAllergenData, priceText } from "@/lib/menu";
import { requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { readMenu } from "@/lib/server/menu";
import AdminHeader from "../AdminHeader";
import { ONLINE_ORDERING } from "@/lib/features";
import { adminText } from "@/lib/server/admin-lang";
import { moveEntry, toggleAvailable } from "./actions";
import { CategoryForm, DishForm } from "./Forms";

const small =
  "rounded-full border border-cream/25 px-2.5 py-0.5 text-xs text-cream/75 hover:border-gold hover:text-gold-soft disabled:opacity-30";

function Move({
  kind,
  id,
  first,
  last,
  labels,
}: {
  kind: "category" | "item";
  id: string;
  first: boolean;
  last: boolean;
  labels: { up: string; down: string };
}) {
  return (
    <form action={moveEntry} className="flex gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button name="dir" value="up" disabled={first} aria-label={labels.up} className={small}>
        ↑
      </button>
      <button name="dir" value="down" disabled={last} aria-label={labels.down} className={small}>
        ↓
      </button>
    </form>
  );
}

async function Editor() {
  await connection();
  await requireOwner();
  const { t, lang } = await adminText();
  const text = t.menu;
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
  const menu = await readMenu();
  const categories = menu.map((category) => ({
    id: category.id,
    title: category.title[lang],
    drinks: category.drinks,
  }));
  const moveLabels = { up: text.up, down: text.down };
  return (
    <>
      <div className="mt-8 max-w-3xl space-y-3 text-sm leading-relaxed text-cream/70">
        <p>{ONLINE_ORDERING ? text.introOrders : text.intro}</p>
        <p>{ONLINE_ORDERING ? text.allergensRuleOrders : text.allergensRule}</p>
        {!hasAllergenData(menu) && (
          <p className="border-l-2 border-[#f0a080] pl-4 text-[#f0a080]">{text.noAllergens}</p>
        )}
      </div>

      <div className="mt-10 space-y-10">
        {menu.map((category, ci) => (
          <section key={category.id} className="border border-gold/20 bg-ink/40 p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-gold-soft">
                {category.title[lang]} <span className="text-base text-cream/45">({category.items.length})</span>
                {category.drinks && (
                  <span className="ml-3 align-middle text-xs uppercase tracking-[0.2em] text-cream/50">
                    {text.drinks}
                  </span>
                )}
              </h2>
              <Move
                kind="category"
                id={category.id}
                first={ci === 0}
                last={ci === menu.length - 1}
                labels={moveLabels}
              />
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-cream/60 hover:text-cream">{text.editCategory}</summary>
              <div className="mt-4">
                <CategoryForm category={category} />
              </div>
            </details>

            <ul className="mt-5 divide-y divide-gold/10 border-y border-gold/10">
              {category.items.map((d, di) => (
                <li key={d.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={d.available ? "text-cream" : "text-cream/45 line-through"}>
                      <strong className="font-semibold">{d.name[lang]}</strong>{" "}
                      <span className="text-cream/55">· {priceText(d.price)} €</span>
                      {ONLINE_ORDERING && !d.orderable && (
                        <span className="ml-2 rounded-full border border-cream/20 px-2 py-0.5 text-[0.65rem] text-cream/55 no-underline">
                          {text.menuOnly}
                        </span>
                      )}
                      {d.allergens.length > 0 && (
                        <span className="ml-2 text-xs text-cream/45">
                          {text.allergens} {d.allergens.join(", ")}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <form action={toggleAvailable}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="available" value={d.available ? "false" : "true"} />
                        <button
                          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${d.available ? "border border-[#f0a080]/60 text-[#f0a080] hover:bg-[#f0a080] hover:text-ink" : "bg-[#7fcf9c] text-ink"}`}
                        >
                          {d.available ? text.soldOut : text.availableAgain}
                        </button>
                      </form>
                      <Move
                        kind="item"
                        id={d.id}
                        first={di === 0}
                        last={di === category.items.length - 1}
                        labels={moveLabels}
                      />
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-cream/55 hover:text-cream">{text.edit}</summary>
                    <div className="mt-4">
                      <DishForm dish={d} categories={categories} categoryId={category.id} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-gold-soft hover:text-gold">
                {text.addDish(category.title[lang])}
              </summary>
              <div className="mt-4">
                <DishForm categories={categories} categoryId={category.id} />
              </div>
            </details>
          </section>
        ))}
      </div>

      <details className="mt-10 border border-dashed border-gold/30 p-5 md:p-7">
        <summary className="cursor-pointer font-display text-xl text-gold-soft">{text.newCategory}</summary>
        <div className="mt-4">
          <CategoryForm />
        </div>
      </details>
    </>
  );
}

export default async function MenuAdminPage() {
  const { t } = await adminText();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="menu" />
      <Suspense fallback={<p className="mt-12 text-cream/60">{t.common.loading}</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}
