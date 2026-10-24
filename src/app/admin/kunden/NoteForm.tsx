"use client";

import { useActionState } from "react";
import { useAdminText } from "@/components/admin/AdminLang";
import { saveCustomerNote } from "./actions";

export default function NoteForm({ customer, note }: { customer: string; note: string }) {
  const [state, action, pending] = useActionState(saveCustomerNote, null);
  const { t } = useAdminText();
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="key" value={customer} />
      <textarea
        name="note"
        defaultValue={note}
        rows={4}
        maxLength={1000}
        placeholder={t.customers.notePlaceholder}
        className="w-full resize-y border border-gold/25 bg-transparent p-3 text-sm text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none"
      />
      <div className="flex items-center gap-4">
        <button
          disabled={pending}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {pending ? t.common.saving : t.customers.saveNote}
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
      <p className="text-xs text-cream/45">{t.customers.noteHint}</p>
    </form>
  );
}
