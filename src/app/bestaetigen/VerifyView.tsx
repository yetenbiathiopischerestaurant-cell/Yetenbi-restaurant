"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { confirmEmail } from "@/app/account-actions";
import { useLanguage } from "@/lib/language";
import { FormMessage, SubmitButton } from "@/components/account/AccountShell";
import { ONLINE_ORDERING } from "@/lib/features";

export default function VerifyView() {
  const { t } = useLanguage();
  const text = t.account;
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState(confirmEmail, null);

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{text.verifyTitle}</h1>
      {state?.ok ? (
        <>
          <p role="status" className="mt-6 font-display text-2xl italic text-cream/85">
            {text.verifyDone}
          </p>
          <Link
            href={ONLINE_ORDERING ? "/bestellen" : "/profil"}
            className="mt-8 inline-block rounded-full btn-gild px-7 py-3 font-semibold text-ink hover:bg-eth-green hover:bg-none hover:text-cream"
          >
            {ONLINE_ORDERING ? t.order.title : text.toProfile}
          </Link>
        </>
      ) : (
        <form action={action} className="mt-8 space-y-6">
          <p className="text-cream/80">{text.verifyLead}</p>
          <input type="hidden" name="token" value={token} />
          <FormMessage error={state?.error && text.verifyInvalid} />
          <div className="flex flex-wrap items-center gap-6">
            <SubmitButton pending={pending}>{text.verifyButton}</SubmitButton>
            <Link href="/profil" className="text-sm text-cream/70 underline decoration-gold/40 underline-offset-4">
              {text.toProfile}
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
