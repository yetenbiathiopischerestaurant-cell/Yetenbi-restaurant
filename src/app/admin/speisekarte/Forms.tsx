"use client";

import { useActionState } from "react";
import { ADDITIVES, ALLERGENS, DISH_TAGS, type Dish, type MenuCategory } from "@/lib/menu";
import { useAdminText } from "@/components/admin/AdminLang";
import { ONLINE_ORDERING } from "@/lib/features";
import { removeCategory, removeDish, saveCategory, saveDish, type MenuState } from "./actions";

const field =
  "w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-1.5 pt-1 text-base text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none [color-scheme:dark]";
const label = "text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold";
const chip =
  "flex cursor-pointer items-center gap-1.5 rounded border border-cream/15 px-2 py-1 text-xs text-cream/80 has-[:checked]:border-gold has-[:checked]:bg-gold/15 has-[:checked]:text-gold-soft";

function Message({ state }: { state: MenuState }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm text-[#f0a080]">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="text-sm text-[#9fe0b6]">
        {state.ok}
      </p>
    );
  return null;
}

function Field({
  name,
  title,
  value,
  ...rest
}: { name: string; title: string; value?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className={label}>{title}</span>
      <input name={name} defaultValue={value} className={field} {...rest} />
    </label>
  );
}

/** Text in three languages; only German is required (the others fall back to it). */
function ThreeLanguages({
  name,
  title,
  value,
  area,
  required,
}: {
  name: string;
  title: string;
  value?: { de: string; en: string; am: string } | null;
  area?: boolean;
  required?: boolean;
}) {
  const { t } = useAdminText();
  const one = (lang: "de" | "en" | "am", hint: string) =>
    area ? (
      <label key={lang} className="flex flex-col gap-1">
        <span className={label}>
          {title} {hint}
        </span>
        <textarea
          name={`${name}_${lang}`}
          defaultValue={value?.[lang] ?? ""}
          rows={2}
          maxLength={400}
          className={`${field} resize-y`}
        />
      </label>
    ) : (
      <Field
        key={lang}
        name={`${name}_${lang}`}
        title={`${title} ${hint}`}
        value={value?.[lang] ?? ""}
        maxLength={80}
        required={required && lang === "de"}
      />
    );
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[one("de", t.menu.languages.de), one("en", t.menu.languages.en), one("am", t.menu.languages.am)]}
    </div>
  );
}

/* ---------- category ---------- */

export function CategoryForm({ category }: { category?: MenuCategory }) {
  const [state, action, pending] = useActionState(saveCategory, null);
  const [delState, delAction, deleting] = useActionState(removeCategory, null);
  const { t, lang } = useAdminText();
  const text = t.menu;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        {category && <input type="hidden" name="id" value={category.id} />}
        <ThreeLanguages name="title" title={text.name} value={category?.title} required />
        <ThreeLanguages name="note" title={text.note} value={category?.note} area />
        <label className="flex items-center gap-2 text-sm text-cream/85">
          <input type="checkbox" name="drinks" defaultChecked={category?.drinks} className="h-4 w-4 accent-[#c9a24a]" />{" "}
          {text.drinksCheckbox}
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled={pending}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {pending ? t.common.saving : category ? text.saveCategory : text.createCategory}
          </button>
          <Message state={state} />
        </div>
      </form>
      {category && (
        <form
          action={delAction}
          className="flex flex-wrap items-center gap-4"
          onSubmit={(event) => !confirm(text.confirmDeleteCategory(category.title[lang])) && event.preventDefault()}
        >
          <input type="hidden" name="id" value={category.id} />
          <button
            disabled={deleting}
            className="text-xs text-cream/55 underline underline-offset-4 hover:text-[#f0a080]"
          >
            {text.deleteCategory}
          </button>
          <Message state={delState} />
        </form>
      )}
    </div>
  );
}

/* ---------- dish ---------- */

export function DishForm({
  dish,
  categories,
  categoryId,
}: {
  dish?: Dish;
  categories: { id: string; title: string; drinks: boolean }[];
  categoryId: string;
}) {
  const [state, action, pending] = useActionState(saveDish, null);
  const [delState, delAction, deleting] = useActionState(removeDish, null);
  const drinks = categories.find((category) => category.id === (dish?.categoryId ?? categoryId))?.drinks ?? false;
  const { t, lang } = useAdminText();
  const text = t.menu;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-5">
        {dish && <input type="hidden" name="id" value={dish.id} />}
        <ThreeLanguages name="name" title={text.name} value={dish?.name} required />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="amharic" title={text.geez} value={dish?.amharic} maxLength={80} lang="am" />
          <Field
            name="price"
            title={text.price}
            value={dish ? dish.price.toFixed(2).replace(".", ",") : ""}
            inputMode="decimal"
            placeholder="12,50"
            required
          />
          <label className="flex flex-col gap-1">
            <span className={label}>{text.category}</span>
            <select name="categoryId" defaultValue={dish?.categoryId ?? categoryId} className={field}>
              {categories.map((category) => (
                <option key={category.id} value={category.id} className="bg-coal">
                  {category.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ThreeLanguages name="description" title={text.description} value={dish?.description} area />

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/85">
          {ONLINE_ORDERING ? (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="orderable"
                defaultChecked={dish?.orderable ?? true}
                className="h-4 w-4 accent-[#c9a24a]"
              />{" "}
              {text.orderable}
            </label>
          ) : (
            // online ordering is off: keep the dish's setting as it is
            (dish?.orderable ?? true) && <input type="hidden" name="orderable" value="on" />
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="available"
              defaultChecked={dish?.available ?? true}
              className="h-4 w-4 accent-[#c9a24a]"
            />{" "}
            {text.available}
          </label>
        </div>

        <fieldset>
          <legend className={`${label} mb-1.5`}>{text.features}</legend>
          <div className="flex flex-wrap gap-1.5">
            {DISH_TAGS.map((tag) => (
              <label key={tag} className={chip}>
                <input
                  type="checkbox"
                  name="tags"
                  value={tag}
                  defaultChecked={dish?.tags.includes(tag)}
                  className="accent-[#c9a24a]"
                />{" "}
                {text.tags[tag]}
              </label>
            ))}
          </div>
        </fieldset>

        {!drinks && (
          <label className="flex flex-col gap-1 sm:max-w-md">
            <span className={label}>{text.gluten}</span>
            <select name="gluten" defaultValue={dish?.gluten ?? "none"} className={field}>
              <option value="none" className="bg-coal">
                {text.glutenNone}
              </option>
              <option value="noGluten" className="bg-coal">
                {text.glutenNo}
              </option>
              <option value="free" className="bg-coal">
                {text.glutenFree}
              </option>
            </select>
          </label>
        )}

        <fieldset>
          <legend className={`${label} mb-1.5`}>{text.allergens}</legend>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((entry) => (
              <label key={entry.code} className={chip}>
                <input
                  type="checkbox"
                  name="allergens"
                  value={entry.code}
                  defaultChecked={dish?.allergens.includes(entry.code)}
                  className="accent-[#c9a24a]"
                />
                <span className="font-semibold">{entry.code}</span> {entry.label[lang]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={`${label} mb-1.5`}>{text.additives}</legend>
          <div className="flex flex-wrap gap-1.5">
            {ADDITIVES.map((entry) => (
              <label key={entry.code} className={chip}>
                <input
                  type="checkbox"
                  name="additives"
                  value={entry.code}
                  defaultChecked={dish?.additives.includes(entry.code)}
                  className="accent-[#c9a24a]"
                />
                <span className="font-semibold">{entry.code}</span> {entry.label[lang]}
              </label>
            ))}
          </div>
        </fieldset>

        {drinks && (
          <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
            <Field
              name="volume"
              title={text.volume}
              value={dish?.volume ? String(dish.volume).replace(".", ",") : ""}
              inputMode="decimal"
              placeholder="0,33"
            />
            <Field
              name="deposit"
              title={text.deposit}
              value={dish?.deposit ? dish.deposit.toFixed(2).replace(".", ",") : ""}
              inputMode="decimal"
              placeholder="0,25"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            disabled={pending}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {pending ? t.common.saving : dish ? t.common.save : text.createDish}
          </button>
          <Message state={state} />
        </div>
      </form>
      {dish && (
        <form
          action={delAction}
          className="flex flex-wrap items-center gap-4"
          onSubmit={(event) => !confirm(text.confirmDeleteDish(dish.name[lang])) && event.preventDefault()}
        >
          <input type="hidden" name="id" value={dish.id} />
          <button
            disabled={deleting}
            className="text-xs text-cream/55 underline underline-offset-4 hover:text-[#f0a080]"
          >
            {text.deleteDish}
          </button>
          <Message state={delState} />
        </form>
      )}
    </div>
  );
}
