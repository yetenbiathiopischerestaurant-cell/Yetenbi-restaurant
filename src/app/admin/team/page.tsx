import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ONLINE_ORDERING } from "@/lib/features";
import { adminText } from "@/lib/server/admin-lang";
import { listStaff, requireOwner } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import AdminHeader from "../AdminHeader";
import { changeRole } from "./actions";
import { AddStaffForm, PinForm, ResetPasswordForm } from "./TeamForms";

const ALL_ROLES = ["owner", "service", "kitchen", "driver"] as const;
// Drivers only exist while online ordering is on; with it off the role is not offered any more.
const OFFERED_ROLES = ALL_ROLES.filter((role) => ONLINE_ORDERING || role !== "driver");

async function Team() {
  await connection();
  const me = await requireOwner();
  const { t } = await adminText();
  const text = t.team;
  if (!hasDatabase()) return <p className="mt-12 text-cream/70">{t.common.noDatabase}</p>;
  const staff = await listStaff();
  const what = { ...text.what, owner: ONLINE_ORDERING ? text.what.ownerOrders : text.what.owner };
  // The driver section stays while drivers still exist, so the owner can move or remove them.
  const sections = ALL_ROLES.filter(
    (role) => OFFERED_ROLES.includes(role) || staff.some((member) => member.role === role),
  );
  return (
    <>
      <section className="mt-10 border border-gold/20 bg-ink/40 p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold text-gold-soft">{text.createAccount}</h2>
        <p className="mb-6 mt-2 text-sm text-cream/65">
          {text.createLead}{" "}
          <Link href="/datenschutz/team" className="text-gold-soft underline underline-offset-4">
            {text.privacyLink}
          </Link>
          .
        </p>
        <AddStaffForm />
      </section>

      {sections.map((role) => {
        const people = staff.filter((member) => member.role === role);
        return (
          <section key={role} className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-gold-soft">
              {t.roles[role]} <span className="text-cream/50">({people.length})</span>
            </h2>
            <p className="mt-1 text-sm text-cream/60">{what[role]}</p>
            {people.length === 0 ? (
              <p className="mt-4 text-cream/55">{text.nobody}</p>
            ) : (
              <ul className="mt-4 divide-y divide-gold/10 border-y border-gold/10">
                {people.map((person) => (
                  <li key={person.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-cream">
                        <strong className="font-semibold">{person.name}</strong>{" "}
                        <span className="text-cream/60">· {person.email}</span>
                        {person.phone && <span className="text-cream/60"> · {person.phone}</span>}
                        {person.id === me.id && (
                          <span className="ml-2 text-xs uppercase tracking-[0.2em] text-gold">{text.you}</span>
                        )}
                      </p>
                      {person.id !== me.id && (
                        <form action={changeRole} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="id" value={person.id} />
                          {OFFERED_ROLES.filter((option) => option !== role).map((option) => (
                            <button
                              key={option}
                              name="role"
                              value={option}
                              className="rounded-full border border-cream/30 px-3 py-1 text-xs font-semibold text-cream hover:border-gold"
                            >
                              → {t.roles[option]}
                            </button>
                          ))}
                          <button
                            name="role"
                            value="guest"
                            className="rounded-full border border-[#f0a080]/60 px-3 py-1 text-xs font-semibold text-[#f0a080] hover:bg-[#f0a080] hover:text-ink"
                          >
                            {text.removeFromTeam}
                          </button>
                        </form>
                      )}
                    </div>
                    {(role === "service" || role === "owner") && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-cream/55 hover:text-cream">
                          {text.appPin(person.hasPin)}
                        </summary>
                        <p className="mt-2 max-w-xl text-xs text-cream/55">{text.pinHint}</p>
                        <PinForm id={person.id} hasPin={person.hasPin} />
                      </details>
                    )}
                    {person.id !== me.id && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-cream/55 hover:text-cream">
                          {text.resetPassword}
                        </summary>
                        <ResetPasswordForm id={person.id} />
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <p className="mt-10 text-sm text-cream/55">{text.roleChangeNote}</p>
    </>
  );
}

export default async function TeamPage() {
  const { t } = await adminText();
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <AdminHeader active="team" />
      <Suspense fallback={<p className="mt-12 text-cream/60">{t.common.loading}</p>}>
        <Team />
      </Suspense>
    </main>
  );
}
