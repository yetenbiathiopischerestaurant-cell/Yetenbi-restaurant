"use client";

import { useActionState } from "react";
import type { Business } from "@/lib/business";
import { useAdminText } from "@/components/admin/AdminLang";
import { ONLINE_ORDERING } from "@/lib/features";
import { saveBusinessSettings } from "./actions";

const field =
  "border-0 border-b border-gold/30 bg-transparent px-0 pb-1.5 pt-1 text-base text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none [color-scheme:dark]";
const label = "text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold";

export default function BusinessForm({ business }: { business: Business }) {
  const [state, action, pending] = useActionState(saveBusinessSettings, null);
  const { t } = useAdminText();
  const text = t.settings;
  return (
    <form action={action} className="space-y-10">
      <section className="border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">{text.hours}</h2>
        <p className="mt-2 text-sm text-cream/60">{ONLINE_ORDERING ? text.hoursLeadOrders : text.hoursLead}</p>
        <div className="mt-6 divide-y divide-cream/10">
          {text.days.map((name, day) => {
            const hours = business.hours[day];
            return (
              <fieldset
                key={name}
                className="grid grid-cols-[7.5rem_1fr] items-center gap-4 py-3 sm:grid-cols-[9rem_7rem_1fr]"
              >
                <legend className="sr-only">{name}</legend>
                <span className="text-cream">{name}</span>
                <label className="flex items-center gap-2 text-sm text-cream/80">
                  <input
                    type="checkbox"
                    name={`open-${day}`}
                    defaultChecked={Boolean(hours)}
                    className="peer h-4 w-4 accent-[#c9a24a]"
                  />{" "}
                  {text.open}
                </label>
                <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                  <input
                    type="time"
                    name={`from-${day}`}
                    defaultValue={hours?.open ?? "11:00"}
                    step={900}
                    aria-label={text.opens(name)}
                    className={`${field} w-28`}
                  />
                  <span className="text-cream/50">{text.until}</span>
                  <input
                    type="time"
                    name={`to-${day}`}
                    defaultValue={hours?.close ?? "22:00"}
                    step={900}
                    aria-label={text.closes(name)}
                    className={`${field} w-28`}
                  />
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section className="border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">{text.legal}</h2>
        <p className="mt-2 text-sm text-cream/60">{text.legalLead}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={label}>{text.ownerName}</span>
            <input
              name="ownerName"
              defaultValue={business.ownerName}
              maxLength={120}
              autoComplete="name"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>{text.contactEmail}</span>
            <input
              name="contactEmail"
              type="email"
              defaultValue={business.contactEmail}
              maxLength={120}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>{text.vatId}</span>
            <input
              name="vatId"
              defaultValue={business.vatId}
              maxLength={20}
              placeholder="DE123456789"
              className={field}
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-full border border-gold/30 bg-coal/95 px-4 py-3 backdrop-blur sm:w-max">
        <button
          disabled={pending}
          className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {pending ? t.common.saving : text.saveAll}
        </button>
        {state?.ok && (
          <p role="status" className="text-sm text-[#9fe0b6]">
            {state.ok}
          </p>
        )}
        {state?.error && (
          <p role="alert" className="text-sm text-[#f0a080]">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
