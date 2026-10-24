"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { login, register, requestReset } from "@/app/account-actions";
import { useLanguage } from "@/lib/language";
import { AuthField, FormMessage, SubmitButton } from "@/components/account/AccountShell";

type Mode = "login" | "register" | "forgot";

function GoogleButton({ label, next }: { label: string; next: string }) {
  return (
    <a
      href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-cream/25 bg-cream/[0.04] px-6 py-3.5 font-semibold text-cream transition-colors hover:border-eth-green hover:bg-eth-green/15 hover:text-cream"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.2s2.7-6.2 6-6.2c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.2 14.65 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.66 0 9.4-3.98 9.4-9.58 0-.64-.07-1.13-.16-1.62H12z"
        />
      </svg>
      {label}
    </a>
  );
}

export default function LoginView({ googleEnabled }: { googleEnabled: boolean }) {
  const { t, locale } = useLanguage();
  const text = t.account;
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [registerState, registerAction, registerPending] = useActionState(register, null);
  const [resetState, resetAction, resetPending] = useActionState(requestReset, null);

  const title = mode === "login" ? text.loginTitle : mode === "register" ? text.registerTitle : text.forgotTitle;
  const lead = mode === "login" ? text.loginLead : mode === "register" ? text.registerLead : text.forgotLead;

  return (
    <div>
      {mode !== "forgot" && (
        <div role="tablist" className="mb-10 flex gap-6 border-b border-gold/20">
          {(["login", "register"] as const).map((option) => (
            <button
              key={option}
              role="tab"
              type="button"
              aria-selected={mode === option}
              onClick={() => setMode(option)}
              className={`relative pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.3em] transition-colors ${
                mode === option ? "text-gold-soft" : "text-cream/50 hover:text-cream/80"
              }`}
            >
              {option === "login" ? text.signIn : text.signUp}
              {mode === option && (
                <motion.span layoutId="auth-tab" className="absolute inset-x-0 -bottom-px h-px bg-gold" />
              )}
            </button>
          ))}
        </div>
      )}

      <h1 className="font-display text-4xl font-semibold leading-[1.05] text-cream md:text-5xl">{title}</h1>
      <p className="mt-3 font-display text-xl italic text-cream/75">{lead}</p>

      {mode !== "forgot" && googleEnabled && (
        <div className="mt-8">
          <GoogleButton label={text.google} next={next} />
          <div className="mt-8 flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-cream/55">
            <span className="h-px flex-1 bg-gold/20" />
            {text.or}
            <span className="h-px flex-1 bg-gold/20" />
          </div>
        </div>
      )}
      {params.get("error") === "google" && (
        <p role="alert" className="mt-6 text-sm text-[#f0a080]">
          {text.errors.google}
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          {mode === "login" && (
            <form action={loginAction} className={`${googleEnabled ? "mt-2" : "mt-10"} space-y-8`}>
              <input type="hidden" name="next" value={next} />
              <AuthField id="email" label={text.email} type="email" autoComplete="email" required />
              <AuthField id="password" label={text.password} type="password" autoComplete="current-password" required />
              <FormMessage error={loginState?.error && text.errors[loginState.error]} />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SubmitButton pending={loginPending}>{text.signIn}</SubmitButton>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-cream/70 underline decoration-gold/40 underline-offset-4 hover:text-cream"
                >
                  {text.forgot}
                </button>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form action={registerAction} className={`${googleEnabled ? "mt-2" : "mt-10"} space-y-8`}>
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="locale" value={locale} />
              <AuthField id="name" label={text.name} autoComplete="name" required />
              <AuthField id="email" label={text.email} type="email" autoComplete="email" required />
              <AuthField id="phone" label={text.phone} type="tel" autoComplete="tel" />
              <AuthField
                id="password"
                label={text.password}
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                hint={text.passwordHint}
              />
              <p className="text-sm text-cream/75">
                {text.consentPre}{" "}
                <Link href="/datenschutz" target="_blank" className="text-gold-soft underline underline-offset-4">
                  {text.consentLink}
                </Link>
                {text.consentPost}
              </p>
              <FormMessage error={registerState?.error && text.errors[registerState.error]} />
              <SubmitButton pending={registerPending}>{text.signUp}</SubmitButton>
            </form>
          )}

          {mode === "forgot" && (
            <form action={resetAction} className="mt-10 space-y-8">
              <AuthField id="email" label={text.email} type="email" autoComplete="email" required />
              <FormMessage
                error={resetState?.error && text.errors[resetState.error]}
                ok={resetState?.ok ? text.linkSent : undefined}
              />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <SubmitButton pending={resetPending}>{text.sendLink}</SubmitButton>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-cream/70 underline decoration-gold/40 underline-offset-4 hover:text-cream"
                >
                  {text.back}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
