import Link from "next/link";
import { LalibelaCross } from "@/components/heritage/Ornaments";
import { AdminLanguageToggle } from "@/components/admin/AdminLang";
import { logout } from "@/app/account-actions";
import { adminText } from "@/lib/server/admin-lang";
import type { User } from "@/lib/server/auth";

/*
  Title, who is signed in, the language switch and the way out, for the kitchen and delivery screens. Owners also
  get a way back to the admin. Reads the language cookie, so render it inside Suspense and an AdminLangProvider.
*/
export default async function StaffHeader({ title, me }: { title: string; me: User }) {
  const { t } = await adminText();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/20 pb-6">
      <div className="flex items-center gap-4">
        <LalibelaCross className="h-8 w-8 text-gold" />
        <div>
          <h1 className="font-display text-4xl font-semibold text-cream md:text-5xl">{title}</h1>
          <p className="mt-1 text-sm text-cream/60">
            {me.name} · {t.roles[me.role]}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5 text-sm">
        {me.role === "owner" && (
          <Link href="/admin" className="text-cream/70 underline underline-offset-4 hover:text-cream">
            {t.staff.admin}
          </Link>
        )}
        <Link href="/" className="text-cream/70 underline underline-offset-4 hover:text-cream">
          {t.common.toWebsite}
        </Link>
        <Link href="/datenschutz/team" className="text-cream/70 underline underline-offset-4 hover:text-cream">
          {t.staff.privacy}
        </Link>
        <form action={logout}>
          <button className="text-cream/70 underline underline-offset-4 hover:text-cream">{t.common.signOut}</button>
        </form>
        <AdminLanguageToggle />
      </div>
    </div>
  );
}
