"use client";

import { useActionState } from "react";
import { useAdminText } from "@/components/admin/AdminLang";
import { addClosedDay, addPhoneBooking, type AdminState } from "./actions";

const field =
  "w-full border-0 border-b border-gold/30 bg-transparent px-0 pb-2 pt-1 text-base text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none [color-scheme:dark]";
const label = "text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold";

function Message({ state }: { state: AdminState }) {
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

function Input({
  name,
  title,
  ...rest
}: { name: string; title: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={label}>{title}</span>
      <input name={name} className={field} {...rest} />
    </label>
  );
}

export function PhoneBookingForm() {
  const [state, action, pending] = useActionState(addPhoneBooking, null);
  const { t } = useAdminText();
  const form = t.reservations.form;
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Input name="date" title={form.date} type="date" required />
      <Input name="time" title={form.time} type="time" step={1800} required />
      <Input name="guests" title={form.guests} type="number" min={1} max={12} defaultValue={2} required />
      <Input name="name" title={form.name} required />
      <Input name="phone" title={form.phone} type="tel" required />
      <Input name="email" title={form.emailOptional} type="email" />
      <div className="sm:col-span-2 lg:col-span-3">
        <Input name="note" title={form.noteOptional} maxLength={280} />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
        <button
          disabled={pending}
          className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {pending ? t.common.saving : form.submit}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function ClosedDayForm() {
  const [state, action, pending] = useActionState(addClosedDay, null);
  const { t } = useAdminText();
  const form = t.reservations.form;
  return (
    <form action={action} className="flex flex-wrap items-end gap-5">
      <div className="w-44">
        <Input name="date" title={form.date} type="date" required />
      </div>
      <div className="min-w-48 flex-1">
        <Input name="note" title={form.closedNote} placeholder={form.closedNotePlaceholder} />
      </div>
      <button
        disabled={pending}
        className="rounded-full border border-gold/60 px-5 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold hover:text-ink disabled:opacity-60"
      >
        {form.close}
      </button>
      <div className="basis-full">
        <Message state={state} />
      </div>
    </form>
  );
}
