"use client";

import { AnimatePresence, motion } from "motion/react";
import { CaretDown, Minus, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { useLanguage } from "@/lib/language";
import { useMenu } from "@/components/MenuFacts";
import { useMenuPhoto } from "@/components/Photos";
import { priceText, type Dish, type PreorderLine } from "@/lib/menu";
import { ease } from "../ui/primitives";

/** Chosen dishes by id: how many, and which options (by position in the dish's option list). */
export type Picks = Record<string, { qty: number; options: number[] }>;

/** What the reservation form sends to /api/book. */
export const picksToLines = (picks: Picks): PreorderLine[] =>
  Object.entries(picks)
    .filter(([, pick]) => pick.qty > 0)
    .map(([id, pick]) => ({ id, qty: pick.qty, options: pick.options }));

const round =
  "flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 text-gold-soft transition-colors hover:bg-gold hover:text-ink active:scale-95 disabled:opacity-40";

function DishRow({
  dish,
  pick,
  onChange,
}: {
  dish: Dish;
  pick?: Picks[string];
  onChange: (next: Picks[string]) => void;
}) {
  const { t, locale } = useLanguage();
  const photo = useMenuPhoto()(dish.id, 96);
  const qty = pick?.qty ?? 0;
  const options = pick?.options ?? [];
  const setQty = (value: number) => onChange({ qty: Math.max(0, Math.min(20, value)), options });
  const toggle = (index: number) =>
    onChange({
      qty: Math.max(qty, 1),
      options: options.includes(index) ? options.filter((o) => o !== index) : [...options, index],
    });
  return (
    <li className={`py-3 ${dish.available ? "" : "opacity-50"}`}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- already sized and compressed by Cloudinary
          <img
            src={photo}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-gold/30"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-base leading-tight text-cream sm:text-lg">{dish.name[locale]}</p>
          <p className="text-xs text-cream/55">
            {dish.available
              ? dish.price > 0
                ? `${priceText(dish.price)} €`
                : t.reserve.preorder.noPrice
              : t.menu.soldOut}
          </p>
        </div>
        {dish.available && (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className={round}
              disabled={!qty}
              onClick={() => setQty(qty - 1)}
              aria-label={`${t.reserve.less}: ${dish.name[locale]}`}
            >
              <Minus size={14} />
            </button>
            <output aria-live="polite" className="w-6 text-center font-display text-xl tabular-nums text-cream">
              {qty}
            </output>
            <button
              type="button"
              className={round}
              onClick={() => setQty(qty + 1)}
              aria-label={`${t.reserve.more}: ${dish.name[locale]}`}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
      {dish.available && dish.options.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dish.options.map((option, index) => (
            <label
              key={index}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-cream/15 px-2 py-1 text-xs text-cream/80 has-[:checked]:border-gold has-[:checked]:bg-gold/15 has-[:checked]:text-gold-soft"
            >
              <input
                type="checkbox"
                checked={options.includes(index)}
                onChange={() => toggle(index)}
                className="accent-[#c9a24a]"
              />
              {option.name[locale]}
              {option.price > 0 && ` (+${priceText(option.price)} €)`}
            </label>
          ))}
        </div>
      )}
    </li>
  );
}

/**
  Optional, recommended: choose dishes tab by tab while booking, so the kitchen can prepare them and the wait at
  the table is shorter. Tabs are the menu's categories, the same as on the menu card.
*/
export default function PreorderPicker({ picks, onChange }: { picks: Picks; onChange: (picks: Picks) => void }) {
  const { t, locale } = useLanguage();
  const menu = useMenu().filter((category) => category.items.length > 0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(menu[0]?.id ?? "");
  if (!menu.length) return null;
  const text = t.reserve.preorder;
  const category = menu.find((candidate) => candidate.id === tab) ?? menu[0];
  const dishes = new Map(menu.flatMap((c) => c.items).map((dish) => [dish.id, dish] as const));
  const chosen = Object.entries(picks).filter(([id, pick]) => pick.qty > 0 && dishes.has(id));
  const total = chosen.reduce((sum, [id, pick]) => {
    const dish = dishes.get(id)!;
    const extras = pick.options.reduce((s, index) => s + (dish.options[index]?.price ?? 0), 0);
    return sum + (dish.price > 0 ? pick.qty * (dish.price + extras) : 0);
  }, 0);
  const unpriced = chosen.some(([id]) => dishes.get(id)!.price <= 0);
  const countIn = (categoryId: string) =>
    chosen.filter(([id]) => dishes.get(id)!.categoryId === categoryId).reduce((sum, [, pick]) => sum + pick.qty, 0);

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden border border-gold/25 bg-ink/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5"
      >
        <span>
          <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
            {text.title} <span className="normal-case tracking-normal text-cream/55">· {text.optional}</span>
          </span>
          <span className="mt-1 block font-display text-lg italic leading-snug text-cream/80">
            {chosen.length ? text.chosen(chosen.reduce((sum, [, pick]) => sum + pick.qty, 0)) : text.hint}
          </span>
        </span>
        <CaretDown
          size={18}
          className={`shrink-0 text-gold transition-transform duration-500 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease }}
            className="overflow-hidden"
          >
            <div className="border-t border-gold/20 px-4 pb-5 pt-4 sm:px-5">
              <div
                role="tablist"
                aria-label={t.menu.categories}
                className="-mx-4 flex max-w-[calc(100%+2rem)] gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:max-w-[calc(100%+2.5rem)] sm:gap-5 sm:px-5"
              >
                {menu.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={c.id === category.id}
                    onClick={() => setTab(c.id)}
                    className={`relative shrink-0 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] transition-colors ${
                      c.id === category.id ? "text-gold-soft" : "text-cream/50 hover:text-cream/85"
                    }`}
                  >
                    {c.title[locale]}
                    {countIn(c.id) > 0 && (
                      <span className="ml-1.5 rounded-full bg-gold px-1.5 text-[0.6rem] tracking-normal text-ink">
                        {countIn(c.id)}
                      </span>
                    )}
                    {c.id === category.id && <span className="absolute inset-x-0 bottom-0 h-px bg-gold" />}
                  </button>
                ))}
              </div>
              <ul role="tabpanel" className="mt-2 divide-y divide-gold/10">
                {category.items.map((dish) => (
                  <DishRow
                    key={dish.id}
                    dish={dish}
                    pick={picks[dish.id]}
                    onChange={(next) => onChange({ ...picks, [dish.id]: next })}
                  />
                ))}
              </ul>

              {chosen.length > 0 && (
                <div className="mt-4 border-t border-gold/20 pt-4">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">{text.summary}</p>
                  <ul className="mt-2 space-y-1 text-sm text-cream/85">
                    {chosen.map(([id, pick]) => {
                      const dish = dishes.get(id)!;
                      const extras = pick.options.map((index) => dish.options[index]?.name[locale]).filter(Boolean);
                      return (
                        <li key={id} className="flex min-w-0 items-baseline justify-between gap-3 break-words">
                          <span>
                            {pick.qty} × {dish.name[locale]}
                            {extras.length > 0 && <span className="text-cream/55"> ({extras.join(", ")})</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => onChange({ ...picks, [id]: { qty: 0, options: [] } })}
                            className="shrink-0 text-xs text-cream/50 underline underline-offset-4 hover:text-[#f0a080]"
                          >
                            {text.remove}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 flex justify-between font-display text-lg text-gold-soft">
                    <span>{text.total}</span>
                    <span className="tabular-nums">{priceText(total)} €</span>
                  </p>
                  {unpriced && <p className="mt-1 text-xs text-cream/55">{text.unpriced}</p>}
                  <p className="mt-2 text-xs text-cream/55">{text.payNote}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
